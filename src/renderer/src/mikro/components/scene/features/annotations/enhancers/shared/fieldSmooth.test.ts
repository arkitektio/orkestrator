import { describe, expect, it } from "vitest";

import type { CorridorBox } from "./corridorPlan";
import { corridorIndex } from "./corridorPlan";
import { INF_COST } from "./corridorCost";
import { smoothCostField } from "./fieldSmooth";

const box: CorridorBox = { origin: [0, 0, 0], size: [7, 7, 7] };
const at = (field: Float32Array, x: number, y: number, z: number) =>
  field[corridorIndex(box, x, y, z)];

describe("smoothCostField", () => {
  it("radius 0 is the clamped identity", () => {
    const cost = new Float32Array(343).fill(0.2);
    cost[0] = INF_COST;
    const out = smoothCostField({ cost, box, radius: 0, clampValue: 1 });
    expect(out).not.toBe(cost);
    expect(at(out, 0, 0, 0)).toBe(1); // clamped, not 1e30
    expect(at(out, 3, 3, 3)).toBeCloseTo(0.2);
    expect(cost[0]).toBe(INF_COST); // input untouched
  });

  it("leaves a constant field constant (edge replication, exact window)", () => {
    const cost = new Float32Array(343).fill(0.4);
    const out = smoothCostField({ cost, box, radius: 2, clampValue: 1 });
    for (const v of out) expect(v).toBeCloseTo(0.4, 6);
  });

  it("spreads a spike into the exact separable box average", () => {
    const cost = new Float32Array(343).fill(0);
    cost[corridorIndex(box, 3, 3, 3)] = 27;
    const out = smoothCostField({ cost, box, radius: 1, clampValue: 100 });
    // A 3-tap box per axis: every voxel of the 3³ neighbourhood gets 27/27.
    for (let z = 2; z <= 4; z += 1) {
      for (let y = 2; y <= 4; y += 1) {
        for (let x = 2; x <= 4; x += 1) {
          expect(at(out, x, y, z)).toBeCloseTo(1, 6);
        }
      }
    }
    expect(at(out, 0, 3, 3)).toBeCloseTo(0, 6); // outside the window
  });

  it("softens INF walls at the clamp, never at 1e30", () => {
    const cost = new Float32Array(343).fill(0.1);
    for (let z = 0; z < 7; z += 1) {
      for (let y = 0; y < 7; y += 1) {
        cost[corridorIndex(box, 6, y, z)] = INF_COST;
      }
    }
    const out = smoothCostField({ cost, box, radius: 1, clampValue: 2 });
    // Next to the wall: mix of 0.1 and the CLAMPED 2 — bounded, not enormous.
    expect(at(out, 5, 3, 3)).toBeGreaterThan(0.1);
    expect(at(out, 5, 3, 3)).toBeLessThan(2);
    for (const v of out) expect(v).toBeLessThanOrEqual(2);
  });
});
