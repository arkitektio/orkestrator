import { describe, expect, it } from "vitest";
import {
  buildTraceCost,
  DEFAULT_TRACE_WEIGHTS,
  MAX_TRACE_COST,
  type TraceWeights,
} from "./traceCost";
import { findTracePath } from "./traceSearch";

const SIZE: [number, number, number] = [5, 5, 1];
const SPACING: [number, number, number] = [1, 1, 1];

const weights = (overrides: Partial<TraceWeights> = {}): TraceWeights => ({
  intensity: 0,
  gradient: 0,
  straightness: 0,
  invert: false,
  ...overrides,
});

const build = (
  values: number[],
  w: TraceWeights,
  start: [number, number, number] = [0, 0, 0],
  goal: [number, number, number] = [4, 4, 0],
) =>
  buildTraceCost({
    values: Float32Array.from(values),
    size: SIZE,
    spacing: SPACING,
    weights: w,
    start,
    goal,
  });

/** 5x5 flat field with one bright row (y = 2). */
const brightRow = () => {
  const values = new Array(25).fill(0);
  for (let x = 0; x < 5; x += 1) values[x + 2 * 5] = 1;
  return values;
};

describe("intensity term", () => {
  it("makes bright voxels cheap and dark ones expensive", () => {
    const cost = build(brightRow(), weights({ intensity: 1 }));
    expect(cost[0 + 2 * 5]).toBeCloseTo(0, 6); // bright
    expect(cost[0 + 0 * 5]).toBeCloseTo(1, 6); // dark
  });

  it("inverts on request — dark structures on a bright background", () => {
    const cost = build(brightRow(), weights({ intensity: 1, invert: true }));
    expect(cost[0 + 2 * 5]).toBeCloseTo(1, 6);
    expect(cost[0 + 0 * 5]).toBeCloseTo(0, 6);
  });

  it("says nothing about a flat box rather than calling it all bad", () => {
    const cost = build(new Array(25).fill(7), weights({ intensity: 1 }));
    expect([...cost].every((value) => value === 0)).toBe(true);
  });

  it("normalizes against the box, not an absolute range", () => {
    // Values 100..104: the dimmest is still cost 1, the brightest still 0.
    const values = Array.from({ length: 25 }, (_, index) => 100 + (index % 5));
    const cost = build(values, weights({ intensity: 1 }));
    expect(cost[0]).toBeCloseTo(1, 6);
    expect(cost[4]).toBeCloseTo(0, 6);
  });
});

describe("gradient term", () => {
  it("makes boundaries cheap and flat interiors expensive", () => {
    // Step edge down the middle: x < 2 dark, x >= 2 bright.
    const values = new Array(25).fill(0);
    for (let y = 0; y < 5; y += 1) {
      for (let x = 2; x < 5; x += 1) values[x + y * 5] = 1;
    }
    const cost = build(values, weights({ gradient: 1 }));
    // Cheapest at the step, most expensive deep inside a flat region.
    expect(cost[1 + 2 * 5]).toBeLessThan(cost[4 + 2 * 5]);
    expect(cost[4 + 2 * 5]).toBeCloseTo(1, 6); // no gradient at all
  });

  it("ignores a missing neighbour instead of reading it as a step", () => {
    const values = new Array(25).fill(1);
    values[1 + 2 * 5] = Number.NaN;
    const cost = build(values, weights({ gradient: 1 }));
    // The hole is impassable, and its neighbour saw no artificial edge: the
    // whole (flat) box is uniformly gradient-free.
    expect(cost[1 + 2 * 5]).toBe(Infinity);
    expect(cost[0 + 2 * 5]).toBeCloseTo(cost[4 + 4 * 5], 6);
  });
});

