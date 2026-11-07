import { describe, expect, it } from "vitest";
import { axisMapOf, cellAt, MAX_TEXELS, rasterOfCells, rectOf, rgbaOf } from "./gridModel";

describe("axis maps", () => {
  it("reads which layer axis is a world axis, with its scale and offset", () => {
    const affine = { matrix: [[0, 1, 0], [1, 0, 2]], inputAxes: ["c", "cell"], outputAxes: ["cell", "c"] };
    expect(axisMapOf(affine, "cell")).toEqual({ input: "cell", scale: 1, offset: 0 });
    expect(axisMapOf(affine, "c")).toEqual({ input: "c", scale: 1, offset: 2 });
    expect(axisMapOf(affine, "t")).toBeNull();
  });
});

describe("rasters", () => {
  it("spans the members its cells sit at, empty elsewhere", () => {
    const raster = rasterOfCells([0, 0, 2], [5, 6, 5], [1, 2, 3])!;
    expect([raster.rows, raster.cols, raster.row0, raster.col0]).toEqual([3, 2, 0, 5]);
    expect(Array.from(raster.values).map((v) => (Number.isNaN(v) ? null : v))).toEqual([1, 2, null, null, 3, null]);
    expect([raster.lo, raster.hi]).toEqual([1, 3]);
  });
  it("buckets past the texel cap, keeping each bucket's largest", () => {
    const n = MAX_TEXELS * 2;
    const raster = rasterOfCells([0, 0], [0, n - 1], [5, 7])!;
    expect(raster.colStep).toBe(2);
    expect(raster.cols).toBe(MAX_TEXELS);
  });
  it("finds the cell under a point, rows running down", () => {
    const raster = rasterOfCells([0, 1], [0, 0], [4, 9])!;
    expect(cellAt(raster, 0.5, -1.5)).toEqual({ row: 1, col: 0, value: 9 });
    expect(cellAt(raster, 3, -0.5)).toBeNull();
    expect(rectOf(raster)).toEqual({ x0: 0, x1: 1, y0: -2, y1: -0 });
  });
  it("writes the top row last (texture row 0 is the bottom), empty cells transparent", () => {
    const raster = rasterOfCells([0, 1], [0, 1], [0, 1])!;
    const rgba = rgbaOf(raster, 0, 1, (t) => [t, t, t]);
    // texture row 0 = raster row 1: (empty, 1)
    expect(Array.from(rgba.slice(0, 8))).toEqual([0, 0, 0, 0, 255, 255, 255, 255]);
    expect(Array.from(rgba.slice(8, 16))).toEqual([0, 0, 0, 255, 0, 0, 0, 0]);
  });
});
