/**
 * `fabriks.json`: what a reader learns before opening a single Parquet file.
 *
 * A fabriks collection is a self-describing PREFIX, not a list of files handed
 * to us by the API — so everything spatial and every byte layout is declared
 * here, next to the geometry, and this module is the only place that reads it.
 *
 * Two properties of the format shape this file:
 *
 *  - **The manifest is the completion marker.** A prefix has no atomic "upload
 *    finished" flag, so fabriks writes `fabriks.json` AFTER every file it names.
 *    A prefix without one is an interrupted write, not a collection — which is
 *    why a 404 here is reported as such rather than as an empty render.
 *  - **`files[*].bytes` is load-bearing.** A Parquet footer sits at the END of
 *    a file, and the store contract is get/put/list — no HEAD, no stat. The
 *    recorded length is the only way a reader can seek to a footer at all.
 *
 * Nothing is defaulted on the writer's behalf. `codec` and `compression` in
 * particular are always stated: a wrong guess is not an error, it is geometry
 * that decodes to garbage.
 */

import {
  isRecord,
  levelPartsOf,
  levelsCoarsestFirstOf,
  parseLodFileEntry,
  parseLodLevels,
  rootLevelOf,
} from "../../../platform/lod/lodManifest";

/**
 * The spec version this reader was written against, recorded rather than
 * enforced.
 *
 * **The version is deliberately not gated on.** The writer and the deployment
 * are both at 1, and every change the format has taken — the manifest, the
 * row-group locator, the object catalog — landed inside that version rather
 * than bumping it. A label that has never moved is not a decision, and gating
 * on it would only be a way to reject a collection over a string.
 *
 * What determines how bytes are read is the `encoding` block, and THAT is
 * validated strictly: every key required, every value against the format's
 * vocabulary, and the undecodable MESHOPT+ZSTD pair refused outright. A wrong
 * `codec` is garbage geometry; a surprising version string, on its own, is not.
 *
 * `manifest.specVersion` is parsed and kept, so anything that wants to branch
 * on it still can.
 */
export const FABRIKS_SPEC_VERSION = "1";

export const MANIFEST_NAME = "fabriks.json";

export type FabriksGrid = {
  /**
   * Cell extents, one per component IN THE SAME ORDER AS THE VERTICES. These
   * are slots 0/1/2, never named axes: a collection cut from (z, y, x) data
   * states its cell size in (z, y, x) and is entirely consistent. The
   * `bbox_*_x/y/z` catalog columns use the same slot convention.
   */
  cellSize: [number, number, number];
  /** Number of octree levels; 0 is the finest. */
  levels: number;
  sortKey: "MORTON";
};

export type FabriksEncoding = {
  positions: "UINT16_QUANTIZED_PER_CELL";
  indices: "UINT32" | "UINT16";
  codec: "NONE" | "MESHOPT";
  /** Per-BLOB compression — NOT the Parquet page compression, which is the file's. */
  compression: "NONE" | "ZSTD";
  boundary: "LOCKED" | "OPEN";
  decimation: "QUARTER" | "HALF" | "EIGHTH" | "CUSTOM";
};

export type FabriksFileEntry = {
  path: string;
  /** Absent on a hand-written manifest; the reader must then fetch the file whole. */
  bytes: number | null;
  rowGroups: number | null;
};

export type FabriksManifest = {
  specVersion: string;
  grid: FabriksGrid;
  encoding: FabriksEncoding;
  counts: Record<string, unknown>;
  cells: FabriksFileEntry;
  objects: FabriksFileEntry;
  /** Geometry parts per level, keyed by level number. */
  levels: ReadonlyMap<number, readonly FabriksFileEntry[]>;
};

/** Thrown for every manifest this reader refuses; never for a transport failure. */
export class FabriksFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FabriksFormatError";
  }
}

const VOCABULARY = {
  positions: ["UINT16_QUANTIZED_PER_CELL"],
  indices: ["UINT32", "UINT16"],
  codec: ["NONE", "MESHOPT"],
  compression: ["NONE", "ZSTD"],
  boundary: ["LOCKED", "OPEN"],
  decimation: ["QUARTER", "HALF", "EIGHTH", "CUSTOM"],
} as const;

const ENCODING_KEYS = Object.keys(VOCABULARY) as (keyof typeof VOCABULARY)[];

/** The shared file-entry contract, refusing in this format's name. */
const parseFileEntry = (raw: unknown, where: string): FabriksFileEntry =>
  parseLodFileEntry(raw, where, (m) => new FabriksFormatError(m));

