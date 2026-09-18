import { describe, expect, it } from "vitest";
import {
  copyChunkInto,
  countOf,
  planWindowRead,
  resolveRange,
  runFor,
  stridesFor,
  type ResolvedRange,
} from "./windowPlan";

/**
 * A fake chunked array: element value == its flat C-order index in the whole
 * array, so any mis-addressing shows up as a wrong NUMBER rather than as a crash.
 */
const makeArray = (shape: number[], chunkShape: number[]) => {
  const strides = stridesFor(shape);
  const flat = (index: number[]) =>
    index.reduce((acc, v, d) => acc + v * strides[d], 0);

  /** The decoded chunk at `coords`, sized to the real (possibly partial) extent. */
  const chunkAt = (coords: number[]) => {
    const extent = coords.map((c, d) =>
      Math.min(chunkShape[d], shape[d] - c * chunkShape[d]),
    );
    const cStrides = stridesFor(extent);
    const data = new Float64Array(extent.reduce((a, b) => a * b, 1));
    const walk = (d: number, local: number[]): void => {
      if (d === extent.length) {
        const global = local.map((v, i) => coords[i] * chunkShape[i] + v);
        data[local.reduce((acc, v, i) => acc + v * cStrides[i], 0)] = flat(global);
        return;
      }
      for (let v = 0; v < extent[d]; v++) walk(d + 1, [...local, v]);
    };
    walk(0, []);
    // zarrita's shape: strides under `stride`.
    return { data, stride: cStrides };
  };

  /** Ground truth: read the window directly out of the whole array. */
  const reference = (ranges: ResolvedRange[]) => {
    const out: number[] = [];
    const walk = (d: number, index: number[]): void => {
      if (d === ranges.length) {
        out.push(flat(index));
        return;
      }
      const r = ranges[d];
      for (let v = r.start; v < r.stop; v += r.step) walk(d + 1, [...index, v]);
    };
    walk(0, []);
    return out;
  };

  return { chunkAt, reference };
};

/** Plan + assemble, the way the real reader does. */
const assemble = (
  shape: number[],
  chunkShape: number[],
  ranges: ResolvedRange[],
) => {
  const { chunkAt } = makeArray(shape, chunkShape);
  const plan = planWindowRead(shape, chunkShape, ranges);
  if (!plan) return null;
  const data = new Float64Array(plan.outLength).fill(NaN);
  const out = { data, strides: stridesFor(plan.outShape) };
  for (const read of plan.chunks) {
    copyChunkInto(out, chunkAt(read.coords), read, ranges.map((r) => r.step));
  }
  return { plan, data: Array.from(data) };
};

const r = (start: number, stop: number, step = 1): ResolvedRange => ({
  start,
  stop,
  step,
});

describe("resolveRange", () => {
  it("defaults to the whole axis", () => {
    expect(resolveRange(100)).toEqual({ start: 0, stop: 100, step: 1 });
  });

  it("clamps into the axis", () => {
    expect(resolveRange(100, { start: -10, stop: 500 })).toEqual({
      start: 0,
      stop: 100,
      step: 1,
    });
  });

  it("returns null for an empty selection rather than reading chunk -1", () => {
    expect(resolveRange(100, { start: 50, stop: 50 })).toBeNull();
    expect(resolveRange(100, { start: 80, stop: 20 })).toBeNull();
    expect(resolveRange(0)).toBeNull();
  });

  it("floors a step below 1 to 1, so a read always terminates", () => {
    expect(resolveRange(10, { step: 0 })?.step).toBe(1);
    expect(resolveRange(10, { step: -4 })?.step).toBe(1);
  });
});

describe("countOf", () => {
  it("counts strided samples", () => {
    expect(countOf(r(0, 10, 1))).toBe(10);
    expect(countOf(r(0, 10, 3))).toBe(4); // 0,3,6,9
    expect(countOf(r(1, 10, 3))).toBe(3); // 1,4,7
  });
});

describe("runFor", () => {
  it("skips a chunk the stride steps over entirely", () => {
    // step 100 over chunks of 10: chunk 1 (indices 10..19) holds no sample.
    expect(runFor(r(0, 1000, 100), 1000, 10, 1)).toBeNull();
    expect(runFor(r(0, 1000, 100), 1000, 10, 0)).toMatchObject({ outCount: 1 });
  });

  it("reports the offset of its first sample within the chunk", () => {
    // start 5, step 1, chunk size 10, chunk 0 → first sample sits at local 5.
    expect(runFor(r(5, 30, 1), 30, 10, 0)).toEqual({
      outStart: 0,
      outCount: 5,
      chunkOffset: 5,
    });
    // chunk 1 covers 10..19; output index 5 is global 10, local 0.
    expect(runFor(r(5, 30, 1), 30, 10, 1)).toEqual({
      outStart: 5,
      outCount: 10,
      chunkOffset: 0,
    });
  });

  it("handles a partial final chunk", () => {
    // extent 25, chunk 10: chunk 2 covers only 20..24.
    expect(runFor(r(0, 25, 1), 25, 10, 2)).toEqual({
      outStart: 20,
      outCount: 5,
      chunkOffset: 0,
    });
  });
});

