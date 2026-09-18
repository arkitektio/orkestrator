import type { PlannedTile, TracePlan } from "./tracePlanning";
import { spansOverlap } from "./tileAddress";
import type { TileKey } from "./tileAddress";

/**
 * What is resident, what to fetch, what to drop — the rank-1 counterpart of
 * `residency/brickResidency.ts`, minus everything that only a GPU pool needs.
 *
 * There is no atlas and no slot allocation: a resident tile is a CPU-side sample
 * buffer, so residency is one byte-budgeted map. What it keeps from the brick
 * version is the part that matters for how the thing FEELS:
 *
 *  - a plan's `target` and `keep` tiles are protected from eviction, so refining
 *    never throws away the coarse fallback it is refining over;
 *  - eviction takes the furthest-from-focus unprotected tile first, so panning
 *    back over ground you just left is still cheap;
 *  - `drawableTiles` answers with the FINEST resident tile covering each stretch of
 *    time, falling back to a coarser ancestor where the fine one has not landed —
 *    which is what makes a zoom refine in place rather than blink.
 */

export type ResidentTile = {
  key: TileKey;
  level: number;
  levelIndex: number;
  index: number;
  span: { start: number; end: number };
  samples: { start: number; stop: number };
  bytes: number;
  /** World time per sample at this tile's level. */
  period: number;
  /** World time of this level's sample 0. */
  t0: number;
  /**
   * One column per channel, time-ordered, split out of the window read ONCE when
   * the tile lands. Packing then walks plain columns rather than re-deriving
   * strides for every frame a tile is drawn in.
   */
  channels: ArrayLike<number>[];
  /** Monotonic counter, for LRU among equally-distant tiles. */
  lastUsed: number;
};

export type Residency = {
  byKey: Map<TileKey, ResidentTile>;
  bytes: number;
  clock: number;
};

export const createResidency = (): Residency => ({
  byKey: new Map(),
  bytes: 0,
  clock: 0,
});

/** What a plan needs that is not resident yet, in the plan's own fetch order. */
export const missingTiles = (
  residency: Residency,
  plan: TracePlan,
): PlannedTile[] => plan.tiles.filter((t) => !residency.byKey.has(t.key));

export const insertTile = (
  residency: Residency,
  tile: ResidentTile,
): Residency => {
  const existing = residency.byKey.get(tile.key);
  if (existing) residency.bytes -= existing.bytes;
  residency.byKey.set(tile.key, { ...tile, lastUsed: ++residency.clock });
  residency.bytes += tile.bytes;
  return residency;
};

export const touchTile = (residency: Residency, key: TileKey): void => {
  const entry = residency.byKey.get(key);
  if (entry) entry.lastUsed = ++residency.clock;
};

/**
 * Drop unprotected tiles until the residency fits its budget.
 *
 * Protected = every key the current plan names, in EITHER role. Evicting a `keep`
 * would delete the coarse fallback that is standing in for a target still in
 * flight, and the trace would blink to nothing mid-zoom — which is the whole
 * failure this hierarchy exists to prevent.
 *
 * Returns the evicted keys, so a caller holding GPU buffers can release them.
 */
export const evictToBudget = (
  residency: Residency,
  protectedKeys: ReadonlySet<TileKey>,
  budgetBytes: number,
  focus: number,
): TileKey[] => {
  if (residency.bytes <= budgetBytes) return [];

  const candidates = [...residency.byKey.values()]
    .filter((tile) => !protectedKeys.has(tile.key))
    .map((tile) => {
      const d =
        focus < tile.span.start
          ? tile.span.start - focus
          : focus > tile.span.end
            ? focus - tile.span.end
            : 0;
      return { tile, distance: d * d };
    })
    // Furthest first; among equals, least recently used first.
    .sort((a, b) => b.distance - a.distance || a.tile.lastUsed - b.tile.lastUsed);

  const evicted: TileKey[] = [];
  for (const { tile } of candidates) {
    if (residency.bytes <= budgetBytes) break;
    residency.byKey.delete(tile.key);
    residency.bytes -= tile.bytes;
    evicted.push(tile.key);
  }
  return evicted;
};

