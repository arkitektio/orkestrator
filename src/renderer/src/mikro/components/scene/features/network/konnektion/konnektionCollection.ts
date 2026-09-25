import {
  CELL_CATALOG_COLUMNS,
  OBJECT_CATALOG_COLUMNS,
  parseCellRow,
  parseObjectRow,
  type KonnektionCellRow,
  type KonnektionObjectEntry,
} from "./konnektionCatalogs";
import {
  decodeGeometryRow,
  type DecodedNetworkCell,
  type KonnektionGeometryRow,
} from "./konnektionDecode";
import {
  levelParts,
  MANIFEST_NAME,
  parseKonnektionManifest,
  hasRadii,
  type KonnektionFileEntry,
  type KonnektionManifest,
} from "./konnektionManifest";
import type { KonnektionFetchGroup } from "./konnektionPlanner";
import { ParquetPart } from "@/mikro/components/scene/platform/parquet/parquetPart";
import type {
  ParquetTransport,
  ParquetTransportStats,
} from "@/mikro/components/scene/platform/parquet/transport";
import {
  toBytes,
  toNumber,
  toNumberArray,
} from "@/mikro/components/scene/platform/parquet/rowValues";

/**
 * One konnektion collection: the manifest, the catalogs, and the open parts.
 *
 * Owns the READ PLAN — which file, which row group, which columns — and nothing
 * else. No three.js, no scene graph, no React, so the whole path from a prefix
 * to a decoded graph is testable against a fixture on disk.
 *
 * Its one piece of state worth naming is the part cache: a `ParquetPart` holds
 * a parsed footer, so keeping it alive is what makes the second cell out of a
 * part cost only its row group.
 *
 * ## Why the decode runs here rather than in a worker
 *
 * The fabriks path hands its decode to a worker pool, because a surface is
 * large. A graph is not: konnektion's README is explicit that "a graph is far
 * smaller than the surface it runs through", and the planner draws ONE level,
 * whose coarse tiers the writer sizes to arrive in a single request. Decoding a
 * few tens of thousands of nodes is a sub-millisecond loop over `uint16`s.
 *
 * The seam is nonetheless preserved: `decodeGeometryRow` is pure and takes
 * plain data, so moving it behind a dispatcher later is a mechanical change
 * with no byte-contract risk. That was the ordering that mattered.
 */

export type KonnektionTransportStats = ParquetTransportStats;
export type KonnektionTransport = ParquetTransport;

/** The geometry columns this reader needs. `radii`/`ghost_radii` are appended
 *  only when the encoding declares them — the columns are absent otherwise, and
 *  asking for a column a file lacks is an error, not an empty result. The
 *  attribute pairs follow the same rule with the manifest's `attributes` as
 *  the declaration: one `attr_<name>`/`ghost_attr_<name>` pair per entry. */
export const geometryColumns = (manifest: KonnektionManifest): string[] => [
  "level", "cell", "positions", "node_ids", "edges",
  "ghost_positions", "ghost_cells", "ghost_ids",
  "node_count", "edge_count", "ghost_count",
  "object_ids", "object_ordinals",
  "object_node_offsets", "object_ghost_offsets", "object_edge_offsets",
  ...(hasRadii(manifest.encoding) ? ["radii", "ghost_radii"] : []),
  ...manifest.attributes.flatMap((attribute) => [
    `attr_${attribute.name}`,
    `ghost_attr_${attribute.name}`,
  ]),
];

