import { describe, expect, it } from "vitest";
import { repackBrick, type RepackChunk } from "../octree/brickRepack";
import type { BrickSpec } from "../octree/brickSpec";
import { buildLayerLevelGeometry } from "../../../platform/coords/levelGeometry";
import { fetchVoxelBox, nodeVoxelBox } from "../octree/nodeAddress";
import { R16F_DATA_SCALE } from "../octree/atlasFormat";
import { encodeHalfArray, floatToHalfBits } from "../octree/halfFloat";
import { interleaveSlabsRgba8 } from "../octree/rgbaPack";
import {
  MINMAX_INIT_MAX,
  MINMAX_INIT_MIN,
  buildKernelDispatches,
  decodeMinMax,
  decodeMinMaxU8,
  decodeOrderedF32,
  decodeSlabRanges,
  dispatchWorkgroups,
  encodeOrderedF32,
  ownedGridBox,
  REPACK_KERNEL_R16_U16_WGSL,
  REPACK_KERNEL_R16_WGSL,
  REPACK_KERNEL_R8_WGSL,
  REPACK_KERNEL_RGBA8_WGSL,
  REPACK_KERNEL_WGSL,
  REPACK_WORKGROUP_SIZE,
  arenaJobLayout,
  arenaJobLayoutForKind,
  packKernelParams,
  r8JobLayout,
  type KernelDispatch,
  type RepackDispatchInput,
} from "./repackKernel";

/**
 * Parity: a TS simulator executes buildKernelDispatches' output with EXACTLY
 * the kernel's per-invocation algorithm (clamp → ownership → strided read →
 * ordered-u32 min/max) and must reproduce `repackBrick` — output buffer,
 * min/max, and uniform flag. The golden-buffer-tested CPU repack defines
 * truth; this pins the dispatch math the WGSL side consumes. The in-browser
 * self-test covers the WGSL itself.
 */

// Same fixture family as brickRepack.test.ts: dims [c, z, y, x], one
// 12×12×4 level with 2 channels, chunks [1, 4, 8, 8], payload 4³ + border.
const DIMS = ["c", "z", "y", "x"];
const LAYER = { xAxis: "x", yAxis: "y", zAxis: "z", intensityAxis: "c" };
const GEO = buildLayerLevelGeometry(DIMS, LAYER, [
  { shape: [2, 4, 12, 12], chunks: [1, 4, 8, 8], dtype: "float32", storeId: "s0" },
])!;
const SPEC: BrickSpec = { payload: [4, 4, 4], border: 1, stored: [6, 6, 6], channelCount: 2 };

const voxelValue = (c: number, z: number, y: number, x: number) =>
  c * 1000 + z * 100 + y * 10 + x;

const makeChunk = (coords: [number, number, number], channelChunk: number): RepackChunk => {
  const [w, h, d] = [8, 8, 4];
  const data = new Float32Array(d * h * w);
  for (let z = 0; z < d; z++)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const gx = coords[0] * 8 + x;
        const gy = coords[1] * 8 + y;
        const gz = coords[2] * 4 + z;
        data[(z * h + y) * w + x] =
          gx < 12 && gy < 12 ? voxelValue(channelChunk, gz, gy, gx) : -999;
      }
  return {
    coords,
    channelChunk,
    data: data as unknown as RepackChunk["data"],
    shape: [1, 4, 8, 8],
    stride: [256, 64, 8, 1],
  };
};

const makeInput = (brickCoords: [number, number, number]): RepackDispatchInput => {
  const chunks: RepackChunk[] = [];
  for (let channel = 0; channel < 2; channel++)
    for (const cy of [0, 1]) for (const cx of [0, 1]) chunks.push(makeChunk([cx, cy, 0], channel));
  return {
    spec: SPEC,
    level: GEO.levels[0],
    axes: GEO.axes,
    brickBox: nodeVoxelBox(GEO, SPEC, 0, brickCoords),
    fetchBox: fetchVoxelBox(GEO, SPEC, 0, brickCoords),
    fixedOffsets: [0, 0, 0, 0],
    chunks,
  };
};

