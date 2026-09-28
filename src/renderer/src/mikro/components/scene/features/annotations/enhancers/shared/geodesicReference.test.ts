import { describe, expect, it } from "vitest";

import type { Vec3 } from "./strokeModel";
import type { CorridorBox } from "./corridorPlan";
import {
  DEFAULT_SKELETON_WEIGHTS,
  INF_COST,
  buildCostField,
} from "./corridorCost";
import { backtrackPath, geodesicField } from "./geodesicReference";

/**
 * A bright L-shaped tube in a dark box: along y=1,z=1 from x=1..8, then up
 * x=8,z=1 from y=1..8. The geodesic between the tube's ends must follow the
 * bright corner rather than cutting diagonally through the dark.
 */
const box: CorridorBox = { origin: [0, 0, 0], size: [10, 10, 3] };
const onTube = (x: number, y: number, z: number) =>
  z === 1 && ((y === 1 && x >= 1 && x <= 8) || (x === 8 && y >= 1 && y <= 8));

const tubeField = (holeAt?: Vec3) =>
  buildCostField({
    box,
    // A corridor generous enough to contain both legs and the diagonal.
    strokeLevelPts: [
      [1.5, 1.5, 1.5],
      [8.5, 1.5, 1.5],
      [8.5, 8.5, 1.5],
    ],
    radiusWorld: 6,
    spacing: [1, 1, 1],
    weights: { ...DEFAULT_SKELETON_WEIGHTS, intensity: 4 },
    sample: ([x, y, z]) => {
      if (holeAt && x === holeAt[0] && y === holeAt[1] && z === holeAt[2]) {
        return null;
      }
      return onTube(x, y, z) ? 1 : 0.05;
    },
  });

describe("geodesicField + backtrackPath", () => {
  it("routes along the bright tube, not the dark diagonal", () => {
    const { cost } = tubeField();
    const field = geodesicField({
      cost,
      box,
      spacing: [1, 1, 1],
      seed: [1, 1, 1],
    });
    const path = backtrackPath(field, box, [8, 8, 1]);
    expect(path).not.toBeNull();
    // Every vertex is a voxel center on the tube: the corner was rounded on
    // the data, not cut through the dark.
    for (const [x, y, z] of path!) {
      expect(onTube(x - 0.5, y - 0.5, z - 0.5)).toBe(true);
    }
    expect(path![0]).toEqual([1.5, 1.5, 1.5]);
    expect(path![path!.length - 1]).toEqual([8.5, 8.5, 1.5]);
  });

  it("detours around a hole instead of crossing it", () => {
    const { cost, holes } = tubeField([4, 1, 1]);
    expect(holes).toBe(1);
    const field = geodesicField({
      cost,
      box,
      spacing: [1, 1, 1],
      seed: [1, 1, 1],
    });
    const path = backtrackPath(field, box, [8, 8, 1]);
    expect(path).not.toBeNull();
    expect(path!.some(([x, y, z]) => x === 4.5 && y === 1.5 && z === 1.5)).toBe(
      false,
    );
  });

  it("leaves unreachable voxels at INF and backtrack answers null", () => {
    // Wall the whole field except the seed.
    const cost = new Float32Array(10 * 10 * 3).fill(INF_COST);
    const seedIndex = 1 + 1 * 10 + 1 * 100;
    cost[seedIndex] = 1;
    const field = geodesicField({
      cost,
      box,
      spacing: [1, 1, 1],
      seed: [1, 1, 1],
    });
    expect(field.dist[seedIndex]).toBe(0);
    expect(backtrackPath(field, box, [8, 8, 1])).toBeNull();
  });

  it("weights steps by world length, preferring cheap xy over long z hops", () => {
    // Uniform brightness; with z spacing 5, a path that could shortcut
    // through z must not: the pure distance metric keeps it in-plane.
    const flatBox: CorridorBox = { origin: [0, 0, 0], size: [5, 5, 3] };
    const cost = new Float32Array(75).fill(1);
    const field = geodesicField({
      cost,
      box: flatBox,
      spacing: [1, 1, 5],
      seed: [0, 0, 1],
    });
    const straight = field.dist[4 + 0 * 5 + 1 * 25]; // 4 xy steps
    const zHop = field.dist[0 + 0 * 5 + 2 * 25]; // 1 z step
    expect(straight).toBeCloseTo(4);
    expect(zHop).toBeCloseTo(5);
  });

  it("is deterministic in its tie-breaks", () => {
    const { cost } = tubeField();
    const run = () =>
      geodesicField({ cost, box, spacing: [1, 1, 1], seed: [1, 1, 1] });
    const a = run();
    const b = run();
    expect(a.dist).toEqual(b.dist);
    expect(a.pred).toEqual(b.pred);
  });
});
