/**
 * The parts of a level-of-detail Parquet manifest that are the same whatever
 * the blobs inside it are.
 *
 * `platform/parquet/transport.ts` already states the premise: fabriks
 * (surfaces) and konnektion (graphs) "are different formats with different
 * blob contracts, but they lay their prefixes out identically — manifest at
 * the root, two catalogs, one file per level part". This module is that
 * observation applied one layer up, to the manifest's own skeleton.
 *
 * ## What is here, and what is deliberately NOT
 *
 * Here: the file-entry contract, the level map, and the level helpers. These
 * encode DECISIONS both readers must agree on — that a bare string is a legal
 * file entry, that `bytes` may be absent on a hand-written manifest, and (the
 * load-bearing one) that `rootLevel` diverges from the formats' own Python
 * readers by falling back to the coarsest level PRESENT rather than the
 * declared one. Both readers made that divergence independently and for the
 * same stated reason; if one ever un-made it, the two would silently disagree
 * about which level a collection starts at.
 *
 * NOT here, and not by omission:
 *  - **`parseGrid`.** They differ for real: konnektion accepts `cell_size`
 *    alongside `cellSize`, fabriks does not, and their grid types carry
 *    different members.
 *  - **`parseEncoding` and the vocabularies.** The encoding IS the format.
 *  - **The manifest assembly.** Each reader's `parseXManifest` names its own
 *    required keys, and the whole point of a strict manifest parser is that it
 *    reads as one piece.
 *
 * Every refusal is thrown through a caller-supplied factory so the message
 * still names the format — a konnektion prefix must not report a
 * `FabriksFormatError`.
 */

/** One geometry part. Both formats declare exactly this. */
export type LodFileEntry = {
  path: string;
  /** Absent on a hand-written manifest; the reader must then fetch the file whole. */
  bytes: number | null;
  rowGroups: number | null;
};

/** Builds the format's own error. Passed in so refusals stay attributable. */
export type LodErrorFactory = (message: string) => Error;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A file entry is a path, or an object carrying one (a bare string is legal). */
export const parseLodFileEntry = (
  raw: unknown,
  where: string,
  error: LodErrorFactory,
): LodFileEntry => {
  if (typeof raw === "string") return { path: raw, bytes: null, rowGroups: null };
  if (!isRecord(raw) || typeof raw.path !== "string") {
    throw error(`${where} is a path, or an object carrying one; got ${JSON.stringify(raw)}.`);
  }
  return {
    path: raw.path,
    bytes: typeof raw.bytes === "number" ? raw.bytes : null,
    rowGroups: typeof raw.rowGroups === "number" ? raw.rowGroups : null,
  };
};

/** `files.levels` → level number → its parts. */
export const parseLodLevels = (
  raw: unknown,
  error: LodErrorFactory,
): Map<number, LodFileEntry[]> => {
  if (!isRecord(raw)) {
    throw error(
      "This manifest's `files` carries no `levels`, which means its geometry can only be found by " +
        "listing the prefix — and this reader cannot list. Rewrite the collection with a writer that " +
        "records its parts.",
    );
  }
  const levels = new Map<number, LodFileEntry[]>();
  for (const [key, value] of Object.entries(raw)) {
    const level = Number(key);
    if (!Number.isInteger(level) || level < 0) {
      throw error(`\`files.levels\` is keyed by level number; got ${JSON.stringify(key)}.`);
    }
    if (!Array.isArray(value) || value.length === 0) {
      throw error(`\`files.levels[${key}]\` is a non-empty list of parts.`);
    }
    levels.set(
      level,
      value.map((entry, index) => parseLodFileEntry(entry, `files.levels[${key}][${index}]`, error)),
    );
  }
  if (levels.size === 0) throw error("`files.levels` names no levels at all.");
  return levels;
};

/** The shape the level helpers need of a manifest, whatever else it carries. */
export type LodLevelled<E> = {
  grid: { levels: number };
  /** ReadonlyMap: the helpers only ever read, and both manifests publish theirs
   *  as readonly so a consumer cannot mutate a parsed collection. */
  levels: ReadonlyMap<number, readonly E[]>;
};

export const levelPartsOf = <E,>(manifest: LodLevelled<E>, level: number): readonly E[] =>
  manifest.levels.get(level) ?? [];

/** The levels that actually carry geometry, coarsest first. */
export const levelsCoarsestFirstOf = <E,>(manifest: LodLevelled<E>): number[] =>
  [...manifest.levels.keys()].sort((a, b) => b - a);

/**
 * The level the planner starts from.
 *
 * **A deliberate divergence from both formats' own Python readers**, which take
 * roots at the declared `grid.levels - 1`. That plans nothing at all when a
 * collection declares more levels than its catalog actually reached, and an
 * empty render is the worst possible reading of a collection that has
 * geometry — so this falls back to the coarsest level PRESENT and warns.
 *
 * Shared precisely because it is a divergence: two copies of a deliberate
 * departure from a spec are two chances to drift back.
 */
export const rootLevelOf = <E,>(manifest: LodLevelled<E>, tag: string): number => {
  const declared = manifest.grid.levels - 1;
  if (manifest.levels.has(declared)) return declared;
  const present = levelsCoarsestFirstOf(manifest)[0];
  console.warn(
    `[${tag}] grid declares ${manifest.grid.levels} levels, so the coarsest should be ` +
      `${declared}, but the coarsest level with geometry is ${present}. Using ${present}.`,
  );
  return present;
};