const clampI = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * Execute one dispatch exactly as the WGSL kernel does, per invocation —
 * INCLUDING the grid geometry, so a wrong `ownedGridBox` shows up here as
 * dropped or duplicated texels rather than as silent corruption on the GPU.
 *
 * The loop bounds mirror `dispatchWorkgroups` (workgroup-rounded, hence the
 * tail that the in-kernel guards must still reject) and the index decode
 * mirrors the kernel's `grid_origin`/`z_span` arithmetic.
 *
 * `writes` counts texel coverage so the ownership-partition invariant (every
 * texel written exactly once across a brick's dispatches) is checked.
 */
function simulateDispatch(
  d: KernelDispatch,
  chunkData: Float32Array,
  out: Float32Array,
  writes: Uint8Array,
  minmax: { min: number; max: number },
): void {
  const [sx, sy, sz] = d.stored;
  const wg = REPACK_WORKGROUP_SIZE;
  const groups = dispatchWorkgroups(d);
  const span = Math.max(1, d.gridSize[2]);
  const channels = Math.max(0, d.chanEnd - d.chanStart);
  // Workgroup-rounded extents: the real invocation counts the GPU launches.
  const nx = groups[0] * wg;
  const ny = groups[1] * wg;
  const nz = groups[2] * wg;
  expect(nz).toBeGreaterThanOrEqual(span * channels);

  for (let gz = 0; gz < nz; gz++) {
    const c = d.chanStart + Math.floor(gz / span);
    const z = d.gridOrigin[2] + (gz % span);
    for (let gy = 0; gy < ny; gy++) {
      const y = d.gridOrigin[1] + gy;
      for (let gx = 0; gx < nx; gx++) {
        const x = d.gridOrigin[0] + gx;
        // The kernel's range guards (tail of the workgroup rounding).
        if (x >= sx || y >= sy || z >= sz || c >= d.chanEnd) continue;
        const g = [
          clampI(d.destOrigin[0] + x, d.fetchMin[0], d.fetchMax[0] - 1),
          clampI(d.destOrigin[1] + y, d.fetchMin[1], d.fetchMax[1] - 1),
          clampI(d.destOrigin[2] + z, d.fetchMin[2], d.fetchMax[2] - 1),
        ];
        const owned =
          g[0] >= d.lo[0] && g[0] < d.hi[0] &&
          g[1] >= d.lo[1] && g[1] < d.hi[1] &&
          g[2] >= d.lo[2] && g[2] < d.hi[2] &&
          c >= d.chanStart;
        if (!owned) continue;
        const src =
          d.fixedBase +
          (c - d.chanStart) * d.strideC +
          (g[2] - d.chunkOrigin[2]) * d.strideZ +
          (g[1] - d.chunkOrigin[1]) * d.strideY +
          (g[0] - d.chunkOrigin[0]) * d.strideX;
        const value = chunkData[src];
        const dest = ((c * sz + z) * sy + y) * sx + x;
        out[dest] = value;
        writes[dest] += 1;
        if (value === value) {
          const encoded = encodeOrderedF32(value);
          if (encoded < minmax.min) minmax.min = encoded;
          if (encoded > minmax.max) minmax.max = encoded;
        }
      }
    }
  }
}

const brickElementCount = (input: RepackDispatchInput) =>
  input.spec.stored[0] * input.spec.stored[1] * input.spec.stored[2] * input.spec.channelCount;

function simulateBrick(input: RepackDispatchInput) {
  const elementCount = brickElementCount(input);
  const out = new Float32Array(elementCount);
  const writes = new Uint8Array(elementCount);
  const minmax = { min: MINMAX_INIT_MIN, max: MINMAX_INIT_MAX };
  const dispatches = buildKernelDispatches(input, [0, 0, 0], 0);
  for (const d of dispatches) {
    simulateDispatch(d, input.chunks[d.chunkIndex].data as Float32Array, out, writes, minmax);
  }
  return { out, writes, dispatches, ...decodeMinMax(minmax.min, minmax.max) };
}

function cpuBrick(input: RepackDispatchInput) {
  const output = new Float32Array(brickElementCount(input));
  const result = repackBrick({ ...input, output });
  return { output, result };
}

describe("buildKernelDispatches parity with repackBrick", () => {
  // Corner (all-low replication), interior (real borders across chunks),
  // volume edge (high-side replication past partial chunks).
  it.each([[[0, 0, 0]], [[1, 1, 0]], [[2, 2, 0]]] as [[number, number, number]][])(
    "brick %j matches the CPU repack voxel-for-voxel",
    (brickCoords) => {
      const input = makeInput(brickCoords);
      const gpu = simulateBrick(input);
      const cpu = cpuBrick(input);

      expect([...gpu.out]).toEqual([...cpu.output]);
      expect(gpu.min).toBe(cpu.result.min);
      expect(gpu.max).toBe(cpu.result.max);
      expect(gpu.uniformValue).toBe(cpu.result.uniformValue);
    },
  );

  /**
   * The precondition behind `GpuFlushOutcome.unsupported`. When no chunk
   * overlaps the brick, `buildKernelDispatches` returns EMPTY — and does so
   * deterministically, which is why retrying such a job on the GPU path can
   * never succeed. `brickResidency` used to requeue it into `pendingFetch`
   * unconditionally (a per-job failure does not set `broken`), so the brick
   * unmapped and refilled its page entry forever with no camera motion.
   */
  it("returns NO dispatches when no chunk overlaps, deterministically", () => {
    const input = makeInput([0, 0, 0]);
    const disjoint = { ...input, chunks: [] };
    expect(buildKernelDispatches(disjoint, [0, 0, 0], 0)).toEqual([]);
    // Same input, same (empty) answer — a retry cannot change the outcome.
    expect(buildKernelDispatches(disjoint, [0, 0, 0], 0)).toEqual([]);
  });

  it("ownership partitions every output texel across dispatches exactly once", () => {
    const gpu = simulateBrick(makeInput([1, 1, 0]));
    expect(gpu.dispatches.length).toBeGreaterThan(1); // fixture straddles chunks
    expect([...gpu.writes].every((count) => count === 1)).toBe(true);
  });

  it("skips chunks that do not overlap the fetch box (CPU `continue` parity)", () => {
    // Brick [0,0,0]'s fetch box ([0,5) on x/y after clamping) lies entirely
    // inside spatial chunk [0,0] — of the 8 chunks provided, only that one
    // survives per channel.
    const dispatches = buildKernelDispatches(makeInput([0, 0, 0]), [0, 0, 0], 0);
    expect(dispatches.length).toBe(2);
    // Brick [1,1,0] (fetch [3,9) on x/y) straddles all four spatial chunks.
    expect(buildKernelDispatches(makeInput([1, 1, 0]), [0, 0, 0], 0).length).toBe(8);
  });

  it("flags uniform bricks through the min/max readback", () => {
    const input = makeInput([0, 0, 0]);
    for (const chunk of input.chunks) (chunk.data as Float32Array).fill(7);
    const gpu = simulateBrick(input);
    expect(gpu.uniformValue).toBe(7);
  });

  it("ignores NaN in min/max like the CPU scan", () => {
    const input = makeInput([0, 0, 0]);
    (input.chunks[0].data as Float32Array)[0] = Number.NaN;
    const gpu = simulateBrick(input);
    const cpu = cpuBrick(input);
    expect(gpu.min).toBe(cpu.result.min);
    expect(gpu.max).toBe(cpu.result.max);
    // The NaN itself lands in the output on both paths.
    expect(Number.isNaN(gpu.out[0])).toBe(Number.isNaN(cpu.output[0]));
  });

  it("maps untouched min/max sentinels to the CPU's all-NaN outcome", () => {
    expect(decodeMinMax(MINMAX_INIT_MIN, MINMAX_INIT_MAX)).toEqual({
      min: 0,
      max: 0,
      uniformValue: 0,
    });
  });
});

describe("buildKernelDispatches parity — packed & interleaved channel layouts", () => {
  // Packed c-first: one chunk carries ALL channel slabs (scene-15 coarse
  // levels). channelsPerChunk = 3 → slab separation rests entirely on
  // stride[intensityPos], which the channel-per-chunk fixtures never use.
  const packedInput = (): RepackDispatchInput => {
    const geo = buildLayerLevelGeometry(DIMS, LAYER, [
      { shape: [3, 4, 12, 12], chunks: [3, 4, 8, 8], dtype: "float32", storeId: "p0" },
    ])!;
    const spec: BrickSpec = { payload: [4, 4, 4], border: 1, stored: [6, 6, 6], channelCount: 3 };
    const chunks: RepackChunk[] = ([[0, 0], [1, 0], [0, 1], [1, 1]] as const).map(([cx, cy]) => {
      const data = new Float32Array(3 * 4 * 8 * 8);
      for (let c = 0; c < 3; c++)
        for (let z = 0; z < 4; z++)
          for (let y = 0; y < 8; y++)
            for (let x = 0; x < 8; x++) {
              const gx = cx * 8 + x;
              const gy = cy * 8 + y;
              data[((c * 4 + z) * 8 + y) * 8 + x] =
                gx < 12 && gy < 12 ? voxelValue(c, z, gy, gx) : -999;
            }
      return {
        coords: [cx, cy, 0] as [number, number, number],
        channelChunk: 0,
        data: data as unknown as RepackChunk["data"],
        shape: [3, 4, 8, 8],
        stride: [256, 64, 8, 1],
      };
    });
    return {
      spec,
      level: geo.levels[0],
      axes: geo.axes,
      brickBox: nodeVoxelBox(geo, spec, 0, [1, 1, 0]),
      fetchBox: fetchVoxelBox(geo, spec, 0, [1, 1, 0]),
      fixedOffsets: [0, 0, 0, 0],
      chunks,
    };
  };

  // Interleaved c-last: dims [y, x, c] (scene-2 astronaut layout) — no z
  // axis (zPos = -1, strideZ 0) and strideC = 1.
  const interleavedInput = (): RepackDispatchInput => {
    const geo = buildLayerLevelGeometry(
      ["y", "x", "c"],
      { xAxis: "x", yAxis: "y", zAxis: null, intensityAxis: "c" },
      [{ shape: [12, 12, 3], chunks: [8, 8, 3], dtype: "float32", storeId: "i0" }],
    )!;
    const spec: BrickSpec = { payload: [4, 4, 1], border: 0, stored: [4, 4, 1], channelCount: 3 };
    const chunks: RepackChunk[] = ([[0, 0], [1, 0], [0, 1], [1, 1]] as const).map(([cx, cy]) => {
      const data = new Float32Array(8 * 8 * 3);
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++)
          for (let c = 0; c < 3; c++) {
            const gx = cx * 8 + x;
            const gy = cy * 8 + y;
            data[(y * 8 + x) * 3 + c] = gx < 12 && gy < 12 ? voxelValue(c, 0, gy, gx) : -999;
          }
      return {
        coords: [cx, cy, 0] as [number, number, number],
        channelChunk: 0,
        data: data as unknown as RepackChunk["data"],
        shape: [8, 8, 3],
        stride: [24, 3, 1],
      };
    });
    return {
      spec,
      level: geo.levels[0],
      axes: geo.axes,
      brickBox: nodeVoxelBox(geo, spec, 0, [1, 1, 0]),
      fetchBox: fetchVoxelBox(geo, spec, 0, [1, 1, 0]),
      fixedOffsets: [0, 0, 0],
      chunks,
    };
  };

  it.each([
    ["packed c-first", packedInput],
    ["interleaved c-last", interleavedInput],
  ])("%s matches the CPU repack voxel-for-voxel", (_label, makeIt) => {
    const input = makeIt();
    const gpu = simulateBrick(input);
    const cpu = cpuBrick(input);
    expect([...gpu.out]).toEqual([...cpu.output]);
    expect(gpu.min).toBe(cpu.result.min);
    expect(gpu.max).toBe(cpu.result.max);
    expect(gpu.uniformValue).toBe(cpu.result.uniformValue);
    expect([...gpu.writes].every((count) => count === 1)).toBe(true);
  });
});

