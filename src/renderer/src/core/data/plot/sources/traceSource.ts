import { placementToTimeMap, type AffinePlacementLike, type TimeMap } from "../coords/timeMap";
import {
  buildTraceLevels,
  pickLevel,
  type LevelChoice,
  type LevelSource,
  type TraceLevel,
} from "../quality/levelPlan";
import type { PlannedTile, TracePlan } from "../quality/tracePlanning";

/**
 * Turning a lens into something the plot can read from: a pyramid of levels
 * placed along the plot's axis.
 *
 * It pulls together facts that live in different places, which is exactly why it
 * is one function rather than inline at the call site:
 *
 *  - the layer's `asAffine`, which places the LENS sample grid on the world axis;
 *  - WHICH axis of the lens runs along the plot (and which, if any, enumerates
 *    the lines) — named by the caller, who knows how its module says so: elektro
 *    finds them by axis type, a mikro chart layer is told (`alongAxis`,
 *    `seriesAxis`);
 *  - the lens' slices: along the plot's axis because the levels are a
 *    downsampling of the DATASET's grid, not the lens'; on every other axis
 *    because a lens that pins it to one position reads that position only;
 *  - each `DataArray`'s `toParent`, which declares that level's factor.
 *
 * Kept structural — no generated types — so the whole composition is testable in
 * node without a schema or a store.
 */

export type ZarrStoreLike = { id: string };

export type DataArrayLike = LevelSource & { store: ZarrStoreLike };

export type SliceLike = {
  axis: string;
  start?: number | null;
  stop?: number | null;
  step?: number | null;
};

export type TraceLensLike = {
  /** The lens' own axis names, in array order. */
  axisNames?: readonly string[] | null;
  shape?: readonly number[] | null;
  slices?: readonly SliceLike[] | null;
  dataset: {
    shape?: readonly number[] | null;
    dataArrays?: readonly DataArrayLike[] | null;
  };
};

type Range = { start: number; stop: number; step: number };

export type TraceSource = {
  timeMap: TimeMap;
  levels: TraceLevel[];
  /** The DATASET's axis order — every level shares it. */
  axisNames: string[];
  /** Where the axis that runs along the plot sits in that order. */
  timeAxisIndex: number;
  /** Where the axis that enumerates the lines sits, or null for a single line. */
  channelAxisIndex: number | null;
  /** How many lines are drawn: the lens' run along that axis, or the one picked. */
  channelCount: number;
  /**
   * The DATASET indices along the line axis that are read, in draw order —
   * what an anchor's `coordinates` are pinned to. Empty for a single line.
   */
  channelIndices: number[];
  /** The line-axis read those indices imply (null: that axis in full, or none). */
  channelRange: Range | null;
  /**
   * Every OTHER axis, in `axisNames` order: the one position the lens pins it
   * to, or null for an axis read in full. A trace has nowhere to put a second
   * free axis, so a pinned one is read at extent 1.
   */
  fixedRanges: (Range | null)[];
  /**
   * Decoded bytes one sample along the plot costs to READ, for the planner's
   * budget. Under `decodeCost: "chunks"` this counts the whole chunks a pinned
   * position drags in — one time point of a (t, y, x) stack is a whole plane.
   */
  bytesPerSample: number;
  /** Level store id → the store to read that level from. */
  storeByLevelId: Map<string, ZarrStoreLike>;
};

/** Why a lens cannot be sourced. Each wants a different thing said in the UI. */
export type SourceFailure =
  | "no-placement"
  | "no-time-axis"
  | "no-levels"
  | "no-arrays"
  /** `seriesIndex` points past the lens' run along the line axis. */
  | "no-channel";

export type SourceResult =
  | { ok: true; source: TraceSource }
  | { ok: false; reason: SourceFailure };

/** One named axis as the lens calls it and as the dataset does. */
export type AxisNames = { lens: string; dataset: string };

/** A tile never decodes more than this, however cheap the planner thinks it is. */
export const TILE_DECODE_TARGET_BYTES = 16 * 1024 * 1024;

/**
 * Bytes one sample along the plot costs to decode at one level: every other
 * axis contributes what a read actually touches of it — a whole chunk for a
 * pinned position, whole chunks for the lines, the full extent otherwise.
 */
const chunkCostPerSample = (
  array: DataArrayLike,
  alongIndex: number,
  seriesIndex: number | null,
  seriesCount: number,
  fixed: readonly (Range | null)[],
): number => {
  let elements = 1;
  array.shape.forEach((extent, k) => {
    if (k === alongIndex) return;
    const chunk = Math.max(1, array.chunkShape?.[k] ?? 1);
    if (k === seriesIndex) {
      elements *= Math.min(extent, Math.ceil(seriesCount / chunk) * chunk);
    } else if (fixed[k]) {
      elements *= Math.min(extent, chunk);
    } else {
      elements *= extent;
    }
  });
  return 4 * Math.max(1, elements);
};