describe("straightness term", () => {
  it("costs nothing on the chord and rises with distance from it", () => {
    const cost = build(new Array(25).fill(0), weights({ straightness: 1 }), [0, 0, 0], [4, 0, 0]);
    expect(cost[2 + 0 * 5]).toBeCloseTo(0, 6); // on the chord
    expect(cost[2 + 1 * 5]).toBeGreaterThan(0);
    expect(cost[2 + 2 * 5]).toBeGreaterThan(cost[2 + 1 * 5]);
  });

  it("saturates at half the hop's length, so weights stay comparable", () => {
    // Hop of length 4 → tolerance 2 → a node 3 away is clamped at 1.
    const cost = build(new Array(25).fill(0), weights({ straightness: 1 }), [0, 0, 0], [4, 0, 0]);
    expect(cost[0 + 3 * 5]).toBeCloseTo(1, 6);
    expect(cost[0 + 4 * 5]).toBeCloseTo(1, 6);
  });

  it("measures distance from the chord in WORLD units, not in voxels", () => {
    // 4x longer voxels in z. A one-voxel step sideways is 1 unit off the
    // chord; the same step through depth is 4 — so depth saturates first, and
    // a trace does not wander a slice away just because it is "one voxel".
    const size: [number, number, number] = [5, 3, 3];
    const spacing: [number, number, number] = [1, 1, 4];
    const cost = buildTraceCost({
      values: new Float32Array(45),
      size,
      spacing,
      weights: weights({ straightness: 1 }),
      start: [0, 1, 1],
      goal: [4, 1, 1],
    });
    const at = (x: number, y: number, z: number) => cost[x + y * 5 + z * 15];

    expect(at(2, 1, 1)).toBeCloseTo(0, 6); // on the chord
    // Tolerance is half the 4-unit hop, so 1 unit off reads 0.5...
    expect(at(2, 2, 1)).toBeCloseTo(0.5, 6);
    // ...and 4 units off is past saturation.
    expect(at(2, 1, 2)).toBeCloseTo(1, 6);
  });

  it("has no opinion when the waypoints coincide", () => {
    const cost = build(new Array(25).fill(0), weights({ straightness: 1 }), [2, 2, 0], [2, 2, 0]);
    expect([...cost].every((value) => value === 0)).toBe(true);
  });
});

describe("combination", () => {
  it("keeps unsampled voxels impassable whatever the weights", () => {
    const values = new Array(25).fill(1);
    values[7] = Number.NaN;
    expect(build(values, weights())[7]).toBe(Infinity);
    expect(build(values, DEFAULT_TRACE_WEIGHTS)[7]).toBe(Infinity);
  });

  it("clamps the combined term so no weighting explodes the metric", () => {
    const cost = build(
      brightRow(),
      weights({ intensity: 10, gradient: 10, straightness: 10 }),
    );
    expect(Math.max(...cost)).toBeLessThanOrEqual(MAX_TRACE_COST);
  });

  it("adds the terms rather than averaging them — weights are absolute", () => {
    // [4, 0, 0] is dark AND far off the chord from [0,0,0] to [4,4,0], so both
    // terms have something to say about it.
    const corner = 4 + 0 * 5;
    const only = build(brightRow(), weights({ intensity: 1 }))[corner];
    const both = build(brightRow(), weights({ intensity: 1, straightness: 1 }))[corner];
    expect(both).toBeGreaterThan(only);
  });
});

describe("with the search", () => {
  it("threads a bright filament instead of cutting straight across", () => {
    // Bright row at y = 2; endpoints at its ends but offset in y, so the
    // straight line would leave the filament.
    const values = new Array(25).fill(0);
    for (let x = 0; x < 5; x += 1) values[x + 2 * 5] = 1;
    const cost = buildTraceCost({
      values: Float32Array.from(values),
      size: SIZE,
      spacing: SPACING,
      weights: weights({ intensity: 1 }),
      start: [0, 0, 0],
      goal: [4, 4, 0],
    });

    const result = findTracePath({ size: SIZE, spacing: SPACING, cost }, [0, 0, 0], [4, 4, 0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // It gets onto the filament and travels along it.
    expect(result.path.filter(([, y]) => y === 2).length).toBeGreaterThanOrEqual(3);
  });

  it("straightness pulls the same trace back toward the chord", () => {
    const values = new Array(25).fill(0);
    for (let x = 0; x < 5; x += 1) values[x + 2 * 5] = 1;
    const straight = buildTraceCost({
      values: Float32Array.from(values),
      size: SIZE,
      spacing: SPACING,
      weights: weights({ intensity: 1, straightness: 4 }),
      start: [0, 0, 0],
      goal: [4, 0, 0],
    });

    const result = findTracePath({ size: SIZE, spacing: SPACING, cost: straight }, [0, 0, 0], [4, 0, 0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The filament is two rows away; with a heavy straightness weight the
    // trace stays on the chord instead of detouring to it.
    expect(result.path.every(([, y]) => y <= 1)).toBe(true);
  });
});