describe("r8 kernel parity with repackBrick", () => {
  // Same geometry family, uint8 dtype: 2 channels, 2×2 spatial chunks.
  const GEO8 = buildLayerLevelGeometry(DIMS, LAYER, [
    { shape: [2, 4, 12, 12], chunks: [1, 4, 8, 8], dtype: "uint8", storeId: "u0" },
  ])!;

  const u8Value = (c: number, z: number, y: number, x: number) =>
    (c * 90 + z * 25 + y * 7 + x * 3) % 256;

  const makeU8Chunk = (coords: [number, number, number], channelChunk: number): RepackChunk => {
    const [w, h, d] = [8, 8, 4];
    const data = new Uint8Array(d * h * w);
    for (let z = 0; z < d; z++)
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const gx = coords[0] * 8 + x;
          const gy = coords[1] * 8 + y;
          const gz = coords[2] * 4 + z;
          data[(z * h + y) * w + x] =
            gx < 12 && gy < 12 ? u8Value(channelChunk, gz, gy, gx) : 255;
        }
    return {
      coords,
      channelChunk,
      data: data as unknown as RepackChunk["data"],
      shape: [1, 4, 8, 8],
      stride: [256, 64, 8, 1],
    };
  };

  const makeU8Input = (brickCoords: [number, number, number]): RepackDispatchInput => {
    const chunks: RepackChunk[] = [];
    for (let channel = 0; channel < 2; channel++)
      for (const cy of [0, 1])
        for (const cx of [0, 1]) chunks.push(makeU8Chunk([cx, cy, 0], channel));
    return {
      spec: SPEC,
      level: GEO8.levels[0],
      axes: GEO8.axes,
      brickBox: nodeVoxelBox(GEO8, SPEC, 0, brickCoords),
      fetchBox: fetchVoxelBox(GEO8, SPEC, 0, brickCoords),
      fixedOffsets: [0, 0, 0, 0],
      chunks,
    };
  };

  /**
   * Execute the r8 kernel per invocation: same clamp/ownership as the f32
   * simulator, but the source index reads BYTES and the output is packed
   * 4-per-u32 into a padded-row arena at a non-zero base — exactly the
   * `out_base_word`/`row_words` addressing the WGSL uses — then unpacked for
   * the voxel-for-voxel compare.
   */
  function simulateBrickR8(input: RepackDispatchInput) {
    const [sx, sy, sz] = input.spec.stored;
    const { rowBytes, imageRows, images, jobBytes } = r8JobLayout(
      input.spec.stored,
      input.spec.channelCount,
    );
    const rowWords = rowBytes / 4;
    const baseWord = 64; // non-zero arena base exercises out_base_word
    const arena = new Uint32Array(baseWord + jobBytes / 4);
    const elementCount = brickElementCount(input);
    const writes = new Uint8Array(elementCount);
    const minmax = { min: MINMAX_INIT_MIN, max: MINMAX_INIT_MAX };
    const dispatches = buildKernelDispatches(input, [0, 0, 0], 0);

    for (const d of dispatches) {
      const bytes = input.chunks[d.chunkIndex].data as Uint8Array;
      for (let gz = 0; gz < sz * d.channelCount; gz++) {
        const c = Math.floor(gz / sz);
        const z = gz % sz;
        for (let y = 0; y < sy; y++) {
          for (let x = 0; x < sx; x++) {
            const g = [
              clampI(d.destOrigin[0] + x, d.fetchMin[0], d.fetchMax[0] - 1),
              clampI(d.destOrigin[1] + y, d.fetchMin[1], d.fetchMax[1] - 1),
              clampI(d.destOrigin[2] + z, d.fetchMin[2], d.fetchMax[2] - 1),
            ];
            const owned =
              g[0] >= d.lo[0] && g[0] < d.hi[0] &&
              g[1] >= d.lo[1] && g[1] < d.hi[1] &&
              g[2] >= d.lo[2] && g[2] < d.hi[2] &&
              c >= d.chanStart && c < d.chanEnd;
            if (!owned) continue;
            const src =
              d.fixedBase +
              (c - d.chanStart) * d.strideC +
              (g[2] - d.chunkOrigin[2]) * d.strideZ +
              (g[1] - d.chunkOrigin[1]) * d.strideY +
              (g[0] - d.chunkOrigin[0]) * d.strideX;
            const value = bytes[src];
            const word = baseWord + ((c * sz + z) * sy + y) * rowWords + (x >> 2);
            arena[word] |= value << (8 * (x & 3));
            writes[((c * sz + z) * sy + y) * sx + x] += 1;
            if (value < minmax.min) minmax.min = value;
            if (value > minmax.max) minmax.max = value;
          }
        }
      }
    }

    // Unpack the padded rows the way copyBufferToTexture reads them.
    const out = new Uint8Array(elementCount);
    for (let image = 0; image < images; image++)
      for (let y = 0; y < imageRows; y++)
        for (let x = 0; x < sx; x++) {
          out[(image * sy + y) * sx + x] =
            (arena[baseWord + (image * sy + y) * rowWords + (x >> 2)] >>> (8 * (x & 3))) & 0xff;
        }
    return { out, writes, dispatches, ...decodeMinMaxU8(minmax.min, minmax.max) };
  }

  it.each([[[0, 0, 0]], [[1, 1, 0]], [[2, 2, 0]]] as [[number, number, number]][])(
    "brick %j matches the CPU repack voxel-for-voxel through the packed arena",
    (brickCoords) => {
      const input = makeU8Input(brickCoords);
      const gpu = simulateBrickR8(input);
      const output = new Uint8Array(brickElementCount(input));
      const cpu = repackBrick({ ...input, output });

      expect([...gpu.out]).toEqual([...output]);
      expect(gpu.min).toBe(cpu.min);
      expect(gpu.max).toBe(cpu.max);
      expect(gpu.uniformValue).toBe(cpu.uniformValue);
      expect([...gpu.writes].every((count) => count === 1)).toBe(true);
    },
  );

  it("flags uniform u8 bricks through the raw min/max readback", () => {
    const input = makeU8Input([0, 0, 0]);
    for (const chunk of input.chunks) (chunk.data as Uint8Array).fill(7);
    expect(simulateBrickR8(input).uniformValue).toBe(7);
  });

  it("pads rows to the copyBufferToTexture alignment", () => {
    // stored x of 6 → one 256-byte row per (y, image); job size covers every
    // image of every channel slab and stays 256-aligned.
    expect(r8JobLayout([6, 6, 6], 2)).toEqual({
      rowBytes: 256,
      imageRows: 6,
      images: 12,
      jobBytes: 256 * 6 * 12,
    });
    expect(r8JobLayout([256, 256, 1], 3)).toEqual({
      rowBytes: 256,
      imageRows: 256,
      images: 3,
      jobBytes: 256 * 256 * 3,
    });
  });

  it("decodes u8 min/max words raw, sentinels to the all-empty outcome", () => {
    expect(decodeMinMaxU8(MINMAX_INIT_MIN, MINMAX_INIT_MAX)).toEqual({
      min: 0,
      max: 0,
      uniformValue: 0,
    });
    expect(decodeMinMaxU8(7, 7)).toEqual({ min: 7, max: 7, uniformValue: 7 });
    expect(decodeMinMaxU8(3, 250)).toEqual({ min: 3, max: 250, uniformValue: null });
  });
});

