import { describe, expect, it } from "vitest";
import {
  TARGET_POINTS,
  buildTraceLevels,
  pickLevel,
  sameRead,
  sampleRangeFor,
  type LevelSource,
  type TraceLevel,
} from "./levelPlan";

/** A pyramid over a 1-D time axis: level L is downsampled by 2^L. */
const pyramid = (levels: number, baseSamples: number): LevelSource[] =>
  Array.from({ length: levels }, (_, level) => ({
    level,
    shape: [Math.ceil(baseSamples / 2 ** level)],
    // The canonical pyramid-level edge: Sequence[Scale, Translation].
    toParent: {
      __typename: "SequenceTransformation",
      transformations: [
        { __typename: "ScaleTransformation", scale: [2 ** level] },
        { __typename: "TranslationTransformation", translation: [0.5] },
      ],
    },
    store: { id: `store-L${level}` },
  }));

/** period 0.1 ms/sample starting at t=0 — a 10 kHz recording. */
const timeMap = { period: 0.1, t0: 0, total: true };

describe("buildTraceLevels", () => {
  it("scales each level's period by its declared factor", () => {
    const levels = buildTraceLevels(pyramid(4, 1_000_000), 0, timeMap);
    expect(levels.map((l) => l.level)).toEqual([0, 1, 2, 3]);
    expect(levels.map((l) => l.period)).toEqual([0.1, 0.2, 0.4, 0.8]);
  });

  it("orders finest first even when the sources arrive out of order", () => {
    const shuffled = [...pyramid(4, 1_000_000)].reverse();
    expect(buildTraceLevels(shuffled, 0, timeMap).map((l) => l.level)).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it("finds the time axis of a (channel, time) dataset at its real position", () => {
    const sources: LevelSource[] = [
      {
        level: 0,
        shape: [8, 1000],
        toParent: { __typename: "ScaleTransformation", scale: [1, 1] },
        store: { id: "a" },
      },
      {
        level: 1,
        shape: [8, 500],
        toParent: { __typename: "ScaleTransformation", scale: [1, 2] },
        store: { id: "b" },
      },
    ];
    const levels = buildTraceLevels(sources, 1, timeMap);
    expect(levels.map((l) => l.sampleCount)).toEqual([1000, 500]);
    expect(levels.map((l) => l.period)).toEqual([0.1, 0.2]);
  });

  it("drops a level whose factor cannot be read rather than guessing it", () => {
    // A period guessed wrong draws a trace at the wrong time scale, which looks
    // like data. Better to have no such level.
    const sources: LevelSource[] = [
      { level: 0, shape: [1000], toParent: { __typename: "ScaleTransformation", scale: [1] }, store: { id: "a" } },
      { level: 1, shape: [500], toParent: { __typename: "AffineTransformation", affine: [[2, 0]] }, store: { id: "b" } },
    ];
    expect(buildTraceLevels(sources, 0, timeMap).map((l) => l.level)).toEqual([0]);
  });

  it("can fall back to the shape ratio when opted in", () => {
    const sources: LevelSource[] = [
      { level: 0, shape: [1000], store: { id: "a" } },
      { level: 1, shape: [250], store: { id: "b" } },
    ];
    const levels = buildTraceLevels(sources, 0, timeMap, {
      shapeRatioFallback: true,
    });
    expect(levels.map((l) => l.period)).toEqual([0.1, 0.4]);
  });

  it("handles a single-level (non-multiscale) dataset", () => {
    const levels = buildTraceLevels(
      [{ level: 0, shape: [1000], toParent: { __typename: "ScaleTransformation", scale: [1] }, store: { id: "a" } }],
      0,
      timeMap,
    );
    expect(levels).toHaveLength(1);
    expect(levels[0].period).toBe(0.1);
  });

  it("is unaffected by an unsliced lens", () => {
    const plain = buildTraceLevels(pyramid(3, 1000), 0, timeMap);
    const sliced = buildTraceLevels(pyramid(3, 1000), 0, timeMap, {
      lensSlice: { start: 0, step: 1 },
    });
    expect(sliced).toEqual(plain);
  });

  it("shifts a cropped lens' levels by the crop offset", () => {
    // `asAffine` places the LENS grid, so lens sample 0 is world t0 — but level L
    // sample 0 is DATASET sample 0, which is `start` samples EARLIER than the
    // crop. Ignoring that draws every level shifted by the crop.
    const levels = buildTraceLevels(pyramid(2, 1000), 0, timeMap, {
      lensSlice: { start: 100, step: 1 },
    });
    // Dataset sample 0 sits 100 samples (10 ms) before the lens' own origin.
    expect(levels[0].t0).toBeCloseTo(-10, 10);
    expect(levels[0].period).toBeCloseTo(0.1, 10);
  });

  it("divides the period by a strided lens' step", () => {
    // A lens taking every 4th sample stretches each lens step over 4 dataset
    // samples, so one DATASET sample spans a quarter of a lens step in world time.
    const levels = buildTraceLevels(pyramid(2, 1000), 0, timeMap, {
      lensSlice: { start: 0, step: 4 },
    });
    expect(levels[0].period).toBeCloseTo(0.025, 10);
    expect(levels[1].period).toBeCloseTo(0.05, 10);
  });

  it("refuses a bad time axis index instead of reading another axis", () => {
    expect(buildTraceLevels(pyramid(2, 1000), -1, timeMap)).toEqual([]);
    expect(buildTraceLevels(pyramid(2, 1000), 5, timeMap)).toEqual([]);
  });
});

describe("sampleRangeFor", () => {
  const level: TraceLevel = {
    level: 0,
    storeId: "a",
    sampleCount: 1000,
    period: 0.1,
    t0: 0,
  };

  it("maps a world window onto samples", () => {
    expect(sampleRangeFor(level, { start: 10, end: 20 })).toEqual({
      start: 100,
      stop: 201,
    });
  });

  it("rounds outward so the line runs past both viewport edges", () => {
    // 10.05 ms .. 10.15 ms is between samples; both ends must widen.
    const range = sampleRangeFor(level, { start: 10.05, end: 10.15 });
    expect(range!.start).toBeLessThanOrEqual(100);
    expect(range!.stop).toBeGreaterThanOrEqual(102);
  });

  it("clamps to the level's own extent", () => {
    expect(sampleRangeFor(level, { start: -100, end: 1e9 })).toEqual({
      start: 0,
      stop: 1000,
    });
  });

  it("is null when the window misses the data", () => {
    expect(sampleRangeFor(level, { start: 500, end: 600 })).toBeNull();
    expect(sampleRangeFor({ ...level, period: 0 }, { start: 0, end: 1 })).toBeNull();
  });

  it("does not invert for a negative period", () => {
    const backwards: TraceLevel = { ...level, period: -0.1, t0: 100 };
    const range = sampleRangeFor(backwards, { start: 50, end: 60 });
    expect(range!.stop).toBeGreaterThan(range!.start);
  });
});

describe("pickLevel", () => {
  const levels = buildTraceLevels(pyramid(6, 1_000_000), 0, timeMap);
  // 1e6 samples at 0.1 ms = 100 s of recording.

  it("reads level 0 at full rate when the window is small", () => {
    const choice = pickLevel(levels, { start: 0, end: 100 })!; // 1000 samples
    expect(choice.level.level).toBe(0);
    expect(choice.step).toBe(1);
  });

  it("picks a COARSER LEVEL rather than striding level 0 when zoomed out", () => {
    // The whole point of the feature. 100 s at 0.1 ms is 1e6 samples; asking for
    // ~2000 means a factor of ~512, so the coarsest available level wins and the
    // residual stride mops up the rest.
    const choice = pickLevel(levels, { start: 0, end: 100_000 })!;
    expect(choice.level.level).toBeGreaterThan(0);
    expect(choice.level.storeId).not.toBe("store-L0");
  });

  it("picks an INTERMEDIATE level and reads it at full rate", () => {
    // The headline behaviour, with the arithmetic pinned down. A 1000 ms window
    // of a 10 kHz recording is 10k samples at level 0 — 5x the budget — so the
    // planner should step down three levels (factor 8, period 0.8 ms) and then
    // read every sample of that level rather than striding a finer one.
    const choice = pickLevel(levels, { start: 0, end: 1000 })!;
    expect(choice.level.level).toBe(3);
    expect(choice.level.period).toBeCloseTo(0.8, 10);
    expect(choice.step).toBe(1);
    expect(choice.points).toBeLessThanOrEqual(TARGET_POINTS);
    // And it reads only that level's store — not level 0's.
    expect(choice.level.storeId).toBe("store-L3");
  });

  it("strides only once the pyramid runs out of levels", () => {
    // 100 s window = 1e6 samples at level 0. The coarsest of 6 levels is factor
    // 32, which still leaves ~31k samples, so the residual stride takes over.
    const choice = pickLevel(levels, { start: 0, end: 100_000 })!;
    expect(choice.level.level).toBe(5);
    expect(choice.step).toBeGreaterThan(1);
    expect(choice.points).toBeLessThanOrEqual(TARGET_POINTS);
  });

  it("never returns more than the target point count", () => {
    for (const width of [1, 10, 100, 1000, 10_000, 100_000]) {
      const choice = pickLevel(levels, { start: 0, end: width });
      if (!choice) continue;
      expect(choice.points).toBeLessThanOrEqual(TARGET_POINTS);
    }
  });

  it("is band-stable: a zoom inside a band reads exactly the same thing", () => {
    // This is the property that stops a gesture refetching.
    const a = pickLevel(levels, { start: 0, end: 1000 })!;
    const b = pickLevel(levels, { start: 0, end: 1000 })!;
    expect(sameRead(a, b)).toBe(true);
    expect(a.level.level).toBe(b.level.level);
  });

  it("changes the read when the window actually moves", () => {
    const a = pickLevel(levels, { start: 0, end: 1000 })!;
    const b = pickLevel(levels, { start: 5000, end: 6000 })!;
    expect(sameRead(a, b)).toBe(false);
  });

  it("gets coarser monotonically as the window widens", () => {
    let previous = -Infinity;
    for (const width of [10, 100, 1000, 10_000, 100_000]) {
      const choice = pickLevel(levels, { start: 0, end: width })!;
      const resolution = Math.abs(choice.level.period) * choice.step;
      expect(resolution).toBeGreaterThanOrEqual(previous);
      previous = resolution;
    }
  });

  it("falls back to striding a single-level dataset", () => {
    // No pyramid: the level cannot absorb the zoom, so the stride must.
    const single = buildTraceLevels(
      [{ level: 0, shape: [1_000_000], toParent: { __typename: "ScaleTransformation", scale: [1] }, store: { id: "a" } }],
      0,
      timeMap,
    );
    const choice = pickLevel(single, { start: 0, end: 100_000 })!;
    expect(choice.level.level).toBe(0);
    expect(choice.step).toBeGreaterThan(1);
    expect(choice.points).toBeLessThanOrEqual(TARGET_POINTS);
  });

  it("honours a forced level, for a 'show me raw' control", () => {
    const choice = pickLevel(levels, { start: 0, end: 100_000 }, { forcedLevel: 0 })!;
    expect(choice.level.level).toBe(0);
  });

  it("is null when there are no levels or the window misses the data", () => {
    expect(pickLevel([], { start: 0, end: 1 })).toBeNull();
    expect(pickLevel(levels, { start: 1e9, end: 2e9 })).toBeNull();
  });
});

describe("sameRead", () => {
  it("treats two nulls as the same and one null as different", () => {
    expect(sameRead(null, null)).toBe(true);
    const choice = pickLevel(
      buildTraceLevels(pyramid(3, 10_000), 0, timeMap),
      { start: 0, end: 100 },
    );
    expect(sameRead(choice, null)).toBe(false);
  });
});
