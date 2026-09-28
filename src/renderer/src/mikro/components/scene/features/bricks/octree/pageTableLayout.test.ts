import { describe, expect, it } from "vitest";
import { buildLayerLevelGeometry } from "../../../platform/coords/levelGeometry";
import {
  PAGE_FLAG_EMPTY,
  PAGE_FLAG_RESIDENT,
  buildPageTableLayout,
  encodePageEntry,
  levelPageGrids,
  pageEntryIndex,
} from "./pageTableLayout";

const DIMS = ["c", "z", "y", "x"];
const LAYER = { xAxis: "x", yAxis: "y", zAxis: "z", intensityAxis: "c" };

const geo3 = buildLayerLevelGeometry(DIMS, LAYER, [
  { shape: [3, 40, 500, 600], chunks: [1, 16, 128, 128], dtype: "uint8", storeId: "s0" },
  { shape: [3, 40, 250, 300], chunks: [1, 16, 128, 128], dtype: "uint8", storeId: "s1", scaleFactors: [1, 1, 2, 2] },
  { shape: [3, 40, 125, 150], chunks: [1, 16, 128, 128], dtype: "uint8", storeId: "s2", scaleFactors: [1, 1, 4, 4] },
])!;

describe("buildPageTableLayout", () => {
  it("stacks level grids along z with per-level offsets", () => {
    const layout = buildPageTableLayout(geo3, [64, 64, 40])!;
    expect(layout.levelGrid).toEqual([
      [10, 8, 1],
      [5, 4, 1],
      [3, 2, 1],
    ]);
    expect(layout.stackAxis).toBe(2);
    expect(layout.size).toEqual([10, 8, 3]);
    expect(layout.levelOffset).toEqual([
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 2],
    ]);
  });

  it("falls back to x stacking when the z stack would overflow (deep 2D stacks)", () => {
    // 2 levels of a 512×512×1500 stack in 2D slab mode: 1500 slab bricks per
    // level make z stacking 3000 deep, over the texture limit.
    const geo = buildLayerLevelGeometry(DIMS, LAYER, [
      { shape: [1, 1500, 512, 512], chunks: [1, 1, 256, 256], dtype: "uint8", storeId: "s0" },
      { shape: [1, 1500, 256, 256], chunks: [1, 1, 256, 256], dtype: "uint8", storeId: "s1", scaleFactors: [1, 1, 2, 2] },
    ])!;
    const layout = buildPageTableLayout(geo, [256, 256, 1])!;
    expect(layout.stackAxis).toBe(0);
    expect(layout.size).toEqual([3, 2, 1500]);
    expect(layout.levelOffset).toEqual([
      [0, 0, 0],
      [2, 0, 0],
    ]);
  });

  it("returns null when no stacking axis fits", () => {
    expect(buildPageTableLayout(geo3, [64, 64, 40], 4)).toBeNull();
  });
});

describe("page entry mirrors", () => {
  it("round-trips slot coords and flags through the RGBA8UI encoding", () => {
    const grid = levelPageGrids(geo3, [64, 64, 40])[0];
    const mirror = new Uint8Array(grid[0] * grid[1] * grid[2] * 4);

    const at = pageEntryIndex(grid, [9, 7, 0]);
    encodePageEntry(mirror, at, [3, 2, 1], PAGE_FLAG_RESIDENT);
    expect([...mirror.slice(at * 4, at * 4 + 4)]).toEqual([3, 2, 1, PAGE_FLAG_RESIDENT]);

    encodePageEntry(mirror, at, null, PAGE_FLAG_EMPTY);
    expect([...mirror.slice(at * 4, at * 4 + 4)]).toEqual([0, 0, 0, PAGE_FLAG_EMPTY]);
  });

  it("indexes texels x-fastest, then y, then z", () => {
    expect(pageEntryIndex([10, 8, 2], [0, 0, 0])).toBe(0);
    expect(pageEntryIndex([10, 8, 2], [1, 0, 0])).toBe(1);
    expect(pageEntryIndex([10, 8, 2], [0, 1, 0])).toBe(10);
    expect(pageEntryIndex([10, 8, 2], [0, 0, 1])).toBe(80);
  });
});
