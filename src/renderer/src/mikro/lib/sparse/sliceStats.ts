/**
 * What one SLICE of a sparse matrix contains — the range it spans and its
 * distribution — so a `SPARSE` colouring can be climmed against its own data
 * the way a column colouring is climmed against `readColumnHistogram`.
 *
 * Separate from `lib/attributes/columnStats.ts` because the question is asked
 * of a different thing: a column is answered by DuckDB over a parquet, a slice
 * is answered from the `objectId -> value` map `sparseSource.read` already
 * returns. Same shape of answer (a domain and `HISTOGRAM_BINS` counts over it),
 * so the same plot draws both.
 *
 * ## The implicit zeros
 *
 * A sparse read answers with the NONZERO entries only — that is what makes it
 * sparse. For a SpaceM ion most cells are absent, and absent means zero, not
 * unknown: the slice is the complete truth for its feature. So the reads below
 * account for the objects that never appeared — `sliceHistogram` from the
 * `slotCount` it is handed (how many objects the matrix addresses):
 *
 *  - the domain always contains 0 — unconditionally, which is the same rule the
 *    renderers apply (`labelColorLut` seeds its window at 0, `valueWindowOf`
 *    clamps to it), so the bars and the ramp cannot disagree about the axis;
 *  - the zero bin carries them, so the histogram shows the mass that is
 *    actually there rather than only the cells the ion was detected in.
 */
import { HISTOGRAM_BINS } from "../attributes/columnStats";

export type SliceDomain = { min: number; max: number };

/** How many objects the slice says nothing about — each one a real zero. */
const implicitZeros = (valueCount: number, slotCount: number): number =>
  Math.max(0, slotCount - valueCount);

/**
 * The range the slice spans, always including 0 (see above) — which is why this
 * one needs no `slotCount`: whether the absent objects exist cannot move a
 * bound that already sits at their value. Never degenerate:
 * an all-zero slice would otherwise hand a zero-span domain to a slider.
 */
export const sliceDomain = (values: Iterable<number>): SliceDomain => {
  let min = 0;
  let max = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max: max === min ? min + 1 : max };
};

/**
 * `binCount` counts over `domain`, the implicit zeros included.
 *
 * Values outside the domain are clamped onto its end bins rather than dropped,
 * the same way `readColumnHistogram` clamps — the caller always passes a domain
 * that contains the slice, so this is a guard and not a routine path.
 */
export const sliceHistogram = (
  values: Iterable<number>,
  slotCount: number,
  domain: SliceDomain,
  binCount: number = HISTOGRAM_BINS,
): number[] => {
  const bins = new Array<number>(binCount).fill(0);
  const span = domain.max - domain.min;
  let counted = 0;
  const binOf = (value: number): number => {
    if (!(span > 0)) return Math.floor(binCount / 2);
    const at = Math.floor(((value - domain.min) / span) * binCount);
    return Math.min(Math.max(at, 0), binCount - 1);
  };
  for (const value of values) {
    counted += 1;
    if (!Number.isFinite(value)) continue;
    bins[binOf(value)] += 1;
  }
  const zeros = implicitZeros(counted, slotCount);
  if (zeros > 0) bins[binOf(0)] += zeros;
  return bins;
};