/** Every key a plan names, in either role. */
export const protectedKeysOf = (plan: TracePlan): Set<TileKey> =>
  new Set(plan.tiles.map((t) => t.key));

/**
 * A stretch of the window to draw, and the tile to draw it from.
 *
 * Segments never overlap, so the renderer never puts two resolutions of the same
 * data on the same pixels. A coarse tile is CLIPPED around the finer tiles that
 * cover part of it rather than skipped or drawn whole — skipping leaves a gap
 * where the fine tiles have not landed, and drawing it whole puts a coarse
 * polyline under a fine one.
 */
export type DrawSegment = {
  tile: ResidentTile;
  /** The sub-span of the tile to draw, clipped to the window and to what is uncovered. */
  start: number;
  end: number;
};

const EPSILON = 1e-9;

/**
 * The tiles to actually draw for a window: the finest resident covering each
 * stretch of it.
 *
 * Walks the plan's targets first and falls back through their ancestors, so a
 * region whose fine tile is still in flight is drawn from the coarse one that IS
 * resident. That is the progressive-refinement behaviour — and the reason `keep`
 * tiles are fetched rather than merely protected.
 *
 * Returned low-to-high in world time, and never overlapping: where a fine tile is
 * resident, the coarse one is trimmed out rather than drawn underneath, so the
 * renderer does not put two polylines of different resolutions on the same pixels.
 */
export const drawableTiles = (
  residency: Residency,
  plan: TracePlan,
  window: { start: number; end: number },
): DrawSegment[] => {
  const inWindow = plan.tiles.filter((t) => spansOverlap(t.span, window));
  if (inWindow.length === 0) return [];

  // Finest first: a finer tile claims its stretch before any coarser one can.
  const byFineness = [...inWindow].sort(
    (a, b) => a.levelIndex - b.levelIndex || a.span.start - b.span.start,
  );

  // What is still unclaimed, as disjoint intervals in increasing order.
  let uncovered: { start: number; end: number }[] = [
    { start: window.start, end: window.end },
  ];
  const segments: DrawSegment[] = [];

  for (const planned of byFineness) {
    if (uncovered.length === 0) break;
    const tile = residency.byKey.get(planned.key);
    if (!tile) continue;

    const next: { start: number; end: number }[] = [];
    for (const gap of uncovered) {
      const start = Math.max(gap.start, tile.span.start);
      const end = Math.min(gap.end, tile.span.end);
      if (end - start <= EPSILON) {
        next.push(gap);
        continue;
      }
      segments.push({ tile, start, end });
      // Whatever of the gap the tile did not cover stays uncovered.
      if (start - gap.start > EPSILON) next.push({ start: gap.start, end: start });
      if (gap.end - end > EPSILON) next.push({ start: end, end: gap.end });
    }
    uncovered = next;
  }

  return segments.sort((a, b) => a.start - b.start);
};

/** Fraction of the window covered by something resident. 1 = no gaps. */
export const coverageOf = (
  segments: readonly DrawSegment[],
  window: { start: number; end: number },
): number => {
  const width = window.end - window.start;
  if (!(width > 0)) return 1;
  const covered = segments.reduce(
    (acc, segment) =>
      acc + Math.max(0, Math.min(window.end, segment.end) - Math.max(window.start, segment.start)),
    0,
  );
  return Math.min(1, covered / width);
};

/**
 * The pyramid level actually DRAWN at one instant: the level of the segment
 * covering `time`, or null when nothing resident covers it yet.
 *
 * What the LOD badge reports at the centre of the window. It is the SERVED level,
 * not the one the plan asked for: a fine tile still in flight leaves its coarse
 * ancestor standing in, and this is how that becomes visible rather than looking
 * finished.
 */
export const levelIndexAt = (
  segments: readonly DrawSegment[],
  time: number,
): number | null => {
  for (const segment of segments) {
    if (time >= segment.start && time <= segment.end) return segment.tile.levelIndex;
  }
  return null;
};
