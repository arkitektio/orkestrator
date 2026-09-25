import { describe, expect, it } from "vitest";

import { appendSample, resampleStroke, type BrushSample } from "./strokeModel";

const sample = (
  world: [number, number, number],
  voxel: [number, number, number] = [0, 0, 0],
): BrushSample => ({ world, voxel });

describe("appendSample", () => {
  it("always keeps the first sample", () => {
    const stroke: BrushSample[] = [];
    expect(appendSample(stroke, sample([0, 0, 0]), 1)).toBe(true);
    expect(stroke).toHaveLength(1);
  });

  it("drops a sample that neither moved nor changed voxel", () => {
    const stroke: BrushSample[] = [];
    appendSample(stroke, sample([0, 0, 0], [5, 5, 5]), 1);
    expect(appendSample(stroke, sample([0.1, 0, 0], [5, 5, 5]), 1)).toBe(false);
    expect(stroke).toHaveLength(1);
  });

  it("keeps a sample on voxel change even under the distance floor", () => {
    const stroke: BrushSample[] = [];
    appendSample(stroke, sample([0, 0, 0], [5, 5, 5]), 1);
    expect(appendSample(stroke, sample([0.1, 0, 0], [6, 5, 5]), 1)).toBe(true);
    expect(stroke).toHaveLength(2);
  });

  it("keeps a sample that moved far enough within the same voxel", () => {
    const stroke: BrushSample[] = [];
    appendSample(stroke, sample([0, 0, 0], [5, 5, 5]), 1);
    expect(appendSample(stroke, sample([2, 0, 0], [5, 5, 5]), 1)).toBe(true);
  });

  it("degrades a zero floor to voxel-change-only, not keep-everything", () => {
    const stroke: BrushSample[] = [];
    appendSample(stroke, sample([0, 0, 0], [5, 5, 5]), 0);
    expect(appendSample(stroke, sample([0.1, 0, 0], [5, 5, 5]), 0)).toBe(false);
    expect(appendSample(stroke, sample([0.1, 0, 0], [6, 5, 5]), 0)).toBe(true);
  });
});

describe("resampleStroke", () => {
  it("returns short strokes untouched", () => {
    const stroke = [sample([0, 0, 0]), sample([1, 0, 0])];
    expect(resampleStroke(stroke, 16)).toEqual([
      [0, 0, 0],
      [1, 0, 0],
    ]);
  });

  it("keeps the endpoints exactly and spaces evenly by arc length", () => {
    // A dense cluster near the start must not attract the resampled points:
    // spacing is by arc length, not by input index.
    const stroke = [
      sample([0, 0, 0]),
      sample([0.01, 0, 0]),
      sample([0.02, 0, 0]),
      sample([0.03, 0, 0]),
      sample([10, 0, 0]),
    ];
    const out = resampleStroke(stroke, 3);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual([0, 0, 0]);
    expect(out[2]).toEqual([10, 0, 0]);
    expect(out[1][0]).toBeCloseTo(5, 5);
  });

  it("collapses a zero-length stroke to its endpoints", () => {
    const stroke = Array.from({ length: 10 }, () => sample([3, 3, 3]));
    expect(resampleStroke(stroke, 4)).toEqual([
      [3, 3, 3],
      [3, 3, 3],
    ]);
  });
});