describe("ordered f32 encoding", () => {
  it("roundtrips and preserves order across sign, zero, and infinities", () => {
    // All values must be exactly f32-representable (the encode goes through
    // a Float32 view); f64-only denormals like Number.MIN_VALUE round to ±0.
    const values = [
      Number.NEGATIVE_INFINITY, -3.5e8, -1, -1e-38, 0, 1e-38,
      0.5, 1, 65535, 3.5e8, Number.POSITIVE_INFINITY,
    ].map(Math.fround);
    const encoded = values.map(encodeOrderedF32);
    for (const [i, value] of values.entries()) {
      expect(decodeOrderedF32(encoded[i])).toBe(value);
    }
    expect([...encoded].sort((a, b) => a - b)).toEqual(encoded);
  });
});

describe("packKernelParams", () => {
  it("packs the 40-word struct layout, i32 fields as wrapped bit patterns", () => {
    const [d] = buildKernelDispatches(makeInput([0, 0, 0]), [12, 18, 24], 3);
    expect(d.destOrigin).toEqual([-1, -1, -1]); // corner brick: border leaves the volume
    const words = new Uint32Array(44); // deliberately larger: offset write
    packKernelParams(d, words, 4);
    const signed = new Int32Array(words.buffer);
    expect([signed[4], signed[5], signed[6]]).toEqual([-1, -1, -1]); // dest_origin
    expect(words[4 + 3]).toBe(6); // stored_z
    expect([words[4 + 4], words[4 + 5]]).toEqual([6, 6]); // stored_xy
    expect(words[4 + 6]).toBe(2); // channel_count
    expect(words[4 + 7]).toBe(3); // brick_index
    expect([words[4 + 28], words[4 + 29], words[4 + 30]]).toEqual([12, 18, 24]); // slot_origin
    expect([words[4 + 33], words[4 + 34]]).toEqual([0, 0]); // r8 addressing defaults
    expect(words[4 + 35]).toBe(3); // minmax_base (defaults to brick_index)
    expect([words[4 + 36], words[4 + 37], words[4 + 38]]).toEqual([...d.gridOrigin]);
    expect(words[4 + 39]).toBe(d.gridSize[2]); // z_span
    expect(words[0]).toBe(0); // untouched before the offset
  });

  it("packs the r8 arena addressing into words 33/34", () => {
    const [d] = buildKernelDispatches(makeInput([0, 0, 0]), [0, 0, 0], 0);
    const words = new Uint32Array(40);
    packKernelParams(d, words, 0, { outBaseWord: 123, rowWords: 64 });
    expect(words[33]).toBe(123); // out_base_word
    expect(words[34]).toBe(64); // row_words
  });

  it("covers only the OWNED sub-box, not the whole stored brick", () => {
    const [d] = buildKernelDispatches(makeInput([0, 0, 0]), [0, 0, 0], 0);
    // Stored brick is 6³ over 2 channels; covering all of it per chunk would be
    // ceil(6/4), ceil(6/4), ceil(6*2/4) = [2, 2, 3]. This chunk owns one
    // channel, so z shrinks to ceil(zSpan * 1 / 4).
    const channels = d.chanEnd - d.chanStart;
    expect(channels).toBe(1);
    expect(dispatchWorkgroups(d)).toEqual([
      Math.ceil(d.gridSize[0] / 4),
      Math.ceil(d.gridSize[1] / 4),
      Math.ceil((d.gridSize[2] * channels) / 4),
    ]);
    expect(dispatchWorkgroups(d)[2]).toBeLessThan(3);
  });
});