export const buildAxisTraceSource = (args: {
  lens: TraceLensLike;
  /** The layer's `asAffine`, or null when the server could not condense one. */
  asAffine: AffinePlacementLike | null | undefined;
  /** The DATASET's axis names, in array order. */
  datasetAxisNames: readonly string[];
  /**
   * The axis that runs along the plot: its name in the lens (the placement's
   * input side, and what the lens' slice names), in the dataset (where it sits
   * in a store), and the world axis the placement lands on.
   */
  along: AxisNames & { world: string };
  /** The axis drawn as one line per position, if the lens leaves one free. */
  series?: AxisNames | null;
  /** The one position of that run to draw. Null draws every one. */
  seriesIndex?: number | null;
  shapeRatioFallback?: boolean;
  /**
   * How the planner prices a sample. "samples" (default): its decoded size.
   * "chunks": what reading it actually decodes — for arrays whose chunks span
   * axes the lens pins, where one sample can cost a whole plane.
   */
  decodeCost?: "samples" | "chunks";
}): SourceResult => {
  const { lens, along } = args;

  const timeMap = placementToTimeMap(args.asAffine, along.lens, along.world);
  if (!timeMap) return { ok: false, reason: "no-placement" };

  const axisNames = [...args.datasetAxisNames];
  // The dataset's axis need not sit where the lens' does, and neither need be
  // axis 0 — a (channel, time) store is as legal as a (time, channel) one.
  const timeAxisIndex = axisNames.indexOf(along.dataset);
  if (timeAxisIndex < 0) return { ok: false, reason: "no-time-axis" };

  const dataArrays = lens.dataset.dataArrays ?? [];
  if (dataArrays.length === 0) return { ok: false, reason: "no-arrays" };

  const datasetShape = lens.dataset.shape ?? [];
  const channelAxisIndex = args.series ? axisNames.indexOf(args.series.dataset) : -1;

  // Which dataset positions are drawn as lines: the lens' slice along that axis
  // (a lens over channels 2..5 draws those four, not all of them), narrowed to
  // one by `seriesIndex`, which counts within that run.
  let channelIndices: number[] = [];
  if (channelAxisIndex >= 0) {
    const extent = datasetShape[channelAxisIndex] ?? 1;
    const slice = lens.slices?.find((s) => s.axis === args.series?.lens) ?? null;
    const start = Math.max(0, slice?.start ?? 0);
    const stop = Math.min(extent, slice?.stop ?? extent);
    const step = Math.max(1, slice?.step ?? 1);
    for (let c = start; c < stop; c += step) channelIndices.push(c);
    if (args.seriesIndex != null) {
      const picked = channelIndices[args.seriesIndex];
      if (picked === undefined) return { ok: false, reason: "no-channel" };
      channelIndices = [picked];
    }
    if (channelIndices.length === 0) return { ok: false, reason: "no-channel" };
  }
  const fullExtent = datasetShape[channelAxisIndex] ?? 1;
  const everyChannel =
    channelIndices.length === fullExtent && channelIndices.every((c, i) => c === i);
  // Every position, in order, reads as "this axis in full" (null).
  const channelRange =
    channelIndices.length === 0 || everyChannel
      ? null
      : {
          start: channelIndices[0],
          stop: channelIndices[channelIndices.length - 1] + 1,
          step: channelIndices.length > 1 ? channelIndices[1] - channelIndices[0] : 1,
        };

  // Every other axis: pinned where the lens slices it to ONE position, read in
  // full where it does not. The lens names its axes in the same order the
  // dataset does ("a selection never drops or reorders an axis"), so a dataset
  // axis is matched to the lens' name for it by position.
  const fixedRanges: (Range | null)[] = axisNames.map((name, k) => {
    if (k === timeAxisIndex || k === channelAxisIndex) return null;
    const lensName = lens.axisNames?.[k] ?? name;
    const slice = lens.slices?.find((s) => s.axis === lensName) ?? null;
    if (slice?.start == null) return null;
    const stop = slice.stop ?? slice.start + 1;
    return stop - slice.start === 1 ? { start: slice.start, stop, step: 1 } : null;
  });

  // A coarser level is only the same DATA if it was not also downsampled along
  // an axis the lens pins (or enumerates): position 12 of a plane averaged 2×2
  // is not position 12 of the plane. Such a level is dropped, not read wrongly.
  const finest = dataArrays.reduce((best, a) => (a.level < best.level ? a : best), dataArrays[0]);
  const admissible = dataArrays.filter(
    (array) =>
      array === finest ||
      array.shape.every(
        (extent, k) =>
          (fixedRanges[k] == null && k !== channelAxisIndex) || extent === finest.shape[k],
      ),
  );

  // The lens' slice along the plot's axis, in the LENS' own axis naming.
  const lensSlice = lens.slices?.find((slice) => slice.axis === along.lens) ?? null;

  let levels = buildTraceLevels(admissible, timeAxisIndex, timeMap, {
    shapeRatioFallback: args.shapeRatioFallback,
    lensSlice,
  });
  if (levels.length === 0) return { ok: false, reason: "no-levels" };

  // A line with no line axis is still one line.
  const channelCount = channelAxisIndex < 0 ? 1 : channelIndices.length;
  let bytesPerSample = 4 * Math.max(1, channelCount);
  if (args.decodeCost === "chunks") {
    const byStore = new Map(admissible.map((array) => [array.store.id, array]));
    const seriesIndex = channelAxisIndex < 0 ? null : channelAxisIndex;
    const costOf = (storeId: string) => {
      const array = byStore.get(storeId);
      return array
        ? chunkCostPerSample(array, timeAxisIndex, seriesIndex, channelCount, fixedRanges)
        : bytesPerSample;
    };
    bytesPerSample = costOf(levels[0].storeId);
    // A tile is the unit of reading: sized so ONE never decodes more than the
    // target, but never below the chunk (a read cannot cost less than a chunk).
    levels = levels.map((level) => {
      if (level.tileSamples == null) return level;
      const chunk = Math.max(1, byStore.get(level.storeId)?.chunkShape?.[timeAxisIndex] ?? 1);
      const affordable = Math.max(1, Math.floor(TILE_DECODE_TARGET_BYTES / costOf(level.storeId)));
      return { ...level, tileSamples: Math.max(chunk, Math.min(level.tileSamples, affordable)) };
    });
  }

  return {
    ok: true,
    source: {
      timeMap,
      levels,
      axisNames,
      timeAxisIndex,
      channelAxisIndex: channelAxisIndex < 0 ? null : channelAxisIndex,
      channelCount,
      channelIndices,
      channelRange,
      fixedRanges,
      bytesPerSample,
      storeByLevelId: new Map(dataArrays.map((array) => [array.store.id, array.store])),
    },
  };
};

