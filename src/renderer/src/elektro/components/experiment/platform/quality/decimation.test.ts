import { describe, expect, it } from "vitest";
import {
  TARGET_POINTS,
  clampIndex,
  decimationFor,
  paddedExtent,
} from "./decimation";

describe("decimationFor", () => {
  it("reads every sample while the window fits the target", () => {
    expect(decimationFor(1)).toEqual({ step: 1, band: 0 });
    expect(decimationFor(TARGET_POINTS)).toEqual({ step: 1, band: 0 });
  });

  it("never leaves more than the target on screen", () => {
    // The property that matters: whatever the span, the decimated point count is
    // bounded. A ratio that is not a power of two used to round the wrong way.
    for (const span of [
      2001, 3000, 4000, 4001, 5000, 9999, 100_000, 1_000_000, 20_000_000,
    ]) {
      const { step } = decimationFor(span);
      expect(span / step).toBeLessThanOrEqual(TARGET_POINTS);
    }
  });

  it("is band-stable: a zoom inside a band returns the identical step", () => {
    // 2 * TARGET_POINTS .. 4 * TARGET_POINTS is one band, so every span in it
    // must give the same step — this is what stops a gesture refetching.
    const lo = decimationFor(2 * TARGET_POINTS + 1);
    for (const span of [
      2 * TARGET_POINTS + 1,
      3 * TARGET_POINTS,
      4 * TARGET_POINTS,
    ]) {
      expect(decimationFor(span)).toEqual(lo);
    }
    // And the next span up must be a different band, or banding does nothing.
    expect(decimationFor(4 * TARGET_POINTS + 1).band).toBe(lo.band + 1);
  });

  it("uses powers of two, so zooming in reuses every other coarse sample", () => {
    for (const span of [1, 5000, 123_456, 9_000_000]) {
      const { step, band } = decimationFor(span);
      expect(step).toBe(2 ** band);
      expect(Number.isInteger(band)).toBe(true);
    }
  });

  it("is monotone in span", () => {
    let previous = 0;
    for (let span = 1; span < 2_000_000; span = Math.ceil(span * 1.7)) {
      const { step } = decimationFor(span);
      expect(step).toBeGreaterThanOrEqual(previous);
      previous = step;
    }
  });

  it("honours a preferred step but still clamps it to a real stride", () => {
    expect(decimationFor(10_000_000, 1)).toEqual({ step: 1, band: 0 });
    expect(decimationFor(10, 8)).toEqual({ step: 8, band: 3 });
    // A nonsense preference must not produce a step of 0 and an infinite read.
    expect(decimationFor(10, 0).step).toBe(1);
    expect(decimationFor(10, -4).step).toBe(1);
    expect(decimationFor(10, 2.7).step).toBe(2);
  });

  it("never returns a step below 1, whatever the span", () => {
    for (const span of [0, -1, 0.4, NaN]) {
      expect(decimationFor(span).step).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("clampIndex", () => {
  it("clamps into the array's own bounds", () => {
    expect(clampIndex(-5, 10)).toBe(0);
    expect(clampIndex(5, 10)).toBe(5);
    expect(clampIndex(10, 10)).toBe(9);
    expect(clampIndex(3.7, 10)).toBe(3);
  });

  it("gives 0 for an empty array rather than -1", () => {
    expect(clampIndex(4, 0)).toBe(0);
  });
});

describe("paddedExtent", () => {
  it("pads a range symmetrically", () => {
    expect(paddedExtent([0, 10], 0.1)).toEqual({ lo: -1, hi: 11 });
  });

  it("ignores non-finite samples instead of poisoning the range", () => {
    expect(paddedExtent([1, NaN, 3, Infinity], 0)).toEqual({ lo: 1, hi: 3 });
  });

  it("returns null when nothing finite was measured", () => {
    expect(paddedExtent([])).toBeNull();
    expect(paddedExtent([NaN, Infinity, -Infinity])).toBeNull();
  });

  it("returns a zero-width range for flat data rather than null", () => {
    // A flat trace still needs an axis; whether to centre it is the caller's call.
    expect(paddedExtent([5, 5, 5])).toEqual({ lo: 5, hi: 5 });
  });
});