describe("ownedGridBox", () => {
  const box = (over: Partial<Parameters<typeof ownedGridBox>[0]> = {}) =>
    ownedGridBox({
      destOrigin: [0, 0, 0],
      stored: [8, 8, 8],
      fetchMin: [0, 0, 0],
      fetchMax: [8, 8, 8],
      lo: [0, 0, 0],
      hi: [8, 8, 8],
      ...over,
    });

  it("covers the whole brick when one chunk owns all of it", () => {
    expect(box()).toEqual({ gridOrigin: [0, 0, 0], gridSize: [8, 8, 8] });
  });

  it("narrows to the overlap when a chunk owns only part of an axis", () => {
    // Chunk covers z in [0, 4) of a fetch box spanning [0, 8).
    expect(box({ hi: [8, 8, 4] })).toEqual({
      gridOrigin: [0, 0, 0],
      gridSize: [8, 8, 4],
    });
    // ...and the complementary chunk owns the other half.
    expect(box({ lo: [0, 0, 4] })).toEqual({
      gridOrigin: [0, 0, 4],
      gridSize: [8, 8, 4],
    });
  });

  it("gives leading border texels to the chunk whose lo sits at fetchMin", () => {
    // destOrigin -1 = the brick's border starts one voxel outside the volume;
    // those texels clamp UP to fetchMin, so they belong to this chunk alone.
    const owned = box({ destOrigin: [-1, -1, -1], lo: [0, 0, 0], hi: [4, 4, 4] });
    expect(owned?.gridOrigin).toEqual([0, 0, 0]);
    // Owned up to and including the texel mapping to voxel 3 → p = 4, size 5.
    expect(owned?.gridSize).toEqual([5, 5, 5]);
  });

  it("gives trailing border texels to the chunk whose hi sits at fetchMax", () => {
    // fetchMax 4 with an 8-deep brick: texels past p=4 clamp DOWN to voxel 3.
    const owned = box({ fetchMax: [4, 4, 4], lo: [2, 2, 2], hi: [4, 4, 4] });
    expect(owned?.gridOrigin).toEqual([2, 2, 2]);
    expect(owned?.gridSize).toEqual([6, 6, 6]); // through the end of the brick
  });

  it("returns null when the chunk owns no texel of this brick", () => {
    // Overlap sits entirely beyond the brick's destination window.
    expect(box({ lo: [16, 0, 0], hi: [24, 8, 8] })).toBeNull();
  });
});