/** The positional ranges every read of a source starts from. */
const baseRanges = (source: TraceSource): (Range | null)[] =>
  source.axisNames.map((_, k) => source.fixedRanges[k] ?? null);

/**
 * The read to issue for a window: which level, and which samples of it.
 *
 * Returns the positional ranges `readWindow` wants, in the dataset's axis order,
 * so the caller does not have to know where the plot's axis sits.
 */
export type TraceRead = {
  choice: LevelChoice;
  store: ZarrStoreLike;
  /** Positional, in `source.axisNames` order. Null means "this axis in full". */
  ranges: (Range | null)[];
};

/** One tile's read: which store, and which samples of it. */
export type TileRead = {
  tile: PlannedTile;
  store: ZarrStoreLike;
  /** Positional, in `source.axisNames` order. Null means "this axis in full". */
  ranges: (Range | null)[];
};

/**
 * The reads a tile plan implies, in the plan's own fetch order.
 *
 * Order is load-bearing, not cosmetic: the backdrop comes first so the trace is
 * drawable on the first frame, then near-before-far so a budget-limited or
 * still-loading view is sharp where the user is looking. Hand these to the fetcher
 * in order and abort the tail when the window moves.
 */
export const tileReadsFor = (
  source: TraceSource,
  plan: TracePlan,
  options: { channelRange?: { start: number; stop: number } | null } = {},
): TileRead[] => {
  const reads: TileRead[] = [];
  for (const tile of plan.tiles) {
    const store = source.storeByLevelId.get(tile.storeId);
    if (!store) continue;
    const ranges = baseRanges(source);
    // A tile is already at the resolution its level provides, so it is read
    // whole — stride 1. Decimation happened by CHOOSING the level.
    ranges[source.timeAxisIndex] = {
      start: tile.samples.start,
      stop: tile.samples.stop,
      step: 1,
    };
    const channelRange = options.channelRange
      ? { ...options.channelRange, step: 1 }
      : source.channelRange;
    if (channelRange && source.channelAxisIndex != null) {
      ranges[source.channelAxisIndex] = channelRange;
    }
    reads.push({ tile, store, ranges });
  }
  return reads;
};

/**
 * Single-level read for a window — the degenerate, non-hierarchical path.
 *
 * Kept for callers that want one buffer for a window and no residency at all: an
 * export, a thumbnail, a probe reading exact values. The interactive renderer uses
 * `planTraceTiles` + `tileReadsFor` instead, because one buffer per window means a
 * zoom has nothing to draw until the whole thing lands.
 */
export const planTraceRead = (
  source: TraceSource,
  window: { start: number; end: number },
  options: {
    targetPoints?: number;
    forcedLevel?: number | null;
    /** Restrict the line axis, when a view shows a subset of the lines. */
    channelRange?: { start: number; stop: number } | null;
  } = {},
): TraceRead | null => {
  const choice = pickLevel(source.levels, window, options);
  if (!choice) return null;

  const store = source.storeByLevelId.get(choice.level.storeId);
  if (!store) return null;

  const ranges = baseRanges(source);
  ranges[source.timeAxisIndex] = choice.range;

  const channelRange = options.channelRange
    ? { ...options.channelRange, step: 1 }
    : source.channelRange;
  if (channelRange && source.channelAxisIndex != null) {
    ranges[source.channelAxisIndex] = channelRange;
  }

  return { choice, store, ranges };
};
