import { describe, expect, it } from "vitest";
import { buildLayerLevelGeometry, type LevelSource } from "./levelGeometry";

/**
 * Fixture: dims [c, z, y, x] (channel-first, like OME), 3-level pyramid that
 * downsamples x/y but NOT z — the common microscopy case that must degrade
 * into a quadtree along z.
 */
const DIMS = ["c", "z", "y", "x"];
const LAYER = { xAxis: "x", yAxis: "y", zAxis: "z", intensityAxis: "c" };

const LEVELS: LevelSource[] = [
  { shape: [3, 40, 500, 600], chunks: [1, 16, 128, 128], dtype: "uint8", storeId: "s0" },
  {
    shape: [3, 40, 250, 300],
    chunks: [1, 16, 128, 128],
    dtype: "uint8",
    storeId: "s1",
    scaleFactors: [1, 1, 2, 2],
  },
  // No scaleFactors → shape-ratio fallback (600/150 = 4 on x, 40/40 = 1 on z).
  { shape: [3, 40, 125, 150], chunks: [1, 16, 128, 128], dtype: "uint8", storeId: "s2" },
];

describe("buildLayerLevelGeometry", () => {
  it("maps zarr dim order into canonical [x, y, z] spatial extents", () => {
    const geo = buildLayerLevelGeometry(DIMS, LAYER, LEVELS)!;
    expect(geo.levels[0].spatialShape).toEqual([600, 500, 40]);
    expect(geo.levels[0].spatialChunks).toEqual([128, 128, 16]);
    expect(geo.channelCount).toBe(3);
  });

  it("takes per-axis scale from scaleFactors when present", () => {
    const geo = buildLayerLevelGeometry(DIMS, LAYER, LEVELS)!;
    expect(geo.levels[1].scale).toEqual([2, 2, 1]);
  });

  it("falls back to the shape ratio per axis (anisotropic z untouched)", () => {
    const geo = buildLayerLevelGeometry(DIMS, LAYER, LEVELS)!;
    expect(geo.levels[2].scale).toEqual([4, 4, 1]);
  });

  it("treats a layer without a z axis as depth 1", () => {
    const geo = buildLayerLevelGeometry(
      ["y", "x", "c"],
      { xAxis: "x", yAxis: "y", zAxis: null, intensityAxis: "c" },
      [{ shape: [512, 512, 2], chunks: [256, 256, 1], dtype: "float32", storeId: "s0" }],
    )!;
    expect(geo.levels[0].spatialShape).toEqual([512, 512, 1]);
    expect(geo.levels[0].scale).toEqual([1, 1, 1]);
    expect(geo.channelCount).toBe(2);
  });

  it("caps co-resident channels at 16 like the 2D shader", () => {
    const geo = buildLayerLevelGeometry(DIMS, LAYER, [
      { ...LEVELS[0], shape: [40, 40, 500, 600] },
    ])!;
    expect(geo.channelCount).toBe(16);
  });

  it("ignores an intensityAxis that collides with a spatial dim", () => {
    // Seen live: a layer configured with intensityAxis === zAxis === "z" on a
    // single-channel 256³ stack — without the guard this becomes 16 phantom
    // channels that multiply every brick slot and fetch 16×.
    const geo = buildLayerLevelGeometry(
      ["z", "y", "x"],
      { xAxis: "x", yAxis: "y", zAxis: "z", intensityAxis: "z" },
      [{ shape: [256, 256, 256], chunks: [76, 256, 256], dtype: "float32", storeId: "s0" }],
    )!;
    expect(geo.axes.intensityPos).toBe(-1);
    expect(geo.channelCount).toBe(1);
    expect(geo.levels[0].spatialShape).toEqual([256, 256, 256]);
  });

  it("drops duplicate-resolution levels (double level-0 dataArrays)", () => {
    // Real pyramids sometimes ship level 0 twice: once without scaleFactors
    // and once with [1,1,1,1] in a different store. Planning both would
    // double-fetch the full resolution.
    const geo = buildLayerLevelGeometry(DIMS, LAYER, [
      LEVELS[0],
      { ...LEVELS[0], storeId: "s0-duplicate", scaleFactors: [1, 1, 1, 1] },
      LEVELS[1],
    ])!;
    expect(geo.levels).toHaveLength(2);
    expect(geo.levels.map((l) => l.storeId)).toEqual(["s0", "s1"]);
    expect(geo.levels[1].scale).toEqual([2, 2, 1]);
  });

  it("returns null without spatial axes or levels", () => {
    expect(buildLayerLevelGeometry(DIMS, LAYER, [])).toBeNull();
    expect(
      buildLayerLevelGeometry(["a", "b"], { xAxis: "x", yAxis: "y" }, LEVELS),
    ).toBeNull();
  });
});

describe("MAX_BRICK_LEVELS cap (deep pyramids)", () => {
  it("caps the level list at 10 — deeper levels are unreachable by the shader", async () => {
    const { MAX_BRICK_LEVELS } = await import("./levelGeometry");
    // 12-level dyadic pyramid; the shader's traversal uniform arrays and
    // residency walk are sized to MAX_BRICK_LEVELS, so an uncapped geometry
    // made the planner root its backdrop at a level the shader cannot read
    // (deep pyramids rendered invisible with permanent holes).
    const deep: LevelSource[] = Array.from({ length: 12 }, (_, i) => ({
      shape: [3, 40, Math.max(1, 4096 >> i), Math.max(1, 4096 >> i)],
      chunks: [1, 16, 128, 128],
      dtype: "uint8",
      storeId: `d${i}`,
      scaleFactors: [1, 1, 2 ** i, 2 ** i],
    }));
    const geo = buildLayerLevelGeometry(DIMS, LAYER, deep)!;
    expect(geo.levels.length).toBe(MAX_BRICK_LEVELS);
    // The kept levels are the FINEST ten (the dropped tail is coarser).
    expect(geo.levels[0].spatialShape[0]).toBe(4096);
    expect(geo.levels[MAX_BRICK_LEVELS - 1].spatialShape[0]).toBe(4096 >> 9);
  });
});
