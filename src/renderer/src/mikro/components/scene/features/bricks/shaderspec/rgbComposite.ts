import { normalizeSlotValue, type SlotTransfer } from "./raymarchStep";

/**
 * CPU mirror of the fixed-shape RGB emitters (`createRgbPlaneMaterial` and the
 * volume raymarcher's `emitRgb` member arm in `brickNodeMaterials.ts`) — keep
 * in lockstep, same pattern as the other files in this folder.
 *
 * The fast path's whole claim is that for an `"rgb"` recipe the general
 * compositor's per-step sample collapses to
 *
 *   color = (g_r·norm_r, g_g·norm_g, g_b·norm_b),   norm = max(norm_r, norm_g, norm_b)
 *
 * with `norm_k = normalizeSlotValue(raw_k, window)`, `g_k` the plane's
 * white-balance gain (its slot opacity) and NO gamma, invert or LUT. The ray
 * ranks by the UNWEIGHTED norm, as the general loop does. `rgbComposite.test.ts` derives the same numbers by running
 * the GENERAL per-slot path (`normalizeSlotValue` per slot × constant tint
 * row × additive accumulation) and asserts equality — the only GPU-free way
 * to pin that the two shaders agree.
 */
export type RgbWindow = { climMin: number; climMax: number };

/** The shared-window slot transfer an `"rgb"` source is guaranteed to have. */
export const rgbSlotTransfer = (window: RgbWindow): SlotTransfer => ({
  climMin: window.climMin,
  climMax: window.climMax,
  gamma: 1,
  invert: false,
  visible: true,
});

export type RgbSample = {
  color: readonly [number, number, number];
  /** What the ray ranks by (MIP / ISO / VOLUME): the max per-slab norm. */
  norm: number;
};

/** Neutral white balance: every primary at its unscaled norm. */
export const NEUTRAL_GAINS: readonly [number, number, number] = [1, 1, 1];

/** One RGB sample as the fast path computes it. */
export function rgbSampleContribution(
  raw: readonly [number, number, number],
  dataMin: number,
  dataMax: number,
  window: RgbWindow,
  gains: readonly [number, number, number] = NEUTRAL_GAINS,
): RgbSample {
  const slot = rgbSlotTransfer(window);
  const r = normalizeSlotValue(raw[0], dataMin, dataMax, slot);
  const g = normalizeSlotValue(raw[1], dataMin, dataMax, slot);
  const b = normalizeSlotValue(raw[2], dataMin, dataMax, slot);
  return { color: [r * gains[0], g * gains[1], b * gains[2]], norm: Math.max(r, g, b) };
}

/**
 * The occupancy-skip upper bound for an RGB member (mirror of the straight-line
 * skip predicate the `emitRgb` arm emits): `normalizeSlotValue` is monotone in
 * the raw value (no invert here), so the windowed norm over a brick is bounded
 * by the norm at the bracket's endpoints — and with ONE shared window the
 * bound is the same for all three slabs.
 */
export function rgbOccupancyUpperNorm(
  bounds: { min: number; max: number },
  dataMin: number,
  dataMax: number,
  window: RgbWindow,
): number {
  const slot = rgbSlotTransfer(window);
  return Math.max(
    normalizeSlotValue(bounds.min, dataMin, dataMax, slot),
    normalizeSlotValue(bounds.max, dataMin, dataMax, slot),
  );
}