/** One raw geometry row → the typed byte shape the decoder consumes. */
export function parseGeometryRow(
  row: Record<string, unknown>,
  manifest: KonnektionManifest,
): KonnektionGeometryRow {
  const radii = hasRadii(manifest.encoding);
  return {
    level: toNumber(row.level, "level"),
    cell: toNumber(row.cell, "cell"),
    positions: toBytes(row.positions, "positions"),
    nodeIds: toBytes(row.node_ids, "node_ids"),
    edges: toBytes(row.edges, "edges"),
    ghostPositions: toBytes(row.ghost_positions, "ghost_positions"),
    ghostCells: toBytes(row.ghost_cells, "ghost_cells"),
    ghostIds: toBytes(row.ghost_ids, "ghost_ids"),
    radii: radii ? toBytes(row.radii, "radii") : null,
    // Nullable even when radii are declared: a cell with no ghosts has no
    // ghost radii to carry.
    ghostRadii: radii && row.ghost_radii != null ? toBytes(row.ghost_radii, "ghost_radii") : null,
    nodeCount: toNumber(row.node_count, "node_count"),
    edgeCount: toNumber(row.edge_count, "edge_count"),
    ghostCount: toNumber(row.ghost_count, "ghost_count"),
    objectIds: toNumberArray(row.object_ids, "object_ids"),
    objectOrdinals: toNumberArray(row.object_ordinals, "object_ordinals"),
    objectNodeOffsets: toNumberArray(row.object_node_offsets, "object_node_offsets"),
    objectGhostOffsets: toNumberArray(row.object_ghost_offsets, "object_ghost_offsets"),
    objectEdgeOffsets: toNumberArray(row.object_edge_offsets, "object_edge_offsets"),
    // Owned/ghost value blobs per declared attribute. Strict like `radii`: a
    // declared attribute with no column would otherwise read as all-hidden or
    // all-default downstream, which is a lie about data that merely went
    // missing. The ghost blob is nullable for the ghost-radii reason — a cell
    // with no ghosts has no ghost values to carry.
    attributes: Object.fromEntries(
      manifest.attributes.map((attribute) => [
        attribute.name,
        {
          owned: toBytes(row[`attr_${attribute.name}`], `attr_${attribute.name}`),
          ghosts:
            row[`ghost_attr_${attribute.name}`] != null
              ? toBytes(row[`ghost_attr_${attribute.name}`], `ghost_attr_${attribute.name}`)
              : null,
        },
      ]),
    ),
  };
}

export class KonnektionCollection {
  private readonly parts = new Map<string, ParquetPart>();
  private objectsPromise: Promise<Map<number, KonnektionObjectEntry>> | null = null;

  private constructor(
    readonly manifest: KonnektionManifest,
    private readonly transport: KonnektionTransport,
  ) {}

  /**
   * Open a prefix by reading its manifest from the store.
   *
   * A missing manifest is the format's defined signal for an INTERRUPTED
   * WRITE, not for an empty collection — the manifest lands after every file it
   * names — so it is reported as such rather than as zero geometry.
   */
  static async open(transport: KonnektionTransport): Promise<KonnektionCollection> {
    let bytes: Uint8Array;
    try {
      bytes = await transport.get(MANIFEST_NAME);
    } catch (error) {
      throw new Error(
        `This prefix has no ${MANIFEST_NAME}. The manifest is written last, so a prefix without ` +
          `one is an interrupted write rather than a collection. (${String(error)})`,
      );
    }
    const manifest = parseKonnektionManifest(JSON.parse(new TextDecoder().decode(bytes)));
    return new KonnektionCollection(manifest, transport);
  }

  /**
   * Open with a manifest already in hand.
   *
   * The API mirrors `konnektion.json` onto the store node, so the first thing a
   * layer needs costs no S3 round trip. Same validation either way: the
   * mirrored object goes through `parseKonnektionManifest`, so a server that
   * mirrors something this reader cannot read is refused rather than trusted.
   */
  static fromMirroredManifest(
    raw: unknown,
    transport: KonnektionTransport,
  ): KonnektionCollection {
    return new KonnektionCollection(parseKonnektionManifest(raw), transport);
  }

  /** The spatial index. One whole-file read; the planner needs nothing else. */
  async loadCellCatalog(): Promise<KonnektionCellRow[]> {
    const rows = await this.readCatalog(this.manifest.cells, CELL_CATALOG_COLUMNS);
    return rows.map(parseCellRow);
  }

