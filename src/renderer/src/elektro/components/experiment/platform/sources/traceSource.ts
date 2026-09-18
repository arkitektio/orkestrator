import { placementToTimeMap, type TimeMap } from "../coords/timeMap";
import {
  axisNamesOf,
  channelAxisName,
  timeAxisName,
  type CoordinateSystemLike,
} from "../coords/timeAxis";
import {
  buildTraceLevels,
  pickLevel,
  type LevelChoice,
  type LevelSource,
  type TraceLevel,
} from "../quality/levelPlan";
import type { PlannedTile, TracePlan } from "../quality/tracePlanning";

/**
 * Turning a lens view into something the renderer can read from.
 *
 * This is the one place that goes from "a view of the experiment" to "a pyramid of
 * levels placed on the timeline". It pulls together four facts that live in four
 * different places, which is exactly why it is one function rather than inline at
 * the call site:
 *
 *  - the view's `asAffine`, which places the LENS sample grid on the world clock;
 *  - the lens' coordinate system, which names its axes (elektro has no
 *    `renderAxes`, so the axes ARE the axis-selection source);
 *  - the lens' slice along time, because the levels are a downsampling of the
 *    DATASET's grid, not the lens';
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

export type LensLike = {
  axisNames?: readonly string[] | null;
  shape?: readonly number[] | null;
  slices?: readonly SliceLike[] | null;
  coordinateSystem?: CoordinateSystemLike | null;
  dataset: {
    axisNames?: readonly string[] | null;
    shape?: readonly number[] | null;
    intrinsicSystem?: CoordinateSystemLike | null;
    dataArrays?: readonly DataArrayLike[] | null;
  };
};

export type TraceSource = {
  timeMap: TimeMap;
  levels: TraceLevel[];
  /** The DATASET's axis order — every level shares it. */
  axisNames: string[];
  timeAxisIndex: number;
  channelAxisIndex: number | null;
  /** How many channels are drawn: the lens' channel run, or the one `channelIndex` picks. */
  channelCount: number;
  /**
   * The DATASET indices along the channel axis that are read, in draw order —
   * what an anchor's `coordinates` are pinned to. Empty for a 1-D trace.
   */
  channelIndices: number[];
  /** The channel-axis read those indices imply (null for a 1-D trace). */
  channelRange: { start: number; stop: number; step: number } | null;
  /** Level store id → the store to read that level from. */
  storeByLevelId: Map<string, ZarrStoreLike>;
};

/** Why a view cannot be sourced. Each wants a different thing said in the UI. */
export type SourceFailure =
  | "no-placement"
  | "no-time-axis"
  | "no-levels"
  | "no-arrays"
  /** `channelIndex` points past the lens' channel run. */
  | "no-channel";

export type SourceResult =
  | { ok: true; source: TraceSource }
  | { ok: false; reason: SourceFailure };

/**
 * The dataset's own axis order.
 *
 * Preferring `axisNames` over the coordinate system's axes because that field is
 * defined as "the axis names, in ARRAY order" — which is the order a store's
 * `shape` and a chunk's strides are in. The system's axes are declared in the same
 * order, but only `axisNames` promises it.
 */
const datasetAxisOrder = (lens: LensLike): string[] => {
  const declared = lens.dataset.axisNames;
  if (declared?.length) return [...declared];
  return axisNamesOf(lens.dataset.intrinsicSystem);
};

