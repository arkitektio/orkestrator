import { describe, expect, it } from "vitest";

import { atlasTapSlabAddress, componentMask } from "./atlasTap";

describe("atlasTapSlabAddress", () => {
  it("reproduces the legacy z-stacked addressing at one channel per texel", () => {
    for (const slab of [0, 1, 2, 7, 15]) {
      expect(atlasTapSlabAddress(1, slab, 66)).toEqual({ zOffset: slab * 66, component: 0 });
    }
  });

  it("packs four slabs into one texel's components for rgba8", () => {
    expect(atlasTapSlabAddress(4, 0, 66)).toEqual({ zOffset: 0, component: 0 });
    expect(atlasTapSlabAddress(4, 2, 66)).toEqual({ zOffset: 0, component: 2 });
    expect(atlasTapSlabAddress(4, 3, 66)).toEqual({ zOffset: 0, component: 3 });
    expect(atlasTapSlabAddress(4, 5, 66)).toEqual({ zOffset: 66, component: 1 });
  });

  it("componentMask selects exactly one lane", () => {
    expect(componentMask(0)).toEqual([1, 0, 0, 0]);
    expect(componentMask(3)).toEqual([0, 0, 0, 1]);
    const texel = [10, 20, 30, 40];
    const dot = (m: number[]) => texel.reduce((acc, v, i) => acc + v * m[i], 0);
    expect(dot(componentMask(2))).toBe(30);
  });
});
