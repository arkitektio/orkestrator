import { describe, expect, it } from "vitest";

import { normalizeSlotValue, occupancyUpperNorm, type SlotTransfer } from "./raymarchStep";
import { rgbOccupancyUpperNorm, rgbSampleContribution, rgbSlotTransfer } from "./rgbComposite";

/**
 * The GENERAL compositor's per-step sample for three channel slots, derived
 * the long way: per slot, `normalizeSlotValue` → colour = constant tint row ×
 * weight (opacity · norm) → additive accumulation over a zero seed; the ray
 * ranks by the max per-slot norm. This is what the fast path must equal.
 */
const generalRgbSample = (
  raw: readonly [number, number, number],
  dataMin: number,
  dataMax: number,
  slots: readonly SlotTransfer[],
  opacities: readonly number[] = [1, 1, 1],
) => {
  const tints: readonly [number, number, number][] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const accum = [0, 0, 0];
  let norm = 0;
  slots.forEach((slot, k) => {
    if (!slot.visible) return;
    const n = normalizeSlotValue(raw[k], dataMin, dataMax, slot);
    const weight = opacities[k] * n;
    for (let i = 0; i < 3; i++) accum[i] += tints[k][i] * weight;
    norm = Math.max(norm, n);
  });
  return { color: accum, norm };
};

const window = { climMin: 0.1, climMax: 0.8 };
const slots = [rgbSlotTransfer(window), rgbSlotTransfer(window), rgbSlotTransfer(window)];

describe("rgbSampleContribution ≡ the general path over three basis-tinted slots", () => {
  const raws: [number, number, number][] = [
    [0, 0, 0],
    [255, 255, 255],
    [10, 120, 250],
    [200, 30, 30],
    [25.5, 204, 100.2], // window endpoints hit exactly for slot 0 and 1
    [-5, 300, 128], // outside the data range → clamped by both
  ];

  it.each(raws)("agrees for raw (%d, %d, %d)", (r, g, b) => {
    const fast = rgbSampleContribution([r, g, b], 0, 255, window);
    const general = generalRgbSample([r, g, b], 0, 255, slots);
    expect(fast.color).toEqual(general.color);
    expect(fast.norm).toBe(general.norm);
  });

  it.each(raws)("agrees under white-balance gains for raw (%d, %d, %d)", (r, g, b) => {
    const gains = [0.6, 1, 0.35] as const;
    const fast = rgbSampleContribution([r, g, b], 0, 255, window, gains);
    const general = generalRgbSample([r, g, b], 0, 255, slots, gains);
    expect(fast.color).toEqual(general.color);
    // The ray still ranks by the unweighted norm, so projection is unchanged.
    expect(fast.norm).toBe(general.norm);
  });

  it("the shared slot transfer is what resolveRenderKind guarantees: gamma 1, no invert, visible", () => {
    expect(rgbSlotTransfer(window)).toEqual({
      climMin: 0.1,
      climMax: 0.8,
      gamma: 1,
      invert: false,
      visible: true,
    });
  });

  it("never exceeds 0.999 (the ATTENUATED_MIP bound relies on it)", () => {
    expect(rgbSampleContribution([1e9, 1e9, 1e9], 0, 255, window).norm).toBeLessThanOrEqual(0.999);
  });
});

describe("rgbOccupancyUpperNorm ≡ occupancyUpperNorm over the three slots", () => {
  it.each([
    [0, 255],
    [10, 20],
    [200, 255],
    [0, 0],
  ])("agrees for the bracket [%d, %d]", (min, max) => {
    expect(rgbOccupancyUpperNorm({ min, max }, 0, 255, window)).toBe(
      occupancyUpperNorm(min, max, 0, 255, slots),
    );
  });
});
