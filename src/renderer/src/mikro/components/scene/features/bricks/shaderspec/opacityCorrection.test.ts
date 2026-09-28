import { describe, expect, it } from "vitest";
import {
  compositeHomogeneousAlpha,
  correctOpacityForStep,
} from "./opacityCorrection";

/**
 * Naive (buggy) accumulator: opacity used directly per step, no step-size
 * correction. This is what the VOLUME shader did before the fix, reproduced here
 * only to demonstrate the dimming it caused.
 */
const naiveHomogeneousAlpha = (norm: number, count: number): number => {
  let alpha = 0;
  for (let i = 0; i < count; i++) {
    alpha += (1 - alpha) * norm;
    if (alpha >= 0.98) break;
  }
  return alpha;
};

describe("correctOpacityForStep", () => {
  it("is the identity when stepLen === refStep", () => {
    for (const a of [0, 0.1, 0.37, 0.8, 1]) {
      expect(correctOpacityForStep(a, 0.75, 0.75)).toBeCloseTo(a, 12);
    }
  });

  it("returns a larger alpha for larger steps (compensating fewer samples)", () => {
    const ref = correctOpacityForStep(0.2, 1, 1);
    const coarser = correctOpacityForStep(0.2, 2, 1);
    expect(coarser).toBeGreaterThan(ref);
    // A 2× step is exactly "two reference steps composited into one".
    const twoRefSteps = 1 - (1 - 0.2) * (1 - 0.2);
    expect(coarser).toBeCloseTo(twoRefSteps, 12);
  });

  it("clamps alpha into [0,1] before correcting", () => {
    expect(correctOpacityForStep(-0.5, 1, 1)).toBe(0);
    expect(correctOpacityForStep(1.5, 1, 1)).toBe(1);
  });
});

describe("compositeHomogeneousAlpha — step-size invariance (the fix)", () => {
  // A homogeneous medium of density `norm` over a fixed physical span. Sampling
  // it finely vs coarsely (across the SAME span) must reach the same opacity once
  // corrected — that is the property the fix guarantees.
  const SPAN = 12; // reference-step units
  const REF = 1;

  it("coarse and fine sampling converge to the same opacity when corrected", () => {
    for (const norm of [0.05, 0.2, 0.5]) {
      const fine = compositeHomogeneousAlpha(norm, SPAN / REF, REF, REF); // 12 steps
      const coarse = compositeHomogeneousAlpha(norm, SPAN / (3 * REF), 3 * REF, REF); // 4 steps ×3 pitch
      expect(coarse).toBeCloseTo(fine, 6);
    }
  });

  it("regression: WITHOUT correction, coarse sampling is dimmer (the original bug)", () => {
    const norm = 0.2;
    const fine = naiveHomogeneousAlpha(norm, SPAN); // 12 unit steps
    const coarse = naiveHomogeneousAlpha(norm, SPAN / 3); // 4 steps, same span
    // The bug: fewer steps accumulate materially less opacity → visibly dimmer.
    expect(coarse).toBeLessThan(fine - 0.1);
  });

  it("corrected coarse sampling recovers the opacity the naive path lost", () => {
    const norm = 0.2;
    const naiveFine = naiveHomogeneousAlpha(norm, SPAN);
    const correctedCoarse = compositeHomogeneousAlpha(norm, SPAN / 3, 3 * REF, REF);
    // The corrected coarse pass matches the well-sampled (naive-fine ≈ correct)
    // result instead of the dimmer naive-coarse one.
    expect(correctedCoarse).toBeCloseTo(naiveFine, 6);
  });
});
