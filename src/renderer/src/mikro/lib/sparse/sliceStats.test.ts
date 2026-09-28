import { describe, expect, it } from "vitest";

import { HISTOGRAM_BINS } from "../attributes/columnStats";
import { sliceDomain, sliceHistogram } from "./sliceStats";

describe("sliceDomain", () => {
  it("always contains 0 — an absent object is a real zero, not a missing value", () => {
    expect(sliceDomain([3, 7, 12])).toEqual({ min: 0, max: 12 });
  });

  it("keeps a negative floor when the slice has one", () => {
    expect(sliceDomain([-4, 2])).toEqual({ min: -4, max: 2 });
  });

  it("never hands a slider a zero span", () => {
    expect(sliceDomain([])).toEqual({ min: 0, max: 1 });
    expect(sliceDomain([0, 0])).toEqual({ min: 0, max: 1 });
  });

  it("ignores values that are not numbers", () => {
    expect(sliceDomain([Number.NaN, 5])).toEqual({ min: 0, max: 5 });
  });
});

describe("sliceHistogram", () => {
  it("counts the objects the slice never mentions into the zero bin", () => {
    // Ten objects, two of them detected: the other eight are zeros and have to
    // show, or the plot reads as though the ion were everywhere.
    const bins = sliceHistogram([10, 10], 10, { min: 0, max: 10 });
    expect(bins[0]).toBe(8);
    expect(bins[HISTOGRAM_BINS - 1]).toBe(2);
    expect(bins.reduce((sum, count) => sum + count, 0)).toBe(10);
  });

  it("adds no zeros when every object has a value", () => {
    const bins = sliceHistogram([0, 5, 10], 3, { min: 0, max: 10 });
    expect(bins.reduce((sum, count) => sum + count, 0)).toBe(3);
    expect(bins[0]).toBe(1);
  });

  it("bins over the domain it is given, not over the values", () => {
    // A domain grown to hold a stored clim leaves the right half empty.
    const bins = sliceHistogram([1], 1, { min: 0, max: 100 }, 10);
    expect(bins[0]).toBe(1);
    expect(bins.slice(1)).toEqual(new Array(9).fill(0));
  });

  it("clamps a value outside the domain onto the end bin rather than dropping it", () => {
    const bins = sliceHistogram([50], 1, { min: 0, max: 10 }, 4);
    expect(bins[3]).toBe(1);
  });

  it("puts a constant slice mid-axis rather than dividing by a zero span", () => {
    const bins = sliceHistogram([7, 7], 2, { min: 7, max: 7 }, 4);
    expect(bins).toEqual([0, 0, 2, 0]);
  });
});
