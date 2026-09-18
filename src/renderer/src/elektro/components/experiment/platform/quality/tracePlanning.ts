import type { TraceLevel } from "./levelPlan";
import {
  DEFAULT_TILE_SAMPLES,
  childrenOf,
  spanScore,
  tileCountForLevel,
  tileKey,
  tileSampleRange,
  tileWorldSpan,
  tilesOverlapping,
  type TileKey,
} from "./tileAddress";

/**
 * Hierarchical tile planner for traces — the rank-1 counterpart of the brick
 * renderer's `octree/nodePlanning.ts`.
 *
 * Roles are the same two, for the same reason: the renderer falls back to the
 * coarsest resident tile covering a stretch of time, so there is no "cover" role
 * and no render feedback.
 *
 *  - **target**: fetch, and protect from eviction.
 *  - **keep**:   the ancestor chain of every target, so a coarser fallback is
 *                always resident. Protected AND fetched when missing — which is
 *                what makes a zoom show a coarse line immediately and refine in
 *                place, instead of showing a gap.
 *
 * Refinement runs closest-first, so when the byte budget runs out it is the edges
 * of the window that stay coarse while the focus is sharp.
 *
 * ## What differs from the octree, and why
 *
 * One axis, and an orthographic camera, so pixels-per-sample is UNIFORM across the
 * viewport — there is no perspective foveation and the desired level is the same
 * everywhere in view. The hierarchy therefore earns its place on three other counts:
 *
 *  - **progressive refinement**: the coarse ancestors are resident first, so the
 *    trace is drawn (coarsely) on the very first frame of a zoom;
 *  - **budget**: a window that cannot be afforded at the desired level degrades at
 *    its edges rather than failing or blocking;
 *  - **prefetch**: the margin either side of the viewport is planned at a coarser
 *    band, so a pan reveals something rather than nothing.
 *
 * There is also no pool/atlas: tiles are CPU-side sample buffers, so there is one
 * budget currency (decoded bytes) rather than the brick planner's two (decode bytes
 * and GPU slot bytes).
 */

export type TileRole = "target" | "keep";

export type PlannedTile = {
  key: TileKey;
  /** Index into the `levels` array: 0 is finest. */
  levelIndex: number;
  /** The level's own `DataArray.level`, for reading. */
  level: number;
  storeId: string;
  index: number;
  role: TileRole;
  /** Half-open sample range at this tile's own level. */
  samples: { start: number; stop: number };
  /** World-time span, for hit-testing and for drawing order. */
  span: { start: number; end: number };
  /** Squared world-time distance from the focus to the nearest point of the span. */
  fetchScore: number;
  /**
   * 0 = root backdrop (few tiles; the no-gap guarantee for the whole window, always
   * fetched first), 1 = overlaps the strict viewport, 2 = margin-only prefetch.
   */
  fetchBand: 0 | 1 | 2;
  /** Decoded bytes this tile costs. */
  bytes: number;
  /** Emission order — deterministic, near-first. */
  priority: number;
};

export type TracePlan = {
  /** Finest level index the plan requests anywhere. */
  targetLevelIndex: number;
  /** Floor of refinement actually reached — above `targetLevelIndex` if the budget bit. */
  budgetMinLevelIndex: number;
  tiles: PlannedTile[];
  planBytes: number;
  /** The budget this plan was measured against. Debug only. */
  budgetBytes: number;
  /**
   * Decoded bytes the VISIBLE window implies at each level, finest first.
   *
   * Debug only, and for the same reason the brick planner carries
   * `levelDecodeBytes`: otherwise "why is level 0 never chosen here?" means
   * re-deriving it by hand from sample counts. With it the answer is one line.
   */
  levelBytes: number[];
};

export type PlanTraceTilesInput = {
  /** Finest-first, as `buildTraceLevels` returns them. */
  levels: readonly TraceLevel[];
  /** The strict viewport, in world time. */
  window: { start: number; end: number };
  /** Points to aim for across the viewport. */
  targetPoints?: number;
  /** Tile size in samples. */
  tileSamples?: number;
  /** Decoded bytes the plan may spend. */
  budgetBytes?: number;
  /** Bytes per decoded sample. The runner promotes everything but uint8 to f32. */
  bytesPerSample?: number;
  /**
   * Fraction of the window's width to prefetch either side. The brick planner's
   * `PREFETCH_MARGIN`, at rank 1.
   */
  prefetchMargin?: number;
  /**
   * What to keep sharp when the budget runs out. World time; defaults to the
   * window's centre. Point it at the cursor to foveate on the pointer.
   */
  focus?: number | null;
  /** Pin refinement to one level, for a "show me raw" control. */
  forcedLevel?: number | null;
};

