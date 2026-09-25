import { relativeLevelScaleFactors } from "@/core/lib/scene/coords/levelScale";
import type { TransformLike } from "@/core/lib/scene/coords/transformGraph";
import type { TimeMap } from "../coords/timeMap";

/**
 * Picking the pyramid level to draw a trace from.
 *
 * This is the brick planner's job at rank 1. A trace dataset is multiscale the
 * same way an image is — one `DataArray` per downsampling factor, each declaring
 * its factor through `toParent` — so zooming out should read a COARSER LEVEL
 * rather than striding level 0. Striding level 0 reads the same number of samples
 * but touches every chunk in the window to do it; a coarse level reads a few
 * chunks that already hold the answer.
 *
 * What it is NOT: an octree. There is one axis, so there is no spatial subdivision
 * and no traversal — a level is chosen for the whole visible window, not per node.
 * That also means no residency set and no eviction policy: the chosen window is
 * small enough to hold outright.
 *
 * ## Band stability
 *
 * Selection runs off a POWER-OF-TWO band of the required resolution, not the
 * required resolution itself. A zoom that stays inside a band picks the same level
 * and the same residual stride, so it reads nothing new and repacks no buffer —
 * the camera just reveals more of what is already resident. Without the banding,
 * every pointer move would be a new plan and a new fetch. This is the same reason
 * `decimation.ts` bands its stride, and the two must agree: `decimationFor` is the
 * fallback for a single-level dataset, and this is the multiscale generalisation.
 */

/** Points we aim to put on screen per window. Kept equal to `decimation.ts`'s. */
export const TARGET_POINTS = 2000;

/** One pyramid level of a trace, expressed on the experiment's timeline. */
export type TraceLevel = {
  /** The `DataArray.level` value — 0 is full rate. */
  level: number;
  storeId: string;
  /** Samples along the time axis at this level. */
  sampleCount: number;
  /** World time per sample at this level. Signed: negative runs time backwards. */
  period: number;
  /** World time of this level's sample 0. */
  t0: number;
  /**
   * Samples per tile at this level: the storage chunk's length along time. A read
   * can never cost less than a chunk (fetch and decode are chunk-granular), so a
   * smaller tile only multiplies requests over the same bytes. Absent → the
   * planner's default.
   */
  tileSamples?: number;
};

export type LevelChoice = {
  level: TraceLevel;
  /**
   * Residual stride WITHIN the level, a power of two and >= 1. Normally 1: it is
   * only above 1 when even the coarsest level is finer than the window needs.
   */
  step: number;
  /** The band this choice was made in. Equal bands are interchangeable. */
  band: number;
  /** The half-open sample range to read at this level, with its stride. */
  range: { start: number; stop: number; step: number };
  /** How many points the read yields. */
  points: number;
};

/** A `DataArray` as this planner needs it. */
export type LevelSource = {
  level: number;
  shape: readonly number[];
  /** The storage chunk shape, when known — sets the level's tile size. */
  chunkShape?: readonly number[] | null;
  toParent?: TransformLike | null;
  store: { id: string };
};

/**
 * Build the level list for one trace, in ascending order of period (finest
 * first).
 *
 * `timeMap` places the FINEST level's sample grid on the timeline — that is what
 * a view's `asAffine` describes, because a lens selects into level 0's space. Each
 * coarser level's period is the finest one's times that level's declared factor.
 *
 * Levels whose factor cannot be read are dropped rather than guessed: an unknown
 * factor means an unknown period, and a trace drawn at the wrong period is wrong
 * in a way that looks like data. The shape ratio would usually agree (the pyramid
 * invariant is `scale · shape == const`), so `shapeRatioFallback` opts into it for
 * datasets whose edges are absent.
 */
export const buildTraceLevels = (
  sources: readonly LevelSource[],
  timeAxisIndex: number,
  timeMap: TimeMap,
  options: {
    shapeRatioFallback?: boolean;
    /**
     * The lens' slice along the time axis, when the view shows a window of the
     * dataset rather than all of it.
     *
     * This matters because the two spaces are different. `timeMap` comes from the
     * view's `asAffine`, which maps the LENS sample grid to world — but a pyramid
     * level is a downsampling of the DATASET's grid. Level `L` sample `k` is
     * dataset sample `k · factor`, which is lens sample
     * `(k · factor − start) / step`. Ignoring the slice would place every level of
     * a cropped view at the crop's start, i.e. shifted by the crop offset —
     * correct for an unsliced lens, and silently wrong for any other.
     */
    lensSlice?: { start?: number | null; step?: number | null } | null;
  } = {},
): TraceLevel[] => {
  if (sources.length === 0) return [];
  if (timeAxisIndex < 0) return [];

  const dimCount = sources[0].shape.length;
  if (sources.some((s) => s.shape.length !== dimCount)) return [];
  if (timeAxisIndex >= dimCount) return [];

  const factors = relativeLevelScaleFactors(
    sources.map((s) => ({ level: s.level, toParent: s.toParent ?? undefined })),
    dimCount,
  );

  const finest = sources.reduce(
    (best, s) => (s.level < best.level ? s : best),
    sources[0],
  );
  const finestSamples = finest.shape[timeAxisIndex];

  // Lens → dataset: lens sample i is dataset sample `sliceStart + i · sliceStep`.
  const sliceStart = Math.max(0, Math.floor(options.lensSlice?.start ?? 0));
  const sliceStep = Math.max(1, Math.floor(options.lensSlice?.step ?? 1));

  const levels: TraceLevel[] = [];
  sources.forEach((source, i) => {
    const sampleCount = source.shape[timeAxisIndex];
    if (!(sampleCount > 0)) return;

    let factor = factors[i]?.[timeAxisIndex];
    if (factor == null || !(factor > 0)) {
      if (!options.shapeRatioFallback || !(finestSamples > 0)) return;
      // The pyramid invariant: scale·shape is constant per axis.
      factor = finestSamples / sampleCount;
    }

    // world(k) = t0 + period · lensIndexOf(k), with
    // lensIndexOf(k) = (k · factor − sliceStart) / sliceStep.
    levels.push({
      level: source.level,
      storeId: source.store.id,
      sampleCount,
      period: (timeMap.period * factor) / sliceStep,
      // The half-sample downsampling offset carried by a level's translation is
      // not consumed — mikro leaves it too, and at trace resolutions it is half a
      // sample of the COARSE level, invisible next to the line width.
      t0: timeMap.t0 - (timeMap.period * sliceStart) / sliceStep,
      tileSamples: tileSamplesFor(source.chunkShape?.[timeAxisIndex]),
    });
  });

  return levels.sort((a, b) => Math.abs(a.period) - Math.abs(b.period));
};

