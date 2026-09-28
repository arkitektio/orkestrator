import { describe, expect, it } from "vitest";

import type { Vec3 } from "./strokeModel";
import type { CorridorBox } from "./corridorPlan";
import {
  DEFAULT_SKELETON_WEIGHTS,
  INF_COST,
  SKELETON_BASE_COST,
  buildCostField,
  connectivityFromCost,
  inCorridor,
  maskFieldByDistance,
  segmentDistanceSq,
  voxelCost,
} from "./corridorCost";

describe("voxelCost", () => {
  it("prices bright at the base cost and dark at base + weight", () => {
    const weights = { intensity: 2, exponent: 2 };
    expect(voxelCost(1, weights)).toBeCloseTo(SKELETON_BASE_COST);
    expect(voxelCost(0, weights)).toBeCloseTo(SKELETON_BASE_COST + 2);
  });

  it("clamps intensity into [0, 1]", () => {
    const weights = DEFAULT_SKELETON_WEIGHTS;
    expect(voxelCost(7, weights)).toBe(voxelCost(1, weights));
    expect(voxelCost(-3, weights)).toBe(voxelCost(0, weights));
  });

  it("shapes contrast with the exponent", () => {
    // Same darkness, higher exponent → cheaper: only the truly dark resists.
    expect(voxelCost(0.5, { intensity: 1, exponent: 4 })).toBeLessThan(
      voxelCost(0.5, { intensity: 1, exponent: 1 }),
    );
  });
});

describe("segmentDistanceSq", () => {
  it("measures to the segment interior, not the endpoints", () => {
    const d = segmentDistanceSq([5, 3, 0], [0, 0, 0], [10, 0, 0], [1, 1, 1]);
    expect(d).toBeCloseTo(9);
  });

  it("clamps past the endpoints", () => {
    const d = segmentDistanceSq([-4, 0, 0], [0, 0, 0], [10, 0, 0], [1, 1, 1]);
    expect(d).toBeCloseTo(16);
  });

  it("scales each axis by its spacing", () => {
    // 1 voxel off in z at 4 µm spacing is 16 µm², not 1.
    const d = segmentDistanceSq([0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 1, 4]);
    expect(d).toBeCloseTo(16);
  });

  it("degenerates to point distance for a zero-length segment", () => {
    const d = segmentDistanceSq([3, 4, 0], [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    expect(d).toBeCloseTo(25);
  });
});

describe("inCorridor", () => {
  const stroke: Vec3[] = [
    [0.5, 5.5, 5.5],
    [10.5, 5.5, 5.5],
  ];

  it("accepts voxels whose center is within the tube and rejects the rest", () => {
    expect(inCorridor([5, 5, 5], stroke, 2, [1, 1, 1])).toBe(true);
    expect(inCorridor([5, 9, 5], stroke, 2, [1, 1, 1])).toBe(false);
  });

  it("handles a single-point stroke as a sphere", () => {
    expect(inCorridor([5, 5, 5], [[5.5, 5.5, 5.5]], 1, [1, 1, 1])).toBe(true);
    expect(inCorridor([8, 5, 5], [[5.5, 5.5, 5.5]], 1, [1, 1, 1])).toBe(false);
  });
});

describe("connectivityFromCost", () => {
  it("binarizes: bright travels free, dark costs 1, walls stay walls", () => {
    // Values chosen to be exactly representable in f32.
    const iso = 0.5;
    const cost = Float32Array.from([0.25, 0.5, 0.75, 1.5, INF_COST]);
    expect(Array.from(connectivityFromCost(cost, iso))).toEqual([
      0,
      0, // exactly at iso is inside — matches the tube's `<= iso`
      1,
      1,
      INF_COST,
    ]);
  });
});

describe("maskFieldByDistance", () => {
  it("walls off voxels beyond the gap limit, passes the rest through", () => {
    const field = Float32Array.from([0.25, 0.5, 0.75]);
    const dist = Float32Array.from([0, 1.5, INF_COST]);
    const out = maskFieldByDistance(field, dist, 1.0, 9);
    expect(Array.from(out)).toEqual([0.25, 9, 9]);
    expect(field[1]).toBe(0.5); // input untouched
  });
});

describe("buildCostField", () => {
  const box: CorridorBox = { origin: [0, 0, 0], size: [12, 11, 11] };
  const stroke: Vec3[] = [
    [0.5, 5.5, 5.5],
    [11.5, 5.5, 5.5],
  ];

  it("prices the tube, walls the outside, and counts holes only inside", () => {
    // Bright along the stroke axis, one unresident voxel inside the tube.
    const { cost, holes } = buildCostField({
      box,
      strokeLevelPts: stroke,
      radiusWorld: 2,
      spacing: [1, 1, 1],
      weights: DEFAULT_SKELETON_WEIGHTS,
      sample: ([x, y, z]) => {
        if (x === 6 && y === 5 && z === 5) return null; // hole in the tube
        return y === 5 && z === 5 ? 1 : 0.1;
      },
    });

    const at = (x: number, y: number, z: number) =>
      cost[x + y * box.size[0] + z * box.size[0] * box.size[1]];

    expect(at(3, 5, 5)).toBeCloseTo(SKELETON_BASE_COST); // bright core
    expect(at(3, 4, 5)).toBeGreaterThan(SKELETON_BASE_COST); // dark, in tube
    expect(at(3, 4, 5)).toBeLessThan(INF_COST);
    expect(at(6, 5, 5)).toBe(INF_COST); // the hole is impassable...
    expect(holes).toBe(1); // ...and counted once
    expect(at(0, 0, 0)).toBe(INF_COST); // outside the tube: walled, no hole
  });
});
