/**
 * Uniform cubic B-spline reconstruction math — the CPU mirror of the zoom
 * smoothing filter the raymarcher emits (`emitTricubicTap` in
 * `features/bricks/gpu/brickNodeMaterials.ts`); keep the two in lockstep.
 *
 * The shader uses the classic two-tap decomposition (Sigg & Hadwiger): per
 * axis, the four B-spline weights collapse into TWO hardware-trilinear taps
 * at fractional offsets, so a full tricubic is 8 taps instead of 64. These
 * functions pin that algebra with tests, since the shader itself cannot be
 * unit-tested against a GPU.
 */

/** The four uniform cubic B-spline weights for fraction `f` ∈ [0, 1). */
export function bsplineWeights(f: number): [number, number, number, number] {
  const f2 = f * f;
  const f3 = f2 * f;
  const omf = 1 - f;
  return [
    (omf * omf * omf) / 6,
    (3 * f3 - 6 * f2 + 4) / 6,
    (-3 * f3 + 3 * f2 + 3 * f + 1) / 6,
    f3 / 6,
  ];
}

/**
 * Two-tap decomposition for one axis: trilinear taps at offsets `h0`/`h1`
 * (relative to the base voxel index `i`, in texel units with centers at
 * half-integers) blended by `g0` (and `1 − g0`) reproduce the four-weight
 * cubic exactly, because the hardware's linear interpolation supplies the
 * intra-pair ratio.
 */
export function bsplineTaps(f: number): { h0: number; h1: number; g0: number } {
  const [w0, w1, w2, w3] = bsplineWeights(f);
  const g0 = w0 + w1;
  return {
    h0: -1 + w1 / g0,
    h1: 1 + w3 / (w2 + w3),
    g0,
  };
}

/** Reference reconstruction of a 1D signal at `i + f` via the two-tap form —
 * used by tests to check equivalence with the direct four-weight sum. */
export function reconstructTwoTap(
  sample: (x: number) => number,
  i: number,
  f: number,
): number {
  const { h0, h1, g0 } = bsplineTaps(f);
  // A linear `sample` stands in for hardware trilinear filtering.
  return g0 * sample(i + h0) + (1 - g0) * sample(i + h1);
}
