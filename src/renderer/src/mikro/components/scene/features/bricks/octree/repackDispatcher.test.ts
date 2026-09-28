import { describe, expect, it } from "vitest";
import type { BrickSpec } from "./brickSpec";
import { repackBrick, type RepackChunk } from "./brickRepack";
import { buildLayerLevelGeometry } from "../../../platform/coords/levelGeometry";
import { fetchVoxelBox, nodeVoxelBox } from "./nodeAddress";
import {
  createBufferFreeList,
  createRepackDispatcher,
  createSyncRepackDispatcher,
} from "./repackDispatcher";

/**
 * The dispatcher must be a pure transport around `repackBrick` — same buffer,
 * same min/max/uniform result. Fixture mirrors `brickRepack.test.ts` (12×12×4
 * level, 2 channels, brick payload 4³ + border).
 */
const DIMS = ["c", "z", "y", "x"];
const LAYER = { xAxis: "x", yAxis: "y", zAxis: "z", intensityAxis: "c" };
const GEO = buildLayerLevelGeometry(DIMS, LAYER, [
  { shape: [2, 4, 12, 12], chunks: [1, 4, 8, 8], dtype: "uint8", storeId: "s0" },
])!;
const SPEC: BrickSpec = { payload: [4, 4, 4], border: 1, stored: [6, 6, 6], channelCount: 2 };

const makeChunk = (coords: [number, number, number], channelChunk: number): RepackChunk => {
  const [w, h, d] = [8, 8, 4];
  const data = new Float32Array(d * h * w);
  for (let z = 0; z < d; z++)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const gx = coords[0] * 8 + x;
        const gy = coords[1] * 8 + y;
        data[(z * h + y) * w + x] =
          gx < 12 && gy < 12 ? channelChunk * 1000 + z * 100 + gy * 10 + gx : -999;
      }
  return { coords, channelChunk, data, shape: [1, 4, 8, 8], stride: [256, 64, 8, 1] };
};

const buildJob = (brickCoords: [number, number, number]) => {
  const chunks: RepackChunk[] = [];
  for (let channel = 0; channel < 2; channel++)
    for (const cy of [0, 1]) for (const cx of [0, 1]) chunks.push(makeChunk([cx, cy, 0], channel));
  return {
    kind: "r32f" as const,
    elementCount: 6 * 6 * 6 * 2,
    input: {
      spec: SPEC,
      level: GEO.levels[0],
      axes: GEO.axes,
      brickBox: nodeVoxelBox(GEO, SPEC, 0, brickCoords),
      fetchBox: fetchVoxelBox(GEO, SPEC, 0, brickCoords),
      fixedOffsets: [0, 0, 0, 0],
      chunks,
    },
  };
};

describe("repackDispatcher (sync impl)", () => {
  it("produces the identical buffer and result as a direct repackBrick call", async () => {
    const job = buildJob([1, 1, 0]);
    const dispatched = await createSyncRepackDispatcher().repack(job);

    const reference = new Float32Array(job.elementCount);
    const referenceResult = repackBrick({ ...job.input, output: reference });

    expect(dispatched.min).toBe(referenceResult.min);
    expect(dispatched.max).toBe(referenceResult.max);
    expect(dispatched.uniformValue).toBe(referenceResult.uniformValue);
    expect(Array.from(dispatched.data)).toEqual(Array.from(reference));
  });

  it("allocates the requested output kind", async () => {
    const job = { ...buildJob([0, 0, 0]), kind: "r8" as const };
    const outcome = await createSyncRepackDispatcher().repack(job);
    expect(outcome.data).toBeInstanceOf(Uint8Array);
  });

  it("r16f: raw min/max/uniform, half-float payload that rescales back (roadmap R3)", async () => {
    const { halfBitsToFloat } = await import("./halfFloat");
    const { R16F_DATA_SCALE } = await import("./atlasFormat");
    const job = { ...buildJob([1, 1, 0]), kind: "r16f" as const };
    const outcome = await createSyncRepackDispatcher().repack(job);

    const reference = new Float32Array(job.elementCount);
    const referenceResult = repackBrick({ ...job.input, output: reference });

    // Result metadata is RAW — auto-range, EMPTY demotion and the occupancy
    // sidecar all consume it and must not see half-float quantization.
    expect(outcome.min).toBe(referenceResult.min);
    expect(outcome.max).toBe(referenceResult.max);
    expect(outcome.uniformValue).toBe(referenceResult.uniformValue);

    // The payload holds half bits of raw/65535; decoding × dataScale must
    // land within half-float precision of every raw voxel.
    expect(outcome.data).toBeInstanceOf(Uint16Array);
    for (let i = 0; i < reference.length; i++) {
      const rescaled = halfBitsToFloat(outcome.data[i]) * R16F_DATA_SCALE;
      expect(Math.abs(rescaled - reference[i])).toBeLessThanOrEqual(
        Math.max(Math.abs(reference[i]) * 2 ** -11, 0.01),
      );
    }
  });
});

