import { describe, expect, it } from "vitest";
import { brickSlotBytes, resolveBrickSpec } from "./brickSpec";
import { buildLayerLevelGeometry, type LevelSource } from "../../../platform/coords/levelGeometry";
import { buildPageTableLayout, levelPageGrids } from "./pageTableLayout";

const DIMS = ["c", "z", "y", "x"];
const LAYER = { xAxis: "x", yAxis: "y", zAxis: "z", intensityAxis: "c" };

const makeGeo = (levels: LevelSource[]) => buildLayerLevelGeometry(DIMS, LAYER, levels)!;

const SHALLOW = makeGeo([
  { shape: [3, 40, 500, 600], chunks: [1, 16, 128, 128], dtype: "uint8", storeId: "s0" },
]);

describe("resolveBrickSpec", () => {
  it("3D: 64³ payload with a 1-voxel border, z clamped to shallow volumes", () => {
    const spec = resolveBrickSpec(SHALLOW, "3D");
    expect(spec.payload).toEqual([64, 64, 40]);
    expect(spec.border).toBe(1);
    expect(spec.stored).toEqual([66, 66, 42]);
    expect(spec.channelCount).toBe(3);
  });

  it("2D: single-slab 256×256 payload without border", () => {
    const spec = resolveBrickSpec(SHALLOW, "2D");
    expect(spec.payload).toEqual([256, 256, 1]);
    expect(spec.border).toBe(0);
    expect(spec.stored).toEqual([256, 256, 1]);
  });

  it("doubles the x/y payload until a gigapixel page grid fits the texture limit", () => {
    const geo = makeGeo([
      { shape: [1, 1, 1000, 1_000_000], chunks: [1, 1, 512, 512], dtype: "uint8", storeId: "s0" },
    ]);
    const spec = resolveBrickSpec(geo, "2D");
    expect(spec.payload).toEqual([512, 256, 1]);
    expect(levelPageGrids(geo, spec.payload)[0][0]).toBeLessThanOrEqual(2048);
  });

  it("keeps single-slab bricks in 2D as long as the z grid fits the limit", () => {
    const geo = makeGeo([
      { shape: [1, 1500, 4096, 4096], chunks: [1, 1, 256, 256], dtype: "uint8", storeId: "s0" },
      { shape: [1, 1500, 2048, 2048], chunks: [1, 1, 256, 256], dtype: "uint8", storeId: "s1", scaleFactors: [1, 1, 2, 2] },
    ]);
    const spec = resolveBrickSpec(geo, "2D", 2048);
    expect(spec.payload[2]).toBe(1);
    expect(buildPageTableLayout(geo, spec.payload, 2048)).not.toBeNull();
  });

  it("doubles the slab axis only when the stack is deeper than the limit", () => {
    const geo = makeGeo([
      { shape: [1, 3000, 4096, 4096], chunks: [1, 1, 256, 256], dtype: "uint8", storeId: "s0" },
      { shape: [1, 3000, 2048, 2048], chunks: [1, 1, 256, 256], dtype: "uint8", storeId: "s1", scaleFactors: [1, 1, 2, 2] },
    ]);
    const spec = resolveBrickSpec(geo, "2D", 2048);
    expect(spec.payload[2]).toBe(2);
    expect(buildPageTableLayout(geo, spec.payload, 2048)).not.toBeNull();
  });

  it("converges in 3D under an artificially tiny texture limit", () => {
    const spec = resolveBrickSpec(SHALLOW, "3D", 4);
    const layout = buildPageTableLayout(SHALLOW, spec.payload, 4);
    expect(layout).not.toBeNull();
  });
});

describe("brickSlotBytes", () => {
  it("accounts for stored extents and channel stacking", () => {
    const spec = resolveBrickSpec(SHALLOW, "3D");
    expect(brickSlotBytes(spec, 1)).toBe(66 * 66 * 42 * 3);
  });
});
