import {
  CELL_CATALOG_COLUMNS,
  OBJECT_CATALOG_COLUMNS,
  parseCellRow,
  parseObjectRow,
  type FabriksCellRow,
  type FabriksObjectEntry,
} from "./fabriksCatalogs";
import type { DecodedCell, MeshoptDecoderLike } from "./fabriksDecode";
import {
  decodeRowGroupSpan,
  type FabriksDecodeRequest,
  type FabriksDecodedCell,
} from "./fabriksDecodeCore";
import { levelParts, MANIFEST_NAME, parseFabriksManifest, type FabriksFileEntry, type FabriksManifest } from "./fabriksManifest";
import type { FabriksFetchGroup } from "./fabriksPlanner";
import { ParquetPart } from "@/mikro/components/scene/platform/parquet/parquetPart";
import type {
  ParquetTransport,
  ParquetTransportStats,
} from "@/mikro/components/scene/platform/parquet/transport";

/**
 * One fabriks collection: the manifest, the catalogs, and the open parts.
 *
 * This owns the READ PLAN — which file, which row group, which columns — and
 * nothing else. It knows nothing about three.js, the scene graph or React, so
 * the whole path from a prefix to decoded geometry is testable against a
 * fixture on disk with no renderer in sight.
 *
 * Its one piece of state worth naming is the part cache: a `ParquetPart` holds
 * a parsed footer, so keeping it alive is what makes the second cell out of a
 * part cost only its row group.
 */

/** Reads a whole object. Separate from the ranged read: catalogs are read whole. */
export type { ObjectReader } from "@/mikro/components/scene/platform/parquet/transport";

/**
 * Request counters a transport may keep, mutated in place (P17: no store
 * writes at streaming cadence — debug consumers read them at their own pace).
 * `fetchMs` is a CONCURRENT SUM like the brick stats' fetchMs: overlapping
 * requests each contribute their full duration, so it overstates wall time.
 * Optional so test transports over a fixture directory owe nothing.
 */
// The transport contract is format-agnostic and lives in `platform/parquet`:
// fabriks and konnektion lay their prefixes out identically, so they read
// through one interface. These aliases keep the fabriks path reading as it did.
export type FabriksTransportStats = ParquetTransportStats;
export type FabriksTransport = ParquetTransport;

export class FabriksCollection {
  private readonly parts = new Map<string, ParquetPart>();
  private objectsPromise: Promise<Map<number, FabriksObjectEntry>> | null = null;

  private constructor(
    readonly manifest: FabriksManifest,
    private readonly transport: FabriksTransport,
  ) {}

  /**
   * Open a prefix by reading its manifest from the store.
   *
   * A missing manifest is the format's defined signal for an INTERRUPTED
   * WRITE, not for an empty collection — the manifest lands after every file
   * it names — so it is reported as such rather than as zero geometry.
   */
  static async open(transport: FabriksTransport): Promise<FabriksCollection> {
    let bytes: Uint8Array;
    try {
      bytes = await transport.get(MANIFEST_NAME);
    } catch (error) {
      throw new Error(
        `This prefix has no ${MANIFEST_NAME}. The manifest is written last, so a prefix without one ` +
          `is an interrupted write rather than a collection. (${String(error)})`,
      );
    }
    const manifest = parseFabriksManifest(JSON.parse(new TextDecoder().decode(bytes)));
    return new FabriksCollection(manifest, transport);
  }

  /**
   * Open with a manifest already in hand.
   *
   * The API mirrors `fabriks.json` onto the store node — the server read it at
   * registration, so it describes what was actually written — which means the
   * first thing a layer needs costs no S3 round trip at all. Same validation
   * either way: the mirrored object goes through `parseFabriksManifest`, so a
   * server that mirrors something this reader cannot read is still refused.
   */
  static fromMirroredManifest(raw: unknown, transport: FabriksTransport): FabriksCollection {
    return new FabriksCollection(parseFabriksManifest(raw), transport);
  }

  /** The spatial index. One whole-file read; the planner needs nothing else. */
  async loadCellCatalog(): Promise<FabriksCellRow[]> {
    const rows = await this.readCatalog(this.manifest.cells, CELL_CATALOG_COLUMNS);
    return rows.map(parseCellRow);
  }

