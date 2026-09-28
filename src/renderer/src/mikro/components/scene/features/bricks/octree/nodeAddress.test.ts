import { describe, expect, it } from "vitest";
import type { BrickSpec } from "./brickSpec";
import { buildLayerLevelGeometry } from "../../../platform/coords/levelGeometry";
import {
  brickFetchBox,
  brickGridForLevel,
  childrenOf,
  chunksTouchingBrick,
  fetchVoxelBox,
  nodeBaseBox,
  nodeKey,
  nodeVoxelBox,
  parseNodeKey,
  totalBrickCount,
} from "./nodeAddress";

const DIMS = ["c", "z", "y", "x"];
const LAYER = { xAxis: "x", yAxis: "y", zAxis: "z", intensityAxis: "c" };

/** 600×500×40 with x/y-only downsampling — quadtree along z. */
const GEO = buildLayerLevelGeometry(DIMS, LAYER, [
  { shape: [3, 40, 500, 600], chunks: [1, 16, 128, 128], dtype: "uint8", storeId: "s0" },
  { shape: [3, 40, 250, 300], chunks: [1, 16, 128, 128], dtype: "uint8", storeId: "s1", scaleFactors: [1, 1, 2, 2] },
])!;

const SPEC: BrickSpec = {
  payload: [64, 64, 40],
  border: 1,
  stored: [66, 66, 42],
  channelCount: 3,
};

describe("node keys", () => {
  it("round-trips", () => {
    const key = nodeKey(2, [4, 5, 6]);
    expect(key).toBe("2:4:5:6");
    expect(parseNodeKey(key)).toEqual({ level: 2, coords: [4, 5, 6] });
  });
});

describe("node boxes", () => {
  it("computes the level brick grid", () => {
    expect(brickGridForLevel(GEO, SPEC, 0)).toEqual([10, 8, 1]);
    expect(brickGridForLevel(GEO, SPEC, 1)).toEqual([5, 4, 1]);
  });

  it("clamps partial edge bricks to the level shape", () => {
    const box = nodeVoxelBox(GEO, SPEC, 0, [9, 7, 0]);
    expect(box.min).toEqual([576, 448, 0]);
    expect(box.max).toEqual([600, 500, 40]);
  });

  it("expands the fetch box by the border, clamped at volume edges", () => {
    const inner = fetchVoxelBox(GEO, SPEC, 0, [1, 1, 0]);
    expect(inner.min).toEqual([63, 63, 0]);
    expect(inner.max).toEqual([129, 129, 40]);

    const corner = fetchVoxelBox(GEO, SPEC, 0, [0, 0, 0]);
    expect(corner.min).toEqual([0, 0, 0]);
    expect(corner.max).toEqual([65, 65, 40]);
  });

  it("scales the payload box into base voxel space per axis", () => {
    const box = nodeBaseBox(GEO, SPEC, 1, [1, 0, 0]);
    expect(box.min).toEqual([128, 0, 0]);
    expect(box.max).toEqual([256, 128, 40]);
  });
});

describe("childrenOf", () => {
  it("yields the 4 finer bricks of a [2,2,1]-ratio pyramid (quadtree in z)", () => {
    expect(childrenOf(GEO, SPEC, 1, [0, 0, 0])).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ]);
  });

  it("clamps children to the finer grid at the volume edge", () => {
    // Level-1 brick [4,3,0] covers base x [512,600), y [384,500) — its child
    // window is cut off by the 10×8 level-0 grid.
    expect(childrenOf(GEO, SPEC, 1, [4, 3, 0])).toEqual([
      [8, 6, 0],
      [9, 6, 0],
      [8, 7, 0],
      [9, 7, 0],
    ]);
  });

  it("returns nothing at the finest level", () => {
    expect(childrenOf(GEO, SPEC, 0, [0, 0, 0])).toEqual([]);
  });
});

describe("totalBrickCount", () => {
  it("sums every level's grid — the atlas slot ceiling for small datasets", () => {
    // L0: 10×8×1 = 80, L1: 5×4×1 = 20.
    expect(totalBrickCount(GEO, SPEC)).toBe(100);
  });
});

describe("chunksTouchingBrick", () => {
  it("covers the border-expanded box across misaligned chunk grids", () => {
    // Fetch box x/y [63,129) over 128-chunks → chunk 0 and 1 on both axes;
    // z [0,40) over 16-chunks → chunks 0..2.
    const coords = chunksTouchingBrick(GEO, SPEC, 0, [1, 1, 0]);
    expect(coords).toHaveLength(2 * 2 * 3);
    expect(coords[0]).toEqual([0, 0, 0]);
    expect(coords.at(-1)).toEqual([1, 1, 2]);
  });

  it("core phase covers the payload only: 1 chunk on brick-aligned grids vs 27 with the halo", () => {
    // 64³ chunks, 64³ payload, border 1: an interior brick's halo box is
    // [63, 129) per axis → chunks 0..2 → 27; the core box [64, 128) → chunk 1.
    const geo = buildLayerLevelGeometry(DIMS, LAYER, [
      { shape: [1, 256, 256, 256], chunks: [1, 64, 64, 64], dtype: "uint8", storeId: "a0" },
    ])!;
    const spec: BrickSpec = {
      payload: [64, 64, 64],
      border: 1,
      stored: [66, 66, 66],
      channelCount: 1,
    };
    expect(chunksTouchingBrick(geo, spec, 0, [1, 1, 1], "full")).toHaveLength(27);
    expect(chunksTouchingBrick(geo, spec, 0, [1, 1, 1])).toHaveLength(27); // default = full
    expect(chunksTouchingBrick(geo, spec, 0, [1, 1, 1], "core")).toEqual([[1, 1, 1]]);
    // Origin corner: halo clamps at 0 → 2 per axis = 8; core still 1.
    expect(chunksTouchingBrick(geo, spec, 0, [0, 0, 0], "full")).toHaveLength(8);
    expect(chunksTouchingBrick(geo, spec, 0, [0, 0, 0], "core")).toEqual([[0, 0, 0]]);
    // brickFetchBox mirrors the two boxes.
    expect(brickFetchBox(geo, spec, 0, [1, 1, 1], "core")).toEqual(nodeVoxelBox(geo, spec, 0, [1, 1, 1]));
    expect(brickFetchBox(geo, spec, 0, [1, 1, 1], "full")).toEqual(fetchVoxelBox(geo, spec, 0, [1, 1, 1]));
  });

  it("needs a single chunk column when the brick sits inside one chunk", () => {
    const coords = chunksTouchingBrick(GEO, SPEC, 0, [0, 0, 0]);
    // x/y [0,65) fit in chunk 0; z spans 3 chunks.
    expect(coords).toEqual([
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 2],
    ]);
  });
});