/**
 * Decoded bytes a trace may plan. One chunk-aligned tile can be large (a 1.25 M
 * sample, 4-channel chunk is 20 MB), so this must hold a few of them plus their
 * ancestors, or refinement starves at the first level.
 */
export const DEFAULT_BUDGET_BYTES = 128 * 1024 * 1024;
export const DEFAULT_PREFETCH_MARGIN = 0.5;
export const DEFAULT_TARGET_POINTS = 2000;

/** Order tiles are fetched in: backdrop first, then near before far. */
export const compareFetchOrder = (a: PlannedTile, b: PlannedTile): number =>
  a.fetchBand - b.fetchBand ||
  a.fetchScore - b.fetchScore ||
  a.levelIndex - b.levelIndex ||
  a.index - b.index;

const widen = (
  window: { start: number; end: number },
  margin: number,
): { start: number; end: number } => {
  const pad = (window.end - window.start) * Math.max(0, margin);
  return { start: window.start - pad, end: window.end + pad };
};

/**
 * Plan the tiles to have resident for a world-time window.
 *
 * Returns tiles in fetch order. An empty plan means the window misses the data —
 * not an error, and the renderer draws nothing for it.
 */
export const planTraceTiles = (input: PlanTraceTilesInput): TracePlan => {
  const {
    levels,
    window,
    targetPoints = DEFAULT_TARGET_POINTS,
    tileSamples = DEFAULT_TILE_SAMPLES,
    budgetBytes = DEFAULT_BUDGET_BYTES,
    bytesPerSample = 4,
    prefetchMargin = DEFAULT_PREFETCH_MARGIN,
    forcedLevel = null,
  } = input;

  const empty: TracePlan = {
    targetLevelIndex: 0,
    budgetMinLevelIndex: 0,
    tiles: [],
    planBytes: 0,
    budgetBytes,
    levelBytes: [],
  };
  if (levels.length === 0) return empty;

  const focus = input.focus ?? (window.start + window.end) / 2;
  const fetchRegion = widen(window, prefetchMargin);
  const rootIndex = levels.length - 1;

  // Bytes the strict window implies at each level — the quantity the desired
  // level is chosen against, and the debug answer to "why not finer?".
  const levelBytes = levels.map((level) => {
    const range = tilesOverlapping(level, tileSamples, window);
    if (!range) return 0;
    let samples = 0;
    for (let i = range.first; i <= range.last; i++) {
      const { start, stop } = tileSampleRange(level, tileSamples, i);
      samples += stop - start;
    }
    return samples * bytesPerSample;
  });

  /**
   * The level the zoom warrants: the finest whose visible sample count fits the
   * point budget. Uniform across the viewport, because the camera is orthographic.
   */
  const desiredLevelIndex = (() => {
    if (forcedLevel != null) {
      const found = levels.findIndex((l) => l.level === forcedLevel);
      if (found >= 0) return found;
    }
    for (let i = 0; i < levels.length; i++) {
      const range = tilesOverlapping(levels[i], tileSamples, window);
      if (!range) continue;
      const samples = Math.abs(
        (window.end - window.start) / levels[i].period,
      );
      if (samples <= targetPoints) return i;
    }
    return rootIndex;
  })();

  const made = new Map<TileKey, PlannedTile>();
  const bandOf = (span: { start: number; end: number }): 0 | 1 | 2 =>
    span.start <= window.end && window.start <= span.end ? 1 : 2;

  const make = (
    levelIndex: number,
    index: number,
    role: TileRole,
    band: 0 | 1 | 2,
  ): PlannedTile => {
    const level = levels[levelIndex];
    const key = tileKey(level.level, index);
    const existing = made.get(key);
    if (existing) {
      // A tile can be reached as both an ancestor and a target; target wins, and
      // the strongest band wins, so a tile in view is never demoted to prefetch.
      if (role === "target") existing.role = "target";
      if (band < existing.fetchBand) existing.fetchBand = band;
      return existing;
    }
    const samples = tileSampleRange(level, tileSamples, index);
    const span = tileWorldSpan(level, tileSamples, index);
    const tile: PlannedTile = {
      key,
      levelIndex,
      level: level.level,
      storeId: level.storeId,
      index,
      role,
      samples,
      span,
      fetchScore: spanScore(span, focus),
      fetchBand: band,
      bytes: (samples.stop - samples.start) * bytesPerSample,
      priority: 0,
    };
    made.set(key, tile);
    return tile;
  };

  // --- tier 0: the root backdrop -------------------------------------------
  // Always planned, whatever the budget. This is the no-gap guarantee: the whole
  // fetch region is covered by SOME resident level, so a zoom or a pan shows a
  // coarse line immediately rather than a hole.
  const rootRange = tilesOverlapping(levels[rootIndex], tileSamples, fetchRegion);
  if (!rootRange) return { ...empty, levelBytes };

  let spent = 0;
  const backdrop: PlannedTile[] = [];
  for (let i = rootRange.first; i <= rootRange.last; i++) {
    const tile = make(rootIndex, i, rootIndex === desiredLevelIndex ? "target" : "keep", 0);
    backdrop.push(tile);
    spent += tile.bytes;
  }

  // --- refinement: closest-first, budget-bounded ---------------------------
  // A frontier of tiles that could still be refined. Taking the best (band, score)
  // each step is what makes the budget degrade the EDGES rather than the focus.
  let frontier = backdrop.filter((t) => t.levelIndex > desiredLevelIndex);
  let budgetMinLevelIndex = rootIndex;

  while (frontier.length > 0) {
    frontier.sort(compareFetchOrder);
    const tile = frontier.shift()!;
    if (tile.levelIndex <= desiredLevelIndex) continue;

    const kids = childrenOf(levels, tileSamples, tile.levelIndex, tile.index);
    // A truncated pyramid: nothing finer covers this span, so the tile is final.
    if (kids.length === 0) {
      tile.role = "target";
      continue;
    }

    const childLevelIndex = tile.levelIndex - 1;
    const childCount = tileCountForLevel(levels[childLevelIndex], tileSamples);
    const wanted = kids.filter((index) => index < childCount);
    const cost = wanted.reduce((acc, index) => {
      const { start, stop } = tileSampleRange(
        levels[childLevelIndex],
        tileSamples,
        index,
      );
      return acc + (stop - start) * bytesPerSample;
    }, 0);

    if (spent + cost > budgetBytes) {
      // Cannot afford to refine here. The tile stays as the finest thing covering
      // its span, and nothing else on the frontier can be cheaper — but keep
      // going: a nearer sibling may already have refined, and a *smaller* tile
      // further out might still fit.
      tile.role = "target";
      continue;
    }

    spent += cost;
    // Refined, so this tile becomes the fallback rather than the thing drawn.
    tile.role = "keep";
    for (const index of wanted) {
      // Band 0 is RESERVED for the root backdrop. A refined tile is banded by
      // where it actually sits — in view, or margin-only. Letting children inherit
      // band 0 inverted the whole refinement order: band sorts before score, so
      // the far margin refined ahead of the focus, which is the opposite of what
      // foveation is for.
      const child = make(
        childLevelIndex,
        index,
        "target",
        bandOf(tileWorldSpan(levels[childLevelIndex], tileSamples, index)),
      );
      if (child.levelIndex > desiredLevelIndex) frontier.push(child);
    }
    budgetMinLevelIndex = Math.min(budgetMinLevelIndex, childLevelIndex);
  }

  const tiles = [...made.values()].sort(compareFetchOrder);
  tiles.forEach((tile, i) => {
    tile.priority = i;
  });

  return {
    targetLevelIndex: desiredLevelIndex,
    budgetMinLevelIndex,
    tiles,
    planBytes: tiles.reduce((acc, t) => acc + t.bytes, 0),
    budgetBytes,
    levelBytes,
  };
};

/**
 * A stable signature of what a plan asks for.
 *
 * The refetch gate: two plans with equal signatures need no work at all, which is
 * what keeps a zoom inside a band free. Compared by key and role, because a tile
 * moving from target to keep changes what is DRAWN even when the resident set is
 * unchanged.
 */
export const planSignature = (plan: TracePlan): string =>
  plan.tiles.map((t) => `${t.key}:${t.role[0]}`).join("|");