const parseGrid = (raw: unknown): FabriksGrid => {
  if (!isRecord(raw)) {
    throw new FabriksFormatError(
      "A manifest must carry a `grid` object: it is how a reader turns a Morton code into a " +
        "box, and nothing else in the prefix states it.",
    );
  }
  const cellSize = raw.cellSize;
  if (
    !Array.isArray(cellSize) ||
    cellSize.length !== 3 ||
    !cellSize.every((c) => typeof c === "number" && Number.isFinite(c) && c >= 1)
  ) {
    throw new FabriksFormatError(
      `\`grid.cellSize\` is three whole numbers of at least 1 voxel, one per component; got ${JSON.stringify(cellSize)}.`,
    );
  }
  const levels = raw.levels;
  if (typeof levels !== "number" || levels < 1) {
    throw new FabriksFormatError(`An octree has at least one level; got ${JSON.stringify(levels)}.`);
  }
  const sortKey = raw.sortKey ?? "MORTON";
  if (sortKey !== "MORTON") {
    throw new FabriksFormatError(`\`grid.sortKey\` is ${JSON.stringify(sortKey)}; the format defines MORTON.`);
  }
  return { cellSize: cellSize as [number, number, number], levels: Math.floor(levels), sortKey: "MORTON" };
};

const parseEncoding = (raw: unknown): FabriksEncoding => {
  if (!isRecord(raw)) {
    throw new FabriksFormatError(
      "A manifest must carry an `encoding` object: it is how a reader turns blobs into geometry.",
    );
  }
  const missing = ENCODING_KEYS.filter((key) => !(key in raw));
  if (missing.length > 0) {
    // Deliberately fatal, matching the writer: a decoder cannot infer these,
    // and a wrong guess is not an error, it is geometry that decodes to garbage.
    throw new FabriksFormatError(
      `This manifest's \`encoding\` omits ${missing.join(", ")}. A decoder cannot infer them, and a ` +
        `wrong guess produces garbage rather than an error, so the collection is refused.`,
    );
  }
  for (const key of ENCODING_KEYS) {
    const allowed: readonly string[] = VOCABULARY[key];
    if (typeof raw[key] !== "string" || !allowed.includes(raw[key] as string)) {
      throw new FabriksFormatError(
        `\`encoding.${key}\` is ${JSON.stringify(raw[key])}; the format defines ${allowed.join(", ")}.`,
      );
    }
  }
  const encoding = Object.fromEntries(ENCODING_KEYS.map((key) => [key, raw[key]])) as FabriksEncoding;
  if (encoding.codec === "MESHOPT" && encoding.compression === "ZSTD") {
    // The format derives a ZSTD blob's decompressed length from the row's
    // counts (6 B/vertex, 4 B/index); a meshopt blob has no such fixed size per
    // element, so the pair is undecodable rather than merely redundant.
    throw new FabriksFormatError(
      "`codec: MESHOPT` with `compression: ZSTD` cannot be decoded: a compressed blob's length comes " +
        "from the row's vertex and index counts, and a meshopt blob has no fixed size per element.",
    );
  }
  return encoding;
};

const parseLevels = (raw: unknown): Map<number, FabriksFileEntry[]> =>
  parseLodLevels(raw, (m) => new FabriksFormatError(m));

/** Parse `fabriks.json`. Throws `FabriksFormatError` for anything unreadable. */
export function parseFabriksManifest(raw: unknown): FabriksManifest {
  if (!isRecord(raw)) throw new FabriksFormatError("A manifest is a JSON object.");

  // Recorded, not gated — see FABRIKS_SPEC_VERSION. `encoding` is the check
  // that matters, and it runs below.
  const specVersion = String(raw.specVersion ?? "").trim();

  const files = raw.files;
  if (!isRecord(files)) {
    throw new FabriksFormatError("A manifest must carry a `files` object naming its catalogs and parts.");
  }

  return {
    specVersion,
    grid: parseGrid(raw.grid),
    encoding: parseEncoding(raw.encoding),
    counts: isRecord(raw.counts) ? raw.counts : {},
    cells: parseFileEntry(files.cells, "files.cells"),
    objects: parseFileEntry(files.objects, "files.objects"),
    levels: parseLevels(files.levels),
  };
}

/** The geometry parts of one level, or an empty list if the level carries none. */
export const levelParts = (manifest: FabriksManifest, level: number): readonly FabriksFileEntry[] =>
  levelPartsOf(manifest, level);

/** The levels that actually carry geometry, coarsest first. */
export const levelsCoarsestFirst = (manifest: FabriksManifest): number[] =>
  levelsCoarsestFirstOf(manifest);

/**
 * The level the planner descends FROM.
 *
 * fabriks's own reader takes roots at the declared `grid.levels - 1`, which
 * plans nothing at all when a collection declares more levels than its catalog
 * actually reached. We fall back to the coarsest level present and warn — a
 * deliberate divergence, because an empty render is the worst possible reading
 * of a collection that has geometry.
 */
export function rootLevel(manifest: FabriksManifest): number {
  return rootLevelOf(manifest, "fabriks");
}