  /** The identity index, loaded lazily and memoized. Off the first-render path:
   *  nothing needs it to draw. */
  loadObjectCatalog(): Promise<Map<number, KonnektionObjectEntry>> {
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
    entry: KonnektionFileEntry,
    columns: string[],
  ): Promise<Record<string, unknown>[]> {
    // Catalogs are read whole — they are small, and every row is wanted — so
    // the length comes from the bytes rather than needing the manifest's.
    const bytes = await this.transport.get(entry.path);
    const part = new ParquetPart(entry.path, bytes.byteLength, async (_path, start, end) =>
      bytes.subarray(start, end),
    );
    return part.readRows(columns);
  }

  /**
   * Fetch and decode one row group's worth of planned cells.
   *
   * The unit is the ROW GROUP rather than the cell: a row group is the smallest
   * thing a reader can fetch, and a plan routinely puts several cells in one. A
   * null locator (legal, if unusual) degrades to reading the part whole —
   * correct and merely slow — so it warns.
   */
  async readFetchGroup(group: KonnektionFetchGroup): Promise<Map<string, DecodedNetworkCell>> {
    const partIndex = group.part ?? 0;
    const entry = levelParts(this.manifest, group.level)[partIndex];
    if (!entry) {
      throw new Error(
        `The catalog places cells in level ${group.level} part ${partIndex}, which the manifest ` +
          `does not name.`,
      );
    }

    const part = this.openPart(entry);
    const columns = geometryColumns(this.manifest);

    // Filter BEFORE decoding: a row group holds every cell in its span, and
    // decoding one we did not plan is pure waste. `delete` rather than `has`
    // so the no-locator walk below can stop the moment everything is found.
    const wanted = new Set(group.cells.map((cell) => cell.cell));
    const decoded = new Map<string, DecodedNetworkCell>();
    const collect = (rows: Record<string, unknown>[]): void => {
      for (const row of rows) {
        const cell = toNumber(row.cell, "cell");
        if (!wanted.delete(cell)) continue;
        const parsed = parseGeometryRow(row, this.manifest);
        decoded.set(
          `${parsed.level}:${parsed.cell}`,
          decodeGeometryRow(parsed, this.manifest.grid, this.manifest.encoding),
        );
      }
    };

    if (group.rowGroup === null) {
      // No locator: walk the part ONE ROW GROUP AT A TIME rather than reading
      // it whole. `readRows` over the whole part materializes every row of
      // every group at once — blob columns included — which for a large part
      // is a single allocation the renderer does not survive. Walking bounds
      // the peak at one row group and can stop early.
      console.warn(
        `[konnektion] ${entry.path} has no row-group locator for these cells; scanning its row ` +
          `groups (${entry.bytes ?? "unknown"} bytes).`,
      );
      const metadata = await part.metadata();
      for (let rowGroup = 0; rowGroup < metadata.row_groups.length; rowGroup++) {
        if (wanted.size === 0) break;
        collect(await part.readRowGroup(rowGroup, columns));
      }
    } else {
      collect(await part.readRowGroup(group.rowGroup, columns));
    }
    return decoded;
  }

  /**
   * The open part for a manifest entry.
   *
   * Cached so a part's footer is parsed once per session: the per-fetch cost is
   * then the row group alone.
   */
  private openPart(entry: KonnektionFileEntry): ParquetPart {
    const existing = this.parts.get(entry.path);
    if (existing) return existing;
    if (entry.bytes === null) {
      throw new Error(
        `The manifest records no length for ${entry.path}, and a Parquet footer sits at the end ` +
          `of a file this reader can only range-read. Rewrite the collection with a writer that ` +
          `records file lengths.`,
      );
    }
    const part = new ParquetPart(entry.path, entry.bytes, this.transport.getRange);
    this.parts.set(entry.path, part);
    return part;
  }

  /** The transport's request counters, when it keeps them (S3 does; fixtures need not). */
  transportStats(): KonnektionTransportStats | null {
    return this.transport.stats ?? null;
  }

  /** Drop cached footers. The manifest and catalogs stay. */
  release(): void {
    this.parts.clear();
  }
}