export const buildTraceSource = (args: {
  lens: LensLike;
  /** The view's `asAffine`, or null when the server could not condense one. */
  asAffine: Parameters<typeof placementToTimeMap>[0];
  /** The experiment's world, whose TIME axis the placement lands on. */
  world?: CoordinateSystemLike | null;
  shapeRatioFallback?: boolean;
  /**
   * `TraceLayer.channelIndex`: the one channel of the LENS' channel run to draw.
   * Null draws every channel the lens covers, stacked.
   */
  channelIndex?: number | null;
}): SourceResult => {
  const { lens, world } = args;

  // The lens' own system names the INPUT side of the placement; the world names
  // the output side. Collapsing the two is how a placement silently degrades.
  const inputTimeAxis = timeAxisName(
    lens.coordinateSystem ?? lens.dataset.intrinsicSystem,
  );
  const outputTimeAxis = timeAxisName(world);
  if (!inputTimeAxis || !outputTimeAxis) return { ok: false, reason: "no-time-axis" };

  const timeMap = placementToTimeMap(args.asAffine, inputTimeAxis, outputTimeAxis);
  if (!timeMap) return { ok: false, reason: "no-placement" };

  const axisNames = datasetAxisOrder(lens);
  // The dataset's time axis need not sit where the lens' does, and neither need be
  // axis 0 — a (channel, time) store is as legal as a (time, channel) one.
  const datasetTimeAxis =
    timeAxisName(lens.dataset.intrinsicSystem) ?? inputTimeAxis;
  const timeAxisIndex = axisNames.indexOf(datasetTimeAxis);
  if (timeAxisIndex < 0) return { ok: false, reason: "no-time-axis" };

  const dataArrays = lens.dataset.dataArrays ?? [];
  if (dataArrays.length === 0) return { ok: false, reason: "no-arrays" };

  // The lens' slice along the time axis, in the LENS' own axis naming.
  const lensSlice =
    lens.slices?.find((slice) => slice.axis === inputTimeAxis) ?? null;

  const levels = buildTraceLevels(dataArrays, timeAxisIndex, timeMap, {
    shapeRatioFallback: args.shapeRatioFallback,
    lensSlice,
  });
  if (levels.length === 0) return { ok: false, reason: "no-levels" };

  const channelAxis = channelAxisName(lens.dataset.intrinsicSystem);
  const channelAxisIndex = channelAxis ? axisNames.indexOf(channelAxis) : -1;
  const datasetShape = lens.dataset.shape ?? [];

  // Which dataset channels are drawn: the lens' slice along its channel axis (a
  // lens over channels 2..5 draws those four, not all of them), narrowed to one
  // by `channelIndex`, which counts within that run.
  let channelIndices: number[] = [];
  if (channelAxisIndex >= 0) {
    const extent = datasetShape[channelAxisIndex] ?? 1;
    const lensChannelAxis =
      channelAxisName(lens.coordinateSystem ?? lens.dataset.intrinsicSystem) ?? channelAxis;
    const slice = lens.slices?.find((s) => s.axis === lensChannelAxis) ?? null;
    const start = Math.max(0, slice?.start ?? 0);
    const stop = Math.min(extent, slice?.stop ?? extent);
    const step = Math.max(1, slice?.step ?? 1);
    for (let c = start; c < stop; c += step) channelIndices.push(c);
    if (args.channelIndex != null) {
      const picked = channelIndices[args.channelIndex];
      if (picked === undefined) return { ok: false, reason: "no-channel" };
      channelIndices = [picked];
    }
    if (channelIndices.length === 0) return { ok: false, reason: "no-channel" };
  }
  const fullExtent = datasetShape[channelAxisIndex] ?? 1;
  const everyChannel =
    channelIndices.length === fullExtent && channelIndices.every((c, i) => c === i);
  // Every channel, in order, reads as "this axis in full" (null).
  const channelRange =
    channelIndices.length === 0 || everyChannel
      ? null
      : {
          start: channelIndices[0],
          stop: channelIndices[channelIndices.length - 1] + 1,
          step: channelIndices.length > 1 ? channelIndices[1] - channelIndices[0] : 1,
        };

  return {
    ok: true,
    source: {
      timeMap,
      levels,
      axisNames,
      timeAxisIndex,
      channelAxisIndex: channelAxisIndex < 0 ? null : channelAxisIndex,
      // A 1-D recording has no channel axis but is still one line.
      channelCount: channelAxisIndex < 0 ? 1 : channelIndices.length,
      channelIndices,
      channelRange,
      storeByLevelId: new Map(
        dataArrays.map((array) => [array.store.id, array.store]),
      ),
    },
  };
};

/**
 * The read to issue for a world-time window: which level, and which samples of it.
 *
 * Returns the positional ranges `readWindow` wants, in the dataset's axis order,
 * so the caller does not have to know where the time axis sits.
 */
export type TraceRead = {
  choice: LevelChoice;
  store: ZarrStoreLike;
  /** Positional, in `source.axisNames` order. Null means "this axis in full". */
  ranges: ({ start: number; stop: number; step: number } | null)[];
};

/** One tile's read: which store, and which samples of it. */
export type TileRead = {
  tile: PlannedTile;
  store: ZarrStoreLike;
  /** Positional, in `source.axisNames` order. Null means "this axis in full". */
  ranges: ({ start: number; stop: number; step: number } | null)[];
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
    const ranges: ({ start: number; stop: number; step: number } | null)[] =
      source.axisNames.map(() => null);
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
    /** Restrict the channel axis, when a view shows a subset of channels. */
    channelRange?: { start: number; stop: number } | null;
  } = {},
): TraceRead | null => {
  const choice = pickLevel(source.levels, window, options);
  if (!choice) return null;

  const store = source.storeByLevelId.get(choice.level.storeId);
  if (!store) return null;

  const ranges: ({ start: number; stop: number; step: number } | null)[] =
    source.axisNames.map(() => null);
  ranges[source.timeAxisIndex] = choice.range;

  const channelRange = options.channelRange
    ? { ...options.channelRange, step: 1 }
    : source.channelRange;
  if (channelRange && source.channelAxisIndex != null) {
    ranges[source.channelAxisIndex] = channelRange;
  }

  return { choice, store, ranges };
};
