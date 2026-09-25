import { describe, expect, it } from "vitest";
import type { BrickSpec } from "./brickSpec";
import { repackBrick, type RepackChunk } from "./brickRepack";
import { buildLayerLevelGeometry } from "../../../platform/coords/levelGeometry";
import { fetchVoxelBox, nodeVoxelBox } from "./nodeAddress";

/**
 * Fixture: dims [c, z, y, x], one 12×12×4 level with 2 channels, zarr chunks
 * [1, 4, 8, 8] (channel chunks of 1 → one RepackChunk per channel), brick
 * payload 4³ with a 1-voxel border.
 */
const DIMS = ["c", "z", "y", "x"];
const LAYER = { xAxis: "x", yAxis: "y", zAxis: "z", intensityAxis: "c" };
const GEO = buildLayerLevelGeometry(DIMS, LAYER, [
  { shape: [2, 4, 12, 12], chunks: [1, 4, 8, 8], dtype: "uint8", storeId: "s0" },
])!;
const SPEC: BrickSpec = { payload: [4, 4, 4], border: 1, stored: [6, 6, 6], channelCount: 2 };

/** value = c*1000 + z*100 + y*10 + x (global voxel coords) — easy to assert. */
const voxelValue = (c: number, z: number, y: number, x: number) =>
  c * 1000 + z * 100 + y * 10 + x;

const makeChunk = (coords: [number, number, number], channelChunk: number): RepackChunk => {
  const [w, h, d] = [8, 8, 4]; // x, y, z extents of one chunk
  const data = new Float32Array(d * h * w);
  for (let z = 0; z < d; z++)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const gx = coords[0] * 8 + x;
        const gy = coords[1] * 8 + y;
        const gz = coords[2] * 4 + z;
        // Edge chunks carry garbage outside the array — mark it distinctly.
        data[(z * h + y) * w + x] =
          gx < 12 && gy < 12 ? voxelValue(channelChunk, gz, gy, gx) : -999;
      }
  // dims [c, z, y, x] → chunk shape [1, 4, 8, 8], strides [256, 64, 8, 1]
  return {
    coords,
    channelChunk,
    data: data as unknown as RepackChunk["data"],
    shape: [1, 4, 8, 8],
    stride: [256, 64, 8, 1],
  };
};

const repack = (brickCoords: [number, number, number]) => {
  const level = GEO.levels[0];
  const brickBox = nodeVoxelBox(GEO, SPEC, 0, brickCoords);
  const fetchBox = fetchVoxelBox(GEO, SPEC, 0, brickCoords);
  const output = new Float32Array(6 * 6 * 6 * 2);
  const chunks: RepackChunk[] = [];
  for (let channel = 0; channel < 2; channel++)
    for (const cz of [0])
      for (const cy of [0, 1])
        for (const cx of [0, 1]) chunks.push(makeChunk([cx, cy, cz], channel));
  const result = repackBrick({
    spec: SPEC,
    level,
    axes: GEO.axes,
    brickBox,
    fetchBox,
    fixedOffsets: [0, 0, 0, 0],
    chunks,
    output,
  });
  const at = (c: number, z: number, y: number, x: number) =>
    output[((c * 6 + z) * 6 + y) * 6 + x];
  return { output, result, at };
};

