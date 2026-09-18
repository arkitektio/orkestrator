import type { TraceLevel } from "./levelPlan";

/**
 * Addressing tiles in a trace pyramid — the rank-1 counterpart of the brick
 * renderer's `octree/nodeAddress.ts`.
 *
 * A **tile** is a fixed run of samples at one level, exactly as a brick is a fixed
 * box of voxels at one level. A tile at a coarse level covers the same stretch of
 * world time as several tiles at the next finer level, so the levels form a tree —
 * a binary-ish one when the pyramid factor is 2, though nothing here assumes that.
 *
 * As in the brick planner, **level index 0 is the FINEST** and the highest index is
 * the root. `childrenOf` therefore walks *down* an index to refine, and a level-0
 * tile has no children.
 *
 * ## Why world time is the common space
 *
 * Parent/child overlap is computed in world time rather than in sample indices.
 * Sample spaces differ per level, and a pyramid factor is not always a power of two
 * (an irregular decimation, a cropped lens dividing the period) — so relating two
 * levels by index arithmetic would only work for the easy cases. World time is the
 * one space every level is already placed in, by construction.
 */

/** Samples per tile. The analogue of `BrickSpec.payload`. */
export const DEFAULT_TILE_SAMPLES = 4096;

export type TileKey = string;

export const tileKey = (level: number, index: number): TileKey =>
  `${level}:${index}`;

export const parseTileKey = (key: TileKey): { level: number; index: number } => {
  const [level, index] = key.split(":").map(Number);
  return { level, index };
};

/** How many tiles a level's samples divide into. */
export const tileCountForLevel = (
  level: TraceLevel,
  tileSamples: number,
): number => Math.max(0, Math.ceil(level.sampleCount / tileSamples));

/** The half-open sample range a tile covers at its own level. */
export const tileSampleRange = (
  level: TraceLevel,
  tileSamples: number,
  index: number,
): { start: number; stop: number } => {
  const start = index * tileSamples;
  return { start, stop: Math.min(start + tileSamples, level.sampleCount) };
};

/**
 * The world-time span a tile covers, ordered low→high.
 *
 * Spans the tile's samples INCLUSIVELY at both ends plus one period, so adjacent
 * tiles' spans meet rather than leaving a sliver between the last sample of one and
 * the first of the next — a gap there would make the planner think part of the
 * viewport is uncovered and fetch a coarse ancestor to fill it.
 */
export const tileWorldSpan = (
  level: TraceLevel,
  tileSamples: number,
  index: number,
): { start: number; end: number } => {
  const { start, stop } = tileSampleRange(level, tileSamples, index);
  const a = level.t0 + level.period * start;
  const b = level.t0 + level.period * stop;
  return a <= b ? { start: a, end: b } : { start: b, end: a };
};

/** Tiles of a level whose spans overlap a world-time window, as an index range. */
export const tilesOverlapping = (
  level: TraceLevel,
  tileSamples: number,
  window: { start: number; end: number },
): { first: number; last: number } | null => {
  if (level.period === 0) return null;
  const count = tileCountForLevel(level, tileSamples);
  if (count === 0) return null;

  // Sample positions of the window's ends; order them, since a negative period
  // maps a forward window onto a backward sample range.
  const a = (window.start - level.t0) / level.period;
  const b = (window.end - level.t0) / level.period;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);

  const first = Math.max(0, Math.floor(lo / tileSamples));
  // The END is EXCLUSIVE. A tile's span runs to the position one past its last
  // sample, so adjacent tiles' spans meet exactly — and treating that meeting
  // point as inclusive would pull in the next tile as well. Left unfixed, asking
  // for the children of tile `i` returns the first child of tile `i + 1` too: an
  // overhang that breaks the containment the planner's refinement order relies on
  // (a parent must never score worse than its own children).
  const last = Math.min(count - 1, Math.ceil(hi / tileSamples) - 1);
  if (last < first) return null;
  return { first, last };
};

/**
 * Tiles on the next-FINER level covering this tile's world span.
 *
 * Empty for a level-0 tile: nothing refines further. Empty also when the finer
 * level does not reach this span — a truncated pyramid is allowed, and the planner
 * treats a childless node as already final rather than as an error.
 */
export const childrenOf = (
  levels: readonly TraceLevel[],
  tileSamples: number,
  levelIndex: number,
  index: number,
): number[] => {
  if (levelIndex <= 0) return [];
  const finer = levels[levelIndex - 1];
  if (!finer) return [];
  const span = tileWorldSpan(levels[levelIndex], tileSamples, index);
  const range = tilesOverlapping(finer, tileSamples, span);
  if (!range) return [];
  const out: number[] = [];
  for (let i = range.first; i <= range.last; i++) out.push(i);
  return out;
};

/**
 * Squared distance in world time from a focus to the NEAREST point of a span.
 *
 * Squared and nearest-point, to match the brick planner's `fetchScore`: it makes
 * the score monotone under ancestry, because a parent's span contains its
 * children's, so a parent can never score worse than a child it covers. The
 * planner relies on that when it orders refinement.
 */
export const spanScore = (
  span: { start: number; end: number },
  focus: number,
): number => {
  const d =
    focus < span.start
      ? span.start - focus
      : focus > span.end
        ? focus - span.end
        : 0;
  return d * d;
};

/** Do two world-time spans overlap at all? */
export const spansOverlap = (
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean => a.start <= b.end && b.start <= a.end;