describe("planWindowRead", () => {
  it("refuses a rank mismatch instead of reading a plausible wrong region", () => {
    expect(planWindowRead([100], [10, 10], [r(0, 100)])).toBeNull();
    expect(planWindowRead([100], [10], [r(0, 100), r(0, 1)])).toBeNull();
  });

  it("is null when the window selects nothing", () => {
    expect(planWindowRead([100], [10], [null])).toBeNull();
  });

  it("refuses a zero chunk size rather than dividing by it", () => {
    expect(planWindowRead([100], [0], [r(0, 100)])).toBeNull();
  });

  it("touches only the chunks the window spans", () => {
    const plan = planWindowRead([1000], [100], [r(250, 460)]);
    expect(plan?.chunks.map((c) => c.coords[0])).toEqual([2, 3, 4]);
  });

  it("omits chunks a wide stride skips", () => {
    const plan = planWindowRead([1000], [10], [r(0, 1000, 100)]);
    // Only every tenth chunk holds a sample.
    expect(plan?.chunks.map((c) => c.coords[0])).toEqual([
      0, 10, 20, 30, 40, 50, 60, 70, 80, 90,
    ]);
  });
});

describe("assembling a window from chunks", () => {
  it("matches a direct read of a 1-D trace", () => {
    const ranges = [r(0, 1000)];
    const got = assemble([1000], [128], ranges);
    expect(got?.data).toEqual(makeArray([1000], [128]).reference(ranges));
  });

  it("matches a direct read of an interior 1-D window", () => {
    const ranges = [r(317, 842)];
    const got = assemble([1000], [128], ranges);
    expect(got?.data).toEqual(makeArray([1000], [128]).reference(ranges));
  });

  it("matches a direct read of a strided 1-D window", () => {
    // The decimation path: this is the read a zoomed-out overview issues.
    const ranges = [r(5, 990, 7)];
    const got = assemble([1000], [128], ranges);
    expect(got?.data).toEqual(makeArray([1000], [128]).reference(ranges));
  });

  it("matches a direct read of a multi-channel (channel, time) window", () => {
    // The case a positional reader gets wrong: 8 channels x 1000 samples, a
    // window over channels 2..5 and a strided time range.
    const shape = [8, 1000];
    const chunkShape = [4, 128];
    const ranges = [r(2, 6), r(100, 900, 3)];
    const got = assemble(shape, chunkShape, ranges);
    expect(got?.plan.outShape).toEqual([4, 267]);
    expect(got?.data).toEqual(makeArray(shape, chunkShape).reference(ranges));
  });

  it("matches a direct read when the last chunk is partial", () => {
    const shape = [1000];
    const chunkShape = [128]; // 1000 = 7*128 + 104
    const ranges = [r(900, 1000)];
    const got = assemble(shape, chunkShape, ranges);
    expect(got?.data).toEqual(makeArray(shape, chunkShape).reference(ranges));
  });

  it("matches a direct read when a stride is wider than a chunk", () => {
    const shape = [4096];
    const chunkShape = [16];
    const ranges = [r(3, 4096, 64)];
    const got = assemble(shape, chunkShape, ranges);
    expect(got?.data).toEqual(makeArray(shape, chunkShape).reference(ranges));
  });

  it("fills every output element — no gaps left as NaN", () => {
    // A missed chunk would leave holes that read as "data" downstream.
    const got = assemble([777], [64], [r(11, 700, 5)]);
    expect(got?.data.some((v) => Number.isNaN(v))).toBe(false);
    expect(got?.data.length).toBe(got?.plan.outLength);
  });

  it("matches a direct read for a single-chunk array", () => {
    const ranges = [r(0, 50)];
    const got = assemble([50], [4096], ranges);
    expect(got?.data).toEqual(makeArray([50], [4096]).reference(ranges));
  });
});

describe("copyChunkInto with exact int64 data", () => {
  it("keeps bigints exact in a BigInt64Array output (sparse offsets past 2^24)", () => {
    // 2^24 + 1 is the first integer float32 cannot hold: a promoted read of a
    // sparse `indptr` would return 2^24 and slice one element short.
    const big = 2n ** 24n + 1n;
    const chunk = { data: BigInt64Array.from([0n, big, big + 2n, big + 3n]), stride: [1] };
    const plan = planWindowRead([4], [4], [r(1, 3)])!;
    const out = { data: new BigInt64Array(plan.outLength), strides: stridesFor(plan.outShape) };
    copyChunkInto(out, chunk, plan.chunks[0], [1]);
    expect(Array.from(out.data)).toEqual([big, big + 2n]);
  });

  it("still converts bigints to numbers for a float output", () => {
    const chunk = { data: BigInt64Array.from([5n, 6n]), stride: [1] };
    const plan = planWindowRead([2], [2], [r(0, 2)])!;
    const out = { data: new Float32Array(plan.outLength), strides: stridesFor(plan.outShape) };
    copyChunkInto(out, chunk, plan.chunks[0], [1]);
    expect(Array.from(out.data)).toEqual([5, 6]);
  });
});
