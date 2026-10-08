/**
 * Reading a value back off a packed trace at a world time.
 *
 * The probe reads what is DRAWN — the resident, packed points — not a fresh fetch.
 * That is deliberate: the readout must agree with the line under the cursor, and
 * the line is whatever level the pyramid is currently showing. When that is a
 * coarse level, the value is the coarse level's, and `exact` says so; a readout
 * that silently presented a decimated value as the raw sample would lie.
 *
 * Linear interpolation between the two bracketing points — the same join the line
 * draws — and null outside the drawn extent or across a coverage gap, where the
 * line itself is broken.
 *
 * Pure — runs in node.
 */

export type Sample = {
  value: number;
  /** True when the time landed on a drawn point rather than between two. */
  exact: boolean;
};

/** First index with xs[i] >= x (xs ascending). */
const lowerBound = (xs: ArrayLike<number>, x: number): number => {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (xs[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

export const sampleAt = (
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  x: number,
  /** Largest spacing the line joins across; wider is a gap the line breaks at. */
  maxJoin = Infinity,
): Sample | null => {
  const n = xs.length;
  if (n === 0) return null;
  if (x < xs[0] || x > xs[n - 1]) return null;

  const i = lowerBound(xs, x);
  if (i < n && xs[i] === x) return { value: ys[i], exact: true };
  if (i === 0) return { value: ys[0], exact: xs[0] === x };

  const x0 = xs[i - 1];
  const x1 = xs[i];
  if (x1 - x0 > maxJoin) return null;
  const f = (x - x0) / (x1 - x0);
  return { value: ys[i - 1] + (ys[i] - ys[i - 1]) * f, exact: false };
};
