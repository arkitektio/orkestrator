import { describe, expect, it } from "vitest";

import { deinterleaveSlabsRgba8, interleaveSlabsRgba8, rgba8OutputBytes } from "./rgbaPack";

describe("interleaveSlabsRgba8", () => {
  it("packs three planar slabs into .rgb with .a = 0", () => {
    const planar = new Uint8Array([1, 2, 3, 10, 20, 30, 100, 200, 255]);
    const out = interleaveSlabsRgba8(planar, 3, 3, new Uint8Array(12));
    expect([...out]).toEqual([1, 10, 100, 0, 2, 20, 200, 0, 3, 30, 255, 0]);
  });

  it("packs four slabs and round-trips through the deinterleave", () => {
    const planar = new Uint8Array(4 * 5);
    for (let i = 0; i < planar.length; i++) planar[i] = (i * 37) & 0xff;
    const out = interleaveSlabsRgba8(planar, 5, 4, new Uint8Array(20));
    expect([...deinterleaveSlabsRgba8(out, 5, 4, new Uint8Array(20))]).toEqual([...planar]);
  });

  it("sizes the output as voxels × 4 whatever the slab count", () => {
    expect(rgba8OutputBytes(66 * 66 * 66 * 3, 3)).toBe(66 * 66 * 66 * 4);
    expect(rgba8OutputBytes(9 * 4, 4)).toBe(9 * 4);
  });
});