describe("repackBrick", () => {
  it("copies the payload with real neighbor data in the borders", () => {
    const { at } = repack([1, 1, 0]);
    // Brick [1,1,0]: payload x,y ∈ [4,8), z ∈ [0,4). Payload voxel (4,4,0) → dest (1+0,…).
    expect(at(0, 1, 1, 1)).toBe(voxelValue(0, 0, 4, 4));
    // Border voxel at dest x=0 is real neighbor data (x=3), crossing chunk 0→0.
    expect(at(0, 1, 1, 0)).toBe(voxelValue(0, 0, 4, 3));
    // Border crossing the chunk boundary at x=8 (chunk 1).
    expect(at(0, 1, 1, 5)).toBe(voxelValue(0, 0, 4, 8));
    // Second channel slab holds channel-1 data.
    expect(at(1, 1, 1, 1)).toBe(voxelValue(1, 0, 4, 4));
  });

  it("replicates edges where the border leaves the volume", () => {
    const { at } = repack([0, 0, 0]);
    // Low corner: border voxels replicate the first real voxel.
    expect(at(0, 1, 1, 0)).toBe(at(0, 1, 1, 1));
    expect(at(0, 1, 0, 1)).toBe(at(0, 1, 1, 1));
    expect(at(0, 0, 1, 1)).toBe(at(0, 1, 1, 1));
    expect(at(0, 0, 0, 0)).toBe(at(0, 1, 1, 1));
  });

  it("replicates past partial edge bricks (12 % 4 = 0, use y-edge at 8..12)", () => {
    // Brick [2,2,0]: payload x,y ∈ [8,12) — the high borders (x=12, y=12) are
    // outside the volume and must replicate, never read the -999 padding.
    const { at, output } = repack([2, 2, 0]);
    expect(at(0, 1, 1, 5)).toBe(at(0, 1, 1, 4));
    expect(at(0, 1, 5, 1)).toBe(at(0, 1, 4, 1));
    expect([...output].includes(-999)).toBe(false);
  });

  it("flags uniform bricks", () => {
    const level = GEO.levels[0];
    const output = new Float32Array(6 * 6 * 6 * 2);
    const flat = makeChunk([0, 0, 0], 0);
    (flat.data as Float32Array).fill(7);
    const flat2 = { ...makeChunk([0, 0, 0], 1) };
    (flat2.data as Float32Array).fill(7);
    const result = repackBrick({
      spec: { ...SPEC, payload: [4, 4, 4] },
      level,
      axes: GEO.axes,
      brickBox: { min: [0, 0, 0], max: [4, 4, 4] },
      fetchBox: { min: [0, 0, 0], max: [5, 5, 4] },
      fixedOffsets: [0, 0, 0, 0],
      chunks: [flat, flat2],
      output,
    });
    expect(result.uniformValue).toBe(7);
  });

  it("returns a zeroed brick when no chunk overlaps", () => {
    const level = GEO.levels[0];
    const output = new Float32Array(6 * 6 * 6 * 2).fill(5);
    const result = repackBrick({
      spec: SPEC,
      level,
      axes: GEO.axes,
      brickBox: { min: [0, 0, 0], max: [4, 4, 4] },
      fetchBox: { min: [0, 0, 0], max: [5, 5, 4] },
      fixedOffsets: [0, 0, 0, 0],
      chunks: [],
      output,
    });
    expect(result.uniformValue).toBe(0);
    expect(output.every((v) => v === 0)).toBe(true);
  });
});

/**
 * Packed channels, c-first: one chunk carries ALL channel slabs
 * ([c,z,y,x] chunked [3,4,8,8] — the scene-15 coarse-level layout, where a
 * [3,1,9,256,256] chunk covers the whole channel axis).
 * `channelsPerChunk = 3`, so slab separation comes ENTIRELY from
 * `stride[intensityPos]` — the one term the per-channel-chunk fixtures above
 * never dereference (`c - chanStart` is always 0 there).
 */
describe("repackBrick (packed channels, one chunk carries all slabs)", () => {
  const P_GEO = buildLayerLevelGeometry(DIMS, LAYER, [
    { shape: [3, 4, 12, 12], chunks: [3, 4, 8, 8], dtype: "uint8", storeId: "p0" },
  ])!;
  const P_SPEC: BrickSpec = { payload: [4, 4, 4], border: 1, stored: [6, 6, 6], channelCount: 3 };

  const makePackedChunk = (coords: [number, number, number]): RepackChunk => {
    const [w, h, d, channels] = [8, 8, 4, 3];
    const data = new Float32Array(channels * d * h * w);
    for (let c = 0; c < channels; c++)
      for (let z = 0; z < d; z++)
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const gx = coords[0] * 8 + x;
            const gy = coords[1] * 8 + y;
            data[((c * d + z) * h + y) * w + x] =
              gx < 12 && gy < 12 ? voxelValue(c, z, gy, gx) : -999;
          }
    // dims [c, z, y, x] → chunk shape [3, 4, 8, 8], C strides.
    return {
      coords,
      channelChunk: 0,
      data: data as unknown as RepackChunk["data"],
      shape: [3, 4, 8, 8],
      stride: [256, 64, 8, 1],
    };
  };

  const repackPacked = (brickCoords: [number, number, number]) => {
    const output = new Float32Array(6 * 6 * 6 * 3);
    const result = repackBrick({
      spec: P_SPEC,
      level: P_GEO.levels[0],
      axes: P_GEO.axes,
      brickBox: nodeVoxelBox(P_GEO, P_SPEC, 0, brickCoords),
      fetchBox: fetchVoxelBox(P_GEO, P_SPEC, 0, brickCoords),
      fixedOffsets: [0, 0, 0, 0],
      chunks: ([[0, 0], [1, 0], [0, 1], [1, 1]] as const).map(([cx, cy]) =>
        makePackedChunk([cx, cy, 0]),
      ),
      output,
    });
    const at = (c: number, z: number, y: number, x: number) =>
      output[((c * 6 + z) * 6 + y) * 6 + x];
    return { output, result, at };
  };

  it("separates channel slabs via the channel stride", () => {
    const { at } = repackPacked([1, 1, 0]);
    for (const c of [0, 1, 2]) {
      // Payload voxel, in-chunk border, and border across a chunk boundary —
      // each slab must hold ITS channel's values (voxelValue's c·1000 band).
      expect(at(c, 1, 1, 1)).toBe(voxelValue(c, 0, 4, 4));
      expect(at(c, 1, 1, 0)).toBe(voxelValue(c, 0, 4, 3));
      expect(at(c, 1, 1, 5)).toBe(voxelValue(c, 0, 4, 8));
      // z border leaves the volume on both sides: replicate within the slab.
      expect(at(c, 0, 1, 1)).toBe(at(c, 1, 1, 1));
      expect(at(c, 5, 1, 1)).toBe(at(c, 4, 1, 1));
    }
  });

  it("never leaks one channel's data into another slab", () => {
    const { output } = repackPacked([1, 1, 0]);
    const slabSize = 6 * 6 * 6;
    for (let c = 0; c < 3; c++) {
      const slab = output.subarray(c * slabSize, (c + 1) * slabSize);
      expect(slab.every((v) => v >= c * 1000 && v < c * 1000 + 1000)).toBe(true);
    }
  });

  it("flags uniform only when EVERY slab holds the same value", () => {
    const chunk = makePackedChunk([0, 0, 0]);
    (chunk.data as Float32Array).fill(7);
    // Channel 2's slab differs: NOT uniform.
    (chunk.data as Float32Array).fill(9, 2 * 4 * 8 * 8);
    const output = new Float32Array(6 * 6 * 6 * 3);
    const result = repackBrick({
      spec: P_SPEC,
      level: P_GEO.levels[0],
      axes: P_GEO.axes,
      brickBox: { min: [0, 0, 0], max: [4, 4, 4] },
      fetchBox: { min: [0, 0, 0], max: [5, 5, 4] },
      fixedOffsets: [0, 0, 0, 0],
      chunks: [chunk],
      output,
    });
    expect(result.uniformValue).toBeNull();
    expect(result.min).toBe(7);
    expect(result.max).toBe(9);
  });
});

