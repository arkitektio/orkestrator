import { describe, expect, it } from "vitest";
import { countInWindow, densityBins, rateBinWidth, shouldDrawDensity } from "./density";

describe("density fallback", () => {
  it("switches when marks outnumber pixel columns", () => {
    expect(shouldDrawDensity(800, 1000)).toBe(false);
    expect(shouldDrawDensity(1001, 1000)).toBe(true);
    expect(shouldDrawDensity(10, 0)).toBe(false);
  });

  it("counts only what is in view", () => {
    expect(countInWindow([0, 5, 10, 15], 5, 10)).toBe(2);
  });

  it("bins over the window, with optional weights", () => {
    expect(Array.from(densityBins([0, 1, 1.5, 9.9, 10, -1], 0, 10, 5))).toEqual([3, 0, 0, 0, 1]);
    expect(Array.from(densityBins([0, 3], 0, 4, 2, [2, 5]))).toEqual([2, 5]);
  });

  it("never bins finer than a pixel", () => {
    expect(rateBinWidth(null, { start: 0, end: 1000 }, 100)).toBe(10);
    expect(rateBinWidth(50, { start: 0, end: 1000 }, 100)).toBe(50);
    expect(rateBinWidth(1, { start: 0, end: 1000 }, 100)).toBe(10);
  });
});

import { laneRateQuads } from "./density";

describe("laneRateQuads", () => {
  it("bins per lane, normalized to the busiest bin of the layer", () => {
    // Lane 0: two spikes in bin 0; lane 1: one spike in bin 1.
    const quads = Array.from(laneRateQuads([0.1, 0.2, 1.5], [0, 0, 1], 2, 0, 2, 1));
    expect(quads).toHaveLength(8);
    // Lane 0, bin 0: full height (0.9 of the lane), rising from -1.
    expect(quads.slice(0, 4).map((v) => Math.round(v * 100) / 100)).toEqual([0, 1, -0.1, -1]);
    // Lane 1, bin 1: half as busy.
    expect(quads.slice(4, 8).map((v) => Math.round(v * 100) / 100)).toEqual([1, 2, -1.55, -2]);
  });
});
