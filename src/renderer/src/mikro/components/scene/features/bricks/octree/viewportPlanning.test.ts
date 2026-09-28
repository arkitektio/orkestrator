import { describe, expect, it } from "vitest";
import {
  chooseLodForScale,
  expandVoxelRange,
  viewRangeToLevelSlice,
} from "./viewportPlanning";

describe("expandVoxelRange", () => {
  it("adds the margin fraction of the extent on each side", () => {
    expect(expandVoxelRange([100, 300], 0.25)).toEqual([50, 350]);
  });

  it("leaves a zero-extent range unchanged", () => {
    expect(expandVoxelRange([42, 42], 0.25)).toEqual([42, 42]);
  });
});

describe("viewRangeToLevelSlice", () => {
  it("passes a base-resolution range through at scale factor 1", () => {
    expect(viewRangeToLevelSlice([100, 300], 1, 1000)).toEqual({ start: 100, stop: 300 });
  });

  it("divides by the level scale factor (floor start, ceil stop)", () => {
    expect(viewRangeToLevelSlice([100, 301], 4, 1000)).toEqual({ start: 25, stop: 76 });
  });

  it("clamps to the level's axis length", () => {
    expect(viewRangeToLevelSlice([-50, 5000], 2, 100)).toEqual({ start: 0, stop: 100 });
  });

  it("intersects with the layer's configured slice", () => {
    expect(
      viewRangeToLevelSlice([0, 1000], 1, 1000, { start: 200, stop: 400 }),
    ).toEqual({ start: 200, stop: 400 });
  });

  it("returns null when the visible rect misses the slice entirely", () => {
    expect(
      viewRangeToLevelSlice([500, 600], 1, 1000, { start: 0, stop: 100 }),
    ).toBeNull();
  });

  it("returns null when nothing is visible", () => {
    expect(viewRangeToLevelSlice([-100, -10], 1, 1000)).toBeNull();
  });
});

describe("chooseLodForScale", () => {
  const factors = [1, 2, 4, 8, 16]; // deep 5-level pyramid

  it("picks level 0 when zoomed far in", () => {
    expect(chooseLodForScale(10, factors)).toBe(0);
  });

  it("picks the finest level whose voxels cover >= 1 screen pixel", () => {
    // 0.6 px/base-voxel: level 0 = 0.6 (too fine), level 1 = 1.2 -> pick 1.
    expect(chooseLodForScale(0.6, factors)).toBe(1);
  });

  it("uses levels beyond 2 on deep pyramids (old ladder capped at 2)", () => {
    // 0.1 px/base-voxel: level 3 = 0.8, level 4 = 1.6 -> pick 4.
    expect(chooseLodForScale(0.1, factors)).toBe(4);
  });

  it("falls back to the coarsest level when everything is sub-pixel", () => {
    expect(chooseLodForScale(0.01, factors)).toBe(factors.length - 1);
  });

  it("applies lodBias as a tolerance multiplier", () => {
    // bias 0.5 halves the effective px/voxel -> one level coarser.
    expect(chooseLodForScale(0.6, factors, 1)).toBe(1);
    expect(chooseLodForScale(0.6, factors, 0.5)).toBe(2);
  });

  it("handles an empty level list", () => {
    expect(chooseLodForScale(1, [])).toBe(0);
  });
});