describe("createRepackDispatcher", () => {
  it("falls back to the sync impl when Worker is unavailable (node/vitest)", async () => {
    // vitest's node environment has no global Worker — the factory must still
    // return a working dispatcher.
    expect(typeof Worker).toBe("undefined");
    const dispatcher = createRepackDispatcher();
    const outcome = await dispatcher.repack(buildJob([0, 0, 0]));
    expect(outcome.data.length).toBe(6 * 6 * 6 * 2);
    dispatcher.release(outcome.data); // no-op on the sync impl, must not throw
    dispatcher.dispose();
  });
});

describe("createBufferFreeList", () => {
  it("recycles by exact byte length only", () => {
    const list = createBufferFreeList();
    list.put(new ArrayBuffer(1024));
    expect(list.take(512)).toBeUndefined();
    const hit = list.take(1024);
    expect(hit?.byteLength).toBe(1024);
    expect(list.take(1024)).toBeUndefined(); // consumed
  });

  it("bounds retained buffers and drops overflow to GC", () => {
    const list = createBufferFreeList(2);
    list.put(new ArrayBuffer(8));
    list.put(new ArrayBuffer(8));
    list.put(new ArrayBuffer(8)); // over the cap: silently dropped
    expect(list.size()).toBe(2);
    expect(list.take(8)).toBeDefined();
    expect(list.take(8)).toBeDefined();
    expect(list.take(8)).toBeUndefined();
  });

  it("refuses detached (zero-length) buffers", () => {
    const list = createBufferFreeList();
    list.put(new ArrayBuffer(0));
    expect(list.size()).toBe(0);
  });

  it("keeps independent size classes", () => {
    const list = createBufferFreeList();
    list.put(new ArrayBuffer(16));
    list.put(new ArrayBuffer(32));
    expect(list.take(32)?.byteLength).toBe(32);
    expect(list.take(16)?.byteLength).toBe(16);
    expect(list.size()).toBe(0);
  });

  it("clear() empties every class", () => {
    const list = createBufferFreeList();
    list.put(new ArrayBuffer(16));
    list.clear();
    expect(list.size()).toBe(0);
    expect(list.take(16)).toBeUndefined();
  });
});

/**
 * `prewarm` exists so the FIRST brick of a cold scene does not pay worker
 * spawn + module evaluation on top of its own decode. Under vitest there is no
 * `Worker`, so `createRepackDispatcher` returns the sync implementation — which
 * is exactly the contract being pinned here: prewarm is optional, and calling it
 * (or not) must never change repack behaviour.
 */
describe("RepackDispatcher.prewarm", () => {
  it("is safe to call, repeatedly, on whichever implementation is live", () => {
    const dispatcher = createRepackDispatcher();
    expect(() => {
      dispatcher.prewarm?.();
      dispatcher.prewarm?.();
      dispatcher.prewarm?.();
    }).not.toThrow();
    dispatcher.dispose();
  });

  it("the sync fallback exposes no prewarm — callers must optional-call it", () => {
    // If this ever becomes defined, `repack.prewarm?.()` at the call sites is
    // still correct; the assertion documents why the `?.` is there.
    expect(createSyncRepackDispatcher().prewarm).toBeUndefined();
  });

  it("leaves repack results identical after prewarming", async () => {
    const job = buildJob([1, 1, 0]);
    const dispatcher = createRepackDispatcher();
    dispatcher.prewarm?.();
    const outcome = await dispatcher.repack(job);

    const reference = new Float32Array(job.elementCount);
    const referenceResult = repackBrick({ ...job.input, output: reference });

    expect(outcome.min).toBe(referenceResult.min);
    expect(outcome.max).toBe(referenceResult.max);
    expect(outcome.uniformValue).toBe(referenceResult.uniformValue);
    expect(Array.from(outcome.data)).toEqual(Array.from(reference));
    dispatcher.dispose();
  });
});