/**
 * Interleaved channels, c-last: dims [y, x, c] (the scene-2 "astronaut rgb"
 * layout) — no z axis (`zPos = -1`, strideZ 0) and `strideC = 1`, so every
 * pixel's channels sit adjacent in memory and slab extraction is a
 * de-interleave.
 */
describe("repackBrick (interleaved c-last channels)", () => {
  const I_DIMS = ["y", "x", "c"];
  const I_LAYER = { xAxis: "x", yAxis: "y", zAxis: null, intensityAxis: "c" };
  const I_GEO = buildLayerLevelGeometry(I_DIMS, I_LAYER, [
    { shape: [12, 12, 3], chunks: [8, 8, 3], dtype: "uint8", storeId: "i0" },
  ])!;
  const I_SPEC: BrickSpec = { payload: [4, 4, 1], border: 0, stored: [4, 4, 1], channelCount: 3 };

  const makeInterleavedChunk = (coords: [number, number, number]): RepackChunk => {
    const data = new Float32Array(8 * 8 * 3);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        for (let c = 0; c < 3; c++) {
          const gx = coords[0] * 8 + x;
          const gy = coords[1] * 8 + y;
          data[(y * 8 + x) * 3 + c] = gx < 12 && gy < 12 ? voxelValue(c, 0, gy, gx) : -999;
        }
    return {
      coords,
      channelChunk: 0,
      data: data as unknown as RepackChunk["data"],
      shape: [8, 8, 3],
      stride: [24, 3, 1],
    };
  };

  const repackInterleaved = (brickCoords: [number, number, number]) => {
    const output = new Float32Array(4 * 4 * 1 * 3);
    const result = repackBrick({
      spec: I_SPEC,
      level: I_GEO.levels[0],
      axes: I_GEO.axes,
      brickBox: nodeVoxelBox(I_GEO, I_SPEC, 0, brickCoords),
      fetchBox: fetchVoxelBox(I_GEO, I_SPEC, 0, brickCoords),
      fixedOffsets: [0, 0, 0],
      chunks: ([[0, 0], [1, 0], [0, 1], [1, 1]] as const).map(([cx, cy]) =>
        makeInterleavedChunk([cx, cy, 0]),
      ),
      output,
    });
    const at = (c: number, y: number, x: number) => output[(c * 4 + y) * 4 + x];
    return { output, result, at };
  };

  it("de-interleaves per-pixel channels into slabs", () => {
    const { at } = repackInterleaved([1, 1, 0]);
    for (const c of [0, 1, 2]) {
      expect(at(c, 0, 0)).toBe(voxelValue(c, 0, 4, 4));
      expect(at(c, 3, 3)).toBe(voxelValue(c, 0, 7, 7));
    }
    // A brick in another spatial chunk, partially past the 12-wide volume.
    const edge = repackInterleaved([2, 2, 0]);
    for (const c of [0, 1, 2]) {
      expect(edge.at(c, 0, 0)).toBe(voxelValue(c, 0, 8, 8));
      expect(edge.at(c, 3, 3)).toBe(voxelValue(c, 0, 11, 11));
    }
    expect([...edge.output].includes(-999)).toBe(false);
  });
});