describe("per-slab min/max (minmax_base + decodeSlabRanges)", () => {
  it("lays a batch out by running slab count, not brick × slabs", () => {
    // Two bricks: 2 slabs then 3 slabs — the second brick's entries start at 2.
    const a = buildKernelDispatches(makeInput([0, 0, 0]), [0, 0, 0], 0, 0);
    const b = buildKernelDispatches(makeInput([1, 1, 0]), [0, 0, 0], 1, 2);
    expect(a.every((d) => d.minmaxBase === 0)).toBe(true);
    expect(b.every((d) => d.minmaxBase === 2)).toBe(true);
    const words = new Uint32Array(40);
    packKernelParams(b[0], words, 0);
    expect(words[35]).toBe(2);
  });

  it("decodes per-slab brackets and their union, with sentinel slabs taking the union", () => {
    const words = new Uint32Array(3 * 2);
    // slab 0: [encode(2), encode(9)]; slab 1: sentinels; slab 2: [encode(-1), encode(4)]
    words[0] = encodeOrderedF32(2);
    words[1] = encodeOrderedF32(9);
    words[2] = MINMAX_INIT_MIN;
    words[3] = MINMAX_INIT_MAX;
    words[4] = encodeOrderedF32(-1);
    words[5] = encodeOrderedF32(4);
    expect(decodeSlabRanges(words, 0, 3, decodeMinMax)).toEqual({
      min: -1,
      max: 9,
      uniformValue: null,
      slabRanges: [
        [2, 9],
        [-1, 9],
        [-1, 4],
      ],
    });
  });

  it("reads from `base`, decodes u8 words raw, and reports uniform bricks", () => {
    const words = new Uint32Array([99, 99, 7, 7, 7, 7]);
    expect(decodeSlabRanges(words, 1, 2, decodeMinMaxU8)).toEqual({
      min: 7,
      max: 7,
      uniformValue: 7,
      slabRanges: [
        [7, 7],
        [7, 7],
      ],
    });
  });

  it("all-sentinel entries map to the {0, 0, uniform 0} outcome of the single-entry decodes", () => {
    const words = new Uint32Array([MINMAX_INIT_MIN, MINMAX_INIT_MAX, MINMAX_INIT_MIN, MINMAX_INIT_MAX]);
    expect(decodeSlabRanges(words, 0, 2, decodeMinMax)).toEqual({
      min: 0,
      max: 0,
      uniformValue: 0,
      slabRanges: [
        [0, 0],
        [0, 0],
      ],
    });
  });

  it("the kernel source addresses minmax by minmax_base + channel and reduces per channel", () => {
    for (const source of [REPACK_KERNEL_WGSL, REPACK_KERNEL_R8_WGSL]) {
      expect(source).toContain("minmax_base: u32");
      expect(source).toContain("(P.minmax_base + P.chan_start + k) * 2u");
      expect(source).toContain("wg_min[slab]");
      expect(source).not.toContain("P.brick_index * 2u");
    }
  });
});