  /**
   * The identity index, loaded lazily and memoized.
   *
   * Deliberately off the first-render path: nothing needs it to draw, it
   * carries the format's only `list<struct<>>`, and a collection with millions
   * of objects should not pay for it before something asks about identity.
   */
  loadObjectCatalog(): Promise<Map<number, FabriksObjectEntry>> {
    if (!this.objectsPromise) {
      this.objectsPromise = this.readCatalog(this.manifest.objects, OBJECT_CATALOG_COLUMNS)
        .then((rows) => new Map(rows.map(parseObjectRow).map((entry) => [entry.objectId, entry])))
        .catch((error: unknown) => {
          this.objectsPromise = null;
          throw error;
        });
    }
    return this.objectsPromise;
  }

  private async readCatalog(
    entry: FabriksFileEntry,
    columns: string[],
  ): Promise<Record<string, unknown>[]> {
    // Catalogs are read whole — they are small, and every row is wanted — so
    // the length is taken from the bytes rather than needing the manifest's.
    const bytes = await this.transport.get(entry.path);
    const part = new ParquetPart(entry.path, bytes.byteLength, async (_path, start, end) =>
      bytes.subarray(start, end),
    );
    return part.readRows(columns);
  }

  /**
   * Fetch and decode one row group's worth of planned cells — the decode
   * running INLINE on this thread. The manager streams through
   * `readFetchGroupVia` with a worker dispatcher instead; this signature
   * survives for the fixture tests, which pin the byte contract without a
   * Worker in sight, and the two share every line via `decodeRowGroupSpan`.
   */
  async readFetchGroup(
    group: FabriksFetchGroup,
    decoder: MeshoptDecoderLike | null,
  ): Promise<Map<string, DecodedCell>> {
    return this.readFetchGroupVia(group, (request) => decodeRowGroupSpan(request, decoder));
  }

  /**
   * Fetch one row group's bytes and hand the CPU-bound half — parse, filter,
   * decode — to `decode` (a worker dispatcher in production, inline for
   * tests).
   *
   * The unit is the ROW GROUP rather than the cell: a row group is the
   * smallest thing a reader can fetch, and a plan routinely puts several cells
   * in one. A null locator (legal, if unusual) degrades to reading the part
   * whole, which is correct and merely slow — so it warns. The FETCH stays
   * here in every case: the span goes through the transport's byte cache and
   * credential rotation, which no worker holds.
   */
  async readFetchGroupVia(
    group: FabriksFetchGroup,
    decode: (request: FabriksDecodeRequest) => Promise<FabriksDecodedCell[]>,
    options?: {
      /** Smooth-shading mode: normals come back precomputed per cell. */
      computeNormals?: boolean;
    },
  ): Promise<Map<string, DecodedCell>> {
    const partIndex = group.part ?? 0;
    const entry = levelParts(this.manifest, group.level)[partIndex];
    if (!entry) {
      throw new Error(
        `The catalog places cells in level ${group.level} part ${partIndex}, which the manifest does not name.`,
      );
    }

    const part = this.openPart(entry);
    let payload;
    if (group.rowGroup === null) {
      console.warn(
        `[fabriks] ${entry.path} has no row-group locator for these cells; reading the part whole ` +
          `(${entry.bytes ?? "unknown"} bytes).`,
      );
      payload = await part.wholePayload();
    } else {
      payload = await part.rowGroupPayload(group.rowGroup);
    }

    const cells = await decode({
      path: entry.path,
      fileByteLength: part.byteLength,
      ...payload,
      wantedCells: group.cells.map((cell) => cell.cell),
      grid: this.manifest.grid,
      encoding: this.manifest.encoding,
      computeNormals: options?.computeNormals ?? false,
    });
    return new Map(cells.map(({ key, ...cell }) => [key, cell]));
  }

  /**
   * The open part for a manifest entry.
   *
   * Cached so a part's footer is parsed once per session: the per-fetch cost
   * is then the row group alone, which is the asymmetry the format's row-group
   * sizing is chosen against.
   */
  private openPart(entry: FabriksFileEntry): ParquetPart {
    const existing = this.parts.get(entry.path);
    if (existing) return existing;
    if (entry.bytes === null) {
      throw new Error(
        `The manifest records no length for ${entry.path}, and a Parquet footer sits at the end of a ` +
          `file this reader can only range-read. Rewrite the collection with a writer that records ` +
          `file lengths.`,
      );
    }
    const part = new ParquetPart(entry.path, entry.bytes, this.transport.getRange);
    this.parts.set(entry.path, part);
    return part;
  }

  /** The transport's request counters, when it keeps them (S3 does; fixtures need not). */
  transportStats(): FabriksTransportStats | null {
    return this.transport.stats ?? null;
  }

  /** Drop cached footers. The manifest and catalogs stay. */
  release(): void {
    this.parts.clear();
  }
}
