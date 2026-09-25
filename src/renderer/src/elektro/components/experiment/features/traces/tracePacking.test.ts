import { describe, expect, it } from "vitest";
import { FLOATS_PER_SEGMENT } from "@/core/lib/scene/gpu/lineBuffer";
import type { DrawSegment, ResidentTile } from "../../platform/quality/traceResidency";
import { packChannel, splitChannels } from "./tracePacking";

/** A resident tile whose value at sample i equals its world time — easy to check. */
const tile = (
  opts: { start: number; count: number; period: number; t0?: number; levelIndex?: number },
): ResidentTile => {
  const t0 = opts.t0 ?? 0;
  const column = Float32Array.from({ length: opts.count }, (_, i) =>
    t0 + opts.period * (opts.start + i),
  );
  return {
    key: `${opts.levelIndex ?? 0}:${opts.start}`,
    level: opts.levelIndex ?? 0,
    levelIndex: opts.levelIndex ?? 0,
    index: 0,
    span: {
      start: t0 + opts.period * opts.start,
      end: t0 + opts.period * (opts.start + opts.count),
    },
    samples: { start: opts.start, stop: opts.start + opts.count },
    bytes: opts.count * 4,
    period: opts.period,
    t0,
    channels: [column],
    lastUsed: 0,
  };
};

const whole = (t: ResidentTile): DrawSegment => ({ tile: t, start: t.span.start, end: t.span.end });