describe("r16f arena kernel parity with the worker's half-float encode", () => {
  /** Execute the r16 kernel's per-invocation algorithm over the arena. */
  function simulateBrickR16(input: RepackDispatchInput) {
    const [sx, sy, sz] = input.spec.stored;
    const { rowBytes, imageRows, images, jobBytes } = arenaJobLayout(
      input.spec.stored,
      input.spec.channelCount,
      2,
    );
    const rowWords = rowBytes / 4;
    const baseWord = 64;
    const arena = new Uint32Array(baseWord + jobBytes / 4);
    const elementCount = brickElementCount(input);
    const writes = new Uint8Array(elementCount);
    const minmax = { min: MINMAX_INIT_MIN, max: MINMAX_INIT_MAX };
    const dispatches = buildKernelDispatches(input, [0, 0, 0], 0);
    for (const d of dispatches) {
      // Element-indexed reads serve BOTH kernels: the f32 kernel indexes
      // array<f32> directly and the u16 kernel's extractBits lane addressing
      // is exactly Uint16Array element indexing.
      const data = input.chunks[d.chunkIndex].data as Float32Array | Uint16Array;
      for (let gz = 0; gz < sz * d.channelCount; gz++) {
        const c = Math.floor(gz / sz);
        const z = gz % sz;
        for (let y = 0; y < sy; y++) {
          for (let x = 0; x < sx; x++) {
            const g = [
              clampI(d.destOrigin[0] + x, d.fetchMin[0], d.fetchMax[0] - 1),
              clampI(d.destOrigin[1] + y, d.fetchMin[1], d.fetchMax[1] - 1),
              clampI(d.destOrigin[2] + z, d.fetchMin[2], d.fetchMax[2] - 1),
            ];
            const owned =
              g[0] >= d.lo[0] && g[0] < d.hi[0] &&
              g[1] >= d.lo[1] && g[1] < d.hi[1] &&
              g[2] >= d.lo[2] && g[2] < d.hi[2] &&
              c >= d.chanStart && c < d.chanEnd;
            if (!owned) continue;
            const src =
              d.fixedBase +
              (c - d.chanStart) * d.strideC +
              (g[2] - d.chunkOrigin[2]) * d.strideZ +
              (g[1] - d.chunkOrigin[1]) * d.strideY +
              (g[0] - d.chunkOrigin[0]) * d.strideX;
            const value = data[src];
            const half = floatToHalfBits(value / R16F_DATA_SCALE) & 0xffff;
            const word = baseWord + ((c * sz + z) * sy + y) * rowWords + (x >> 1);
            arena[word] |= half << (16 * (x & 1));
            writes[((c * sz + z) * sy + y) * sx + x] += 1;
            if (value === value) {
              const e = encodeOrderedF32(value);
              if (e < minmax.min) minmax.min = e;
              if (e > minmax.max) minmax.max = e;
            }
          }
        }
      }
    }
    // Unpack the padded rows the way copyBufferToTexture reads them.
    const out = new Uint16Array(elementCount);
    for (let image = 0; image < images; image++)
      for (let y = 0; y < imageRows; y++)
        for (let x = 0; x < sx; x++) {
          out[(image * sy + y) * sx + x] =
            (arena[baseWord + (image * sy + y) * rowWords + (x >> 1)] >>> (16 * (x & 1))) & 0xffff;
        }
    return { out, writes, ...decodeMinMax(minmax.min, minmax.max) };
  }

  it.each([[[0, 0, 0]], [[1, 1, 0]], [[2, 2, 0]]] as [[number, number, number]][])(
    "brick %j reproduces the worker's encodeHalfArray output bit-for-bit through the arena",
    (brickCoords) => {
      const input = makeInput(brickCoords);
      const gpu = simulateBrickR16(input);
      // The CPU worker path: raw repack into a float scratch, then half-encode.
      const scratch = new Float32Array(brickElementCount(input));
      const cpu = repackBrick({ ...input, output: scratch });
      const expected = new Uint16Array(scratch.length);
      encodeHalfArray(scratch, expected, 1 / R16F_DATA_SCALE);
      expect([...gpu.out]).toEqual([...expected]);
      expect([...gpu.writes].every((count) => count === 1)).toBe(true);
      // Min/max are reduced on the RAW value, exactly like the f32 kernel.
      expect(gpu.min).toBe(cpu.min);
      expect(gpu.max).toBe(cpu.max);
      expect(gpu.uniformValue).toBe(cpu.uniformValue);
    },
  );

  it("arenaJobLayout pads rows to 256 bytes per texel size and keeps r8JobLayout as the 1-byte case", () => {
    expect(arenaJobLayout([66, 66, 66], 1, 2)).toEqual({ rowBytes: 256, imageRows: 66, images: 66, jobBytes: 256 * 66 * 66 });
    expect(arenaJobLayout([256, 256, 1], 3, 2)).toEqual({ rowBytes: 512, imageRows: 256, images: 3, jobBytes: 512 * 256 * 3 });
    expect(arenaJobLayout([66, 66, 38], 4, 1)).toEqual(r8JobLayout([66, 66, 38], 4));
  });

  it("the r16 kernel packs two halves per word and shares the params/epilogue", () => {
    expect(REPACK_KERNEL_R16_WGSL).toContain("pack2x16float");
    expect(REPACK_KERNEL_R16_WGSL).toContain("(px >> 1u)");
    expect(REPACK_KERNEL_R16_WGSL).toContain("16u * (px & 1u)");
    expect(REPACK_KERNEL_R16_WGSL).toContain("(P.minmax_base + P.chan_start + k) * 2u");
    expect(REPACK_KERNEL_R16_WGSL).toContain(`R16_INV_SCALE: f32 = ${1 / R16F_DATA_SCALE}`);
  });

  it("raw uint16 chunks (orkestrator.raw16) reproduce the worker's output through the arena", () => {
    // The raw16 fidelity's representation: the SAME values, unwidened. The
    // u16 kernel reads 16-bit lanes with extractBits — element-for-element
    // what indexing a Uint16Array does — and f32(u16) is exact, so output,
    // min/max and uniform must match the f32-chunk path bit-for-bit.
    // (-999 out-of-bounds pad values can't exist in a real uint16 chunk; the
    // fixture clamps them to 0.)
    const input = makeInput([1, 1, 0]);
    const u16Input: RepackDispatchInput = {
      ...input,
      chunks: input.chunks.map((chunk) => {
        const f32 = chunk.data as Float32Array;
        const u16 = new Uint16Array(f32.length);
        for (let i = 0; i < f32.length; i++) u16[i] = Math.max(0, f32[i]);
        return { ...chunk, data: u16 as unknown as RepackChunk["data"] };
      }),
    };
    const gpu = simulateBrickR16(u16Input);
    const scratch = new Float32Array(brickElementCount(u16Input));
    const cpu = repackBrick({ ...u16Input, output: scratch });
    const expected = new Uint16Array(scratch.length);
    encodeHalfArray(scratch, expected, 1 / R16F_DATA_SCALE);
    expect([...gpu.out]).toEqual([...expected]);
    expect([...gpu.writes].every((count) => count === 1)).toBe(true);
    expect(gpu.min).toBe(cpu.min);
    expect(gpu.max).toBe(cpu.max);
    expect(gpu.uniformValue).toBe(cpu.uniformValue);
  });

  it("the u16-source kernel reads 16-bit lanes and otherwise mirrors the r16 kernel", () => {
    expect(REPACK_KERNEL_R16_U16_WGSL).toContain("array<u32>");
    expect(REPACK_KERNEL_R16_U16_WGSL).toContain(
      "f32(extractBits(chunk_data[src >> 1u], 16u * (src & 1u), 16u))",
    );
    expect(REPACK_KERNEL_R16_U16_WGSL).toContain("pack2x16float");
    expect(REPACK_KERNEL_R16_U16_WGSL).toContain("(px >> 1u)");
    expect(REPACK_KERNEL_R16_U16_WGSL).toContain("(P.minmax_base + P.chan_start + k) * 2u");
    expect(REPACK_KERNEL_R16_U16_WGSL).toContain(`R16_INV_SCALE: f32 = ${1 / R16F_DATA_SCALE}`);
  });
});

