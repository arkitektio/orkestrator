/**
 * How many samples to skip when reading a window of a trace.
 *
 * Ported from the uPlot generation's `getStepSizeForRange`, which kept the same
 * ~2000-points-per-window target but recomputed the step from the exact window
 * width. That made every zoom a new step, and every new step a refetch — the
 * pointer never stopped moving, so the reads never stopped either.
 *
 * Here the step is quantised to a power-of-two **band**. A zoom that stays
 * inside a band returns the identical step, so nothing refetches and nothing
 * repacks: the camera simply reveals more of a buffer that is already resident.
 * Only crossing a band boundary (or panning past the fetched margin) costs a
 * read. This is what lets the committed-range settle be cheap enough to drive
 * from a gesture.
 *
 * Powers of two specifically, rather than any quantisation: a stride of 2^k over
 * a chunked array reads whole chunks at a predictable rate, and halving the step
 * on zoom-in reuses every other sample of the coarser band rather than
 * resampling onto an unrelated grid.
 */

/** Points we aim to put on screen per window. Roughly a wide monitor, doubled. */
export const TARGET_POINTS = 2000;

export type Decimation = {
  /** Read every `step`-th sample. Always >= 1. */
  step: number;
  /** `log2(step)`. The band id — equal bands are interchangeable. */
  band: number;
};

/** The largest power of two <= n, as an exponent. `n < 1` gives 0. */
const floorLog2 = (n: number): number =>
  n < 1 ? 0 : 31 - Math.clz32(Math.floor(n));

/**
 * Pick a decimation for a window `spanSamples` wide.
 *
 * `preferredStep` forces a step (the "Raw" control), and is still clamped to >= 1
 * and still reported with its band so callers cannot end up with a step whose
 * band disagrees with it.
 */
export const decimationFor = (
  spanSamples: number,
  preferredStep?: number | null,
): Decimation => {
  if (preferredStep != null) {
    const step = Math.max(1, Math.floor(preferredStep));
    return { step, band: floorLog2(step) };
  }
  const span = Math.max(1, Math.floor(spanSamples));
  // The smallest band whose stride brings `span` to or under the target. Found by
  // integer doubling rather than `ceil(log2(span / TARGET))` so an exact power of
  // two cannot land on the wrong side of the boundary through float rounding.
  let band = 0;
  while (span / 2 ** band > TARGET_POINTS) band += 1;
  return { step: 2 ** band, band };
};

/** Clamp an index into `[0, length - 1]`; an empty length gives 0. */
export const clampIndex = (index: number, length: number): number =>
  length <= 0 ? 0 : Math.max(0, Math.min(Math.floor(index), length - 1));

/**
 * A padded min/max range for a value axis.
 *
 * Ported from `buildScaleRange`. Returns null when there is nothing finite to
 * measure, so callers can tell "no data yet" from "data that happens to be flat"
 * — a flat trace still deserves an axis, and centring it is the caller's choice.
 */
export const paddedExtent = (
  values: Iterable<number>,
  paddingRatio = 0.05,
): { lo: number; hi: number } | null => {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (lo > hi) return null;
  const pad = (hi - lo) * paddingRatio;
  return { lo: lo - pad, hi: hi + pad };
};