describe("packChannel", () => {
  it("packs one tile into one continuous run", () => {
    const packed = packChannel([whole(tile({ start: 0, count: 5, period: 1 }))], 0, 0);
    expect(packed.segmentCount).toBe(4);
    expect(packed.pairs.length).toBe(4 * FLOATS_PER_SEGMENT);
    expect(Array.from(packed.xs)).toEqual([0, 1, 2, 3, 4]);
  });

  it("joins adjacent tiles into one trace", () => {
    const packed = packChannel(
      [whole(tile({ start: 0, count: 5, period: 1 })), whole(tile({ start: 5, count: 5, period: 1 }))],
      0,
      0,
    );
    // 10 points, one run: 9 segments — no missing link at the tile boundary.
    expect(packed.segmentCount).toBe(9);
  });

  it("joins a fine stretch to the coarse one standing in beside it", () => {
    // Progressive refinement: level 0 has landed for [0, 4), level 1 covers [4, 12).
    const fine = tile({ start: 0, count: 4, period: 1, levelIndex: 0 });
    const coarse = tile({ start: 2, count: 4, period: 2, levelIndex: 1 });
    const packed = packChannel(
      [whole(fine), { tile: coarse, start: 4, end: coarse.span.end }],
      0,
      0,
    );
    // One run, with the level change inside it.
    const expectedPoints = packed.xs.length;
    expect(packed.segmentCount).toBe(expectedPoints - 1);
  });

  it("BREAKS the run across a real coverage gap instead of bridging it", () => {
    // A line across time nothing was read for would look exactly like data.
    const packed = packChannel(
      [whole(tile({ start: 0, count: 5, period: 1 })), whole(tile({ start: 50, count: 5, period: 1 }))],
      0,
      0,
    );
    // 10 points in two runs of 5: 4 + 4 segments, not 9.
    expect(packed.segmentCount).toBe(8);
    // And no segment spans the gap.
    for (let s = 0; s < packed.segmentCount; s++) {
      const x0 = packed.pairs[s * FLOATS_PER_SEGMENT];
      const x1 = packed.pairs[s * FLOATS_PER_SEGMENT + 3];
      expect(x1 - x0).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("draws only the clipped part of a tile", () => {
    const t = tile({ start: 0, count: 100, period: 1 });
    const packed = packChannel([{ tile: t, start: 10, end: 20 }], 0, 0);
    expect(packed.xs[0]).toBeGreaterThanOrEqual(10);
    expect(packed.xs[packed.xs.length - 1]).toBeLessThanOrEqual(20);
  });

  it("subtracts the origin in float64 so epoch-scale times survive float32", () => {
    // 1.8e9 + 0.001 steps. Cast to float32 directly, these collapse onto the same
    // value; relative to the origin they stay distinct.
    const origin = 1.8e9;
    const t = tile({ start: 0, count: 5, period: 0.001, t0: origin });
    const packed = packChannel([whole(t)], 0, origin);
    const x = Array.from({ length: packed.segmentCount }, (_, s) => packed.pairs[s * FLOATS_PER_SEGMENT]);
    for (let i = 1; i < x.length; i++) expect(x[i]).toBeGreaterThan(x[i - 1]);
    expect(Math.fround(origin + 0.001)).toBe(Math.fround(origin)); // the failure avoided
  });

  it("reports the drawn value range for clim seeding", () => {
    const packed = packChannel([whole(tile({ start: 0, count: 5, period: 1 }))], 0, 0);
    expect(packed.valueMin).toBe(0);
    expect(packed.valueMax).toBe(4);
  });

  it("skips non-finite samples rather than drawing them", () => {
    const t = tile({ start: 0, count: 5, period: 1 });
    (t.channels[0] as Float32Array)[2] = NaN;
    const packed = packChannel([whole(t)], 0, 0);
    expect(Array.from(packed.ys).some(Number.isNaN)).toBe(false);
  });

  it("is empty for nothing resident, and for a missing channel", () => {
    expect(packChannel([], 0, 0).segmentCount).toBe(0);
    expect(packChannel([whole(tile({ start: 0, count: 5, period: 1 }))], 3, 0).segmentCount).toBe(0);
  });

  it("walks a negative period forward in time", () => {
    const t = tile({ start: 0, count: 5, period: -1, t0: 10 });
    const packed = packChannel([whole(t)], 0, 0);
    for (let i = 1; i < packed.xs.length; i++) expect(packed.xs[i]).toBeGreaterThan(packed.xs[i - 1]);
  });
});

describe("splitChannels", () => {
  it("splits a (channel, time) window into time-ordered columns", () => {
    // 2 channels x 3 samples, row-major: c0 = [0,1,2], c1 = [10,11,12].
    const columns = splitChannels(
      { shape: [2, 3], strides: [3, 1], data: [0, 1, 2, 10, 11, 12] },
      1,
      0,
    );
    expect(columns.map((c) => Array.from(c))).toEqual([
      [0, 1, 2],
      [10, 11, 12],
    ]);
  });

  it("splits a (time, channel) window the same way", () => {
    // 3 samples x 2 channels: interleaved.
    const columns = splitChannels(
      { shape: [3, 2], strides: [2, 1], data: [0, 10, 1, 11, 2, 12] },
      0,
      1,
    );
    expect(columns.map((c) => Array.from(c))).toEqual([
      [0, 1, 2],
      [10, 11, 12],
    ]);
  });

  it("treats a 1-D trace as one channel", () => {
    const columns = splitChannels({ shape: [3], strides: [1], data: [5, 6, 7] }, 0, null);
    expect(columns.map((c) => Array.from(c))).toEqual([[5, 6, 7]]);
  });
});

describe("packChannel envelope", () => {
  /** A tile whose values are a slow ramp with one sharp spike at sample `spikeAt`. */
  const spiky = (count: number, spikeAt: number): ResidentTile => {
    const t = tile({ start: 0, count, period: 1 });
    const column = Float32Array.from({ length: count }, (_, i) => (i === spikeAt ? 1000 : i % 10));
    return { ...t, channels: [column] };
  };

  it("bounds the output by the pixel columns, whatever the data length", () => {
    const t = spiky(1_000_000, 123_457);
    const packed = packChannel([whole(t)], 0, 0, { window: t.span, widthPx: 1000 });
    expect(packed.decimated).toBe(true);
    expect(packed.xs.length).toBeLessThanOrEqual(2 * 1000 + 4);
  });

  it("keeps every excursion: the global extremes survive, in time order", () => {
    const t = spiky(100_000, 54_321);
    const packed = packChannel([whole(t)], 0, 0, { window: t.span, widthPx: 100 });
    expect(packed.valueMax).toBe(1000);
    expect(packed.valueMin).toBe(0);
    expect(Array.from(packed.ys)).toContain(1000);
    for (let i = 1; i < packed.xs.length; i++) expect(packed.xs[i]).toBeGreaterThan(packed.xs[i - 1]);
  });

  it("keeps every sample when there are few enough per pixel", () => {
    const t = tile({ start: 0, count: 50, period: 1 });
    const packed = packChannel([whole(t)], 0, 0, { window: t.span, widthPx: 1000 });
    expect(packed.decimated).toBe(false);
    expect(packed.xs.length).toBe(50);
  });

  it("still breaks the run across a coverage gap", () => {
    const a = tile({ start: 0, count: 10_000, period: 1 });
    const b = tile({ start: 50_000, count: 10_000, period: 1 });
    const packed = packChannel([whole(a), whole(b)], 0, 0, { window: { start: 0, end: 60_000 }, widthPx: 600 });
    // Two runs: one segment fewer than the points it joins, per run.
    expect(packed.segmentCount).toBe(packed.xs.length - 2);
  });
});

import { summarizeColumn } from "./tracePacking";

describe("block summaries", () => {
  it("record where each block's extremes are, skipping non-finite values", () => {
    const summary = summarizeColumn(Float32Array.from([3, 1, NaN, 7, 5, 5]), 3);
    expect(Array.from(summary.minIndex)).toEqual([1, 4]);
    expect(Array.from(summary.maxIndex)).toEqual([0, 3]);
  });

  it("give the same envelope extremes as the raw scan, reading far fewer samples", () => {
    const count = 200_000;
    const t = tile({ start: 0, count, period: 1 });
    const column = Float32Array.from({ length: count }, (_, i) => Math.sin(i / 50) + (i === 123_457 ? 10 : 0));
    const raw = { ...t, channels: [column] };
    const summarized = { ...raw, summaries: [summarizeColumn(column)] };
    const options = { window: t.span, widthPx: 200 };
    const a = packChannel([whole(raw)], 0, 0, options);
    const b = packChannel([whole(summarized)], 0, 0, options);
    expect(b.valueMax).toBe(a.valueMax);
    expect(b.valueMin).toBe(a.valueMin);
    expect(Math.abs(b.xs.length - a.xs.length)).toBeLessThanOrEqual(4);
    // The one-sample spike survives the summary.
    expect(Array.from(b.ys)).toContain(column[123_457]);
  });
});
