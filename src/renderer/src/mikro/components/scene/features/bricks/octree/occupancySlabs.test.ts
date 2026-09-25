import { describe, expect, it } from "vitest";

import { MAX_OCC_SLABS, normalizeSlabRanges, occSlabCountFor, unionRanges } from "./occupancySlabs";

describe("occSlabCountFor", () => {
  it("is ONE (the pre-flag union) for single-slab pools and when the flag is off", () => {
    expect(occSlabCountFor(1, 64, 2048, true)).toBe(1);
    expect(occSlabCountFor(3, 64, 2048, false)).toBe(1);
  });

  it("is the channel count when the stacked planes fit the texture extent", () => {
    expect(occSlabCountFor(3, 64, 2048, true)).toBe(3);
    expect(occSlabCountFor(MAX_OCC_SLABS, 256, 2048, true)).toBe(MAX_OCC_SLABS);
  });

  it("falls back to the union when the planes would overflow the extent or the slab cap", () => {
    expect(occSlabCountFor(3, 700, 2048, true)).toBe(1); // 2100 > 2048
    expect(occSlabCountFor(MAX_OCC_SLABS + 1, 1, 2048, true)).toBe(1);
  });
});

describe("unionRanges / normalizeSlabRanges", () => {
  it("unions finite ranges and ignores non-finite ones", () => {
    expect(unionRanges([[3, 9], [1, 4], [Infinity, -Infinity]])).toEqual([1, 9]);
    expect(unionRanges([[Infinity, -Infinity]])).toBeNull();
    expect(unionRanges([])).toBeNull();
  });

  it("gives an unmeasured slab the conservative union, and pads/truncates to the slab count", () => {
    expect(normalizeSlabRanges([[3, 9], [Infinity, -Infinity]], 3)).toEqual([
      [3, 9],
      [3, 9],
      [3, 9],
    ]);
    expect(normalizeSlabRanges([[3, 9], [1, 4], [5, 5]], 2)).toEqual([
      [3, 9],
      [1, 4],
    ]);
    expect(normalizeSlabRanges(null, 3)).toBeNull();
    expect(normalizeSlabRanges([[NaN, NaN]], 1)).toBeNull();
  });
});