/** Never tile finer than this, whatever the chunking: tiny chunks are the store's problem, not the planner's. */
export const MIN_TILE_SAMPLES = 4096;

/** A level's tile size from its chunk length along time (undefined when unknown). */
export const tileSamplesFor = (chunkSamples: number | null | undefined): number | undefined =>
  chunkSamples != null && chunkSamples > 0 ? Math.max(MIN_TILE_SAMPLES, chunkSamples) : undefined;

/** The smallest power-of-two band whose stride brings `span` under the target. */
const bandFor = (spanSamples: number, targetPoints: number): number => {
  let band = 0;
  while (spanSamples / 2 ** band > targetPoints) band += 1;
  return band;
};

/**
 * Convert a world-time window into a sample range at one level.
 *
 * Rounds OUTWARD, so the drawn polyline runs past both viewport edges and leaves
 * no gap where the line should continue off-screen. Handles a negative period
 * (time running backwards against the index) by ordering the two ends rather than
 * producing an inverted range.
 */
export const sampleRangeFor = (
  level: TraceLevel,
  window: { start: number; end: number },
): { start: number; stop: number } | null => {
  if (level.period === 0) return null;
  const a = (window.start - level.t0) / level.period;
  const b = (window.end - level.t0) / level.period;
  const lo = Math.floor(Math.min(a, b));
  const hi = Math.ceil(Math.max(a, b));

  const start = Math.max(0, lo);
  const stop = Math.min(level.sampleCount, hi + 1);
  if (!(stop > start)) return null;
  return { start, stop };
};

/**
 * Choose a level and stride for a world-time window.
 *
 * Picks the COARSEST level that still yields at least the target point count, so
 * the read touches as few chunks as possible; drops to a residual stride only when
 * even the coarsest level is denser than needed. Returns null when the window
 * misses the data entirely.
 */
export const pickLevel = (
  levels: readonly TraceLevel[],
  window: { start: number; end: number },
  options: { targetPoints?: number; forcedLevel?: number | null } = {},
): LevelChoice | null => {
  if (levels.length === 0) return null;
  const targetPoints = Math.max(1, options.targetPoints ?? TARGET_POINTS);

  const finest = levels[0];
  const finestRange = sampleRangeFor(finest, window);
  if (!finestRange) return null;

  // Band the requirement, not the requirement's exact value: this is what makes a
  // zoom inside a band free.
  const band = bandFor(finestRange.stop - finestRange.start, targetPoints);
  // The resolution the window can afford, as a multiple of the finest period.
  const affordableFactor = 2 ** band;

  const forced =
    options.forcedLevel == null
      ? null
      : (levels.find((l) => l.level === options.forcedLevel) ?? null);

  // Coarsest level still at or finer than what we can afford.
  const chosen =
    forced ??
    levels.reduce((best, candidate) => {
      const factor = Math.abs(candidate.period / finest.period);
      return factor <= affordableFactor &&
        Math.abs(candidate.period) >= Math.abs(best.period)
        ? candidate
        : best;
    }, finest);

  const range = sampleRangeFor(chosen, window);
  if (!range) return null;

  // Whatever the level did not absorb, the stride does — banded, so it is stable.
  const span = range.stop - range.start;
  const step = 2 ** bandFor(span, targetPoints);
  const points = Math.ceil(span / step);

  return {
    level: chosen,
    step,
    band,
    range: { start: range.start, stop: range.stop, step },
    points,
  };
};

/**
 * Whether two choices read the same data.
 *
 * The refetch gate: a zoom that produces an equal choice must not reissue a read
 * or repack a buffer. Compared by level, stride and range rather than by band
 * alone, because a PAN inside a band changes the range while the band holds.
 */
export const sameRead = (
  a: LevelChoice | null,
  b: LevelChoice | null,
): boolean =>
  a === b ||
  (a != null &&
    b != null &&
    a.level.storeId === b.level.storeId &&
    a.range.start === b.range.start &&
    a.range.stop === b.range.stop &&
    a.range.step === b.range.step);