describe("rgba8 arena kernel parity with the CPU interleave", () => {
  const SPEC3: BrickSpec = { payload: [4, 4, 4], border: 1, stored: [6, 6, 6], channelCount: 3 };
  const makeU8Input3 = (brickCoords: [number, number, number]): RepackDispatchInput => {
    const chunks: RepackChunk[] = [];
    for (let channel = 0; channel < 3; channel++)
      for (const cy of [0, 1])
        for (const cx of [0, 1]) {
          const [w, h, d] = [8, 8, 4];
          const data = new Uint8Array(d * h * w);
          for (let z = 0; z < d; z++)
            for (let y = 0; y < h; y++)
              for (let x = 0; x < w; x++) {
                const gx = cx * 8 + x;
                const gy = cy * 8 + y;
                data[(z * h + y) * w + x] =
                  gx < 12 && gy < 12 ? (channel * 80 + z * 20 + gy * 5 + gx) & 0xff : 250;
              }
          chunks.push({ coords: [cx, cy, 0], channelChunk: channel, data, shape: [1, 4, 8, 8], stride: [256, 64, 8, 1] });
        }
    const geo = buildLayerLevelGeometry(DIMS, LAYER, [
      { shape: [3, 4, 12, 12], chunks: [1, 4, 8, 8], dtype: "uint8", storeId: "s0" },
    ])!;
    return {
      spec: SPEC3,
      level: geo.levels[0],
      axes: geo.axes,
      brickBox: nodeVoxelBox(geo, SPEC3, 0, brickCoords),
      fetchBox: fetchVoxelBox(geo, SPEC3, 0, brickCoords),
      fixedOffsets: [0, 0, 0, 0],
      chunks,
    };
  };

  function simulateBrickRgba8(input: RepackDispatchInput) {
    const [sx, sy, sz] = input.spec.stored;
    const { rowBytes, imageRows, images, jobBytes } = arenaJobLayoutForKind("rgba8", input.spec.stored, input.spec.channelCount);
    const rowWords = rowBytes / 4;
    const baseWord = 32;
    const arena = new Uint32Array(baseWord + jobBytes / 4);
    const writes = new Uint8Array(brickElementCount(input));
    const minmax = { min: MINMAX_INIT_MIN, max: MINMAX_INIT_MAX };
    for (const d of buildKernelDispatches(input, [0, 0, 0], 0)) {
      const bytes = input.chunks[d.chunkIndex].data as Uint8Array;
      for (let gz = 0; gz < sz * d.channelCount; gz++) {
        const c = Math.floor(gz / sz);
        const z = gz % sz;
        for (let y = 0; y < sy; y++)
          for (let x = 0; x < sx; x++) {
            const g = [
              clampI(d.destOrigin[0] + x, d.fetchMin[0], d.fetchMax[0] - 1),
              clampI(d.destOrigin[1] + y, d.fetchMin[1], d.fetchMax[1] - 1),
              clampI(d.destOrigin[2] + z, d.fetchMin[2], d.fetchMax[2] - 1),
            ];
            const owned =
              g[0] >= d.lo[0] && g[0] < d.hi[0] && g[1] >= d.lo[1] && g[1] < d.hi[1] &&
              g[2] >= d.lo[2] && g[2] < d.hi[2] && c >= d.chanStart && c < d.chanEnd;
            if (!owned) continue;
            const src =
              d.fixedBase + (c - d.chanStart) * d.strideC + (g[2] - d.chunkOrigin[2]) * d.strideZ +
              (g[1] - d.chunkOrigin[1]) * d.strideY + (g[0] - d.chunkOrigin[0]) * d.strideX;
            const value = bytes[src];
            const word = baseWord + (((c >> 2) * sz + z) * sy + y) * rowWords + x;
            arena[word] |= value << (8 * (c & 3));
            writes[((c * sz + z) * sy + y) * sx + x] += 1;
            if (value < minmax.min) minmax.min = value;
            if (value > minmax.max) minmax.max = value;
          }
      }
    }
    // Unpack as copyBufferToTexture reads it: one rgba8 texel per word.
    const out = new Uint8Array(sx * sy * images * 4);
    for (let image = 0; image < images; image++)
      for (let y = 0; y < imageRows; y++)
        for (let x = 0; x < sx; x++) {
          const word = arena[baseWord + (image * sy + y) * rowWords + x];
          const o = ((image * sy + y) * sx + x) * 4;
          out[o] = word & 0xff;
          out[o + 1] = (word >>> 8) & 0xff;
          out[o + 2] = (word >>> 16) & 0xff;
          out[o + 3] = (word >>> 24) & 0xff;
        }
    return { out, writes, ...decodeMinMaxU8(minmax.min, minmax.max) };
  }

  it.each([[[0, 0, 0]], [[1, 1, 0]], [[2, 2, 0]]] as [[number, number, number]][])(
    "brick %j matches the CPU planar repack + interleave byte-for-byte",
    (brickCoords) => {
      const input = makeU8Input3(brickCoords);
      const gpu = simulateBrickRgba8(input);
      const planar = new Uint8Array(brickElementCount(input));
      const cpu = repackBrick({ ...input, output: planar });
      const voxels = 6 * 6 * 6;
      const expected = interleaveSlabsRgba8(planar, voxels, 3, new Uint8Array(voxels * 4));
      expect([...gpu.out]).toEqual([...expected]);
      expect([...gpu.writes].every((count) => count === 1)).toBe(true);
      expect(gpu.min).toBe(cpu.min);
      expect(gpu.max).toBe(cpu.max);
    },
  );

  it("lays out ceil(channels / 4) images of 4-byte texels", () => {
    expect(arenaJobLayoutForKind("rgba8", [66, 66, 66], 3)).toEqual({
      rowBytes: 512, // 66 × 4 = 264 → 512
      imageRows: 66,
      images: 66,
      jobBytes: 512 * 66 * 66,
    });
    expect(arenaJobLayoutForKind("r8", [66, 66, 66], 3).images).toBe(66 * 3);
  });

  it("the rgba8 kernel addresses one word per texel and ORs the channel byte", () => {
    expect(REPACK_KERNEL_RGBA8_WGSL).toContain("(((c >> 2u) * sz + z) * P.stored_xy.y + py) * P.row_words");
    expect(REPACK_KERNEL_RGBA8_WGSL).toContain("value << (8u * (c & 3u))");
  });
});
