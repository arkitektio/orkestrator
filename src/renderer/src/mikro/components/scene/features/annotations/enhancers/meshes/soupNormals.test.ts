import { describe, expect, it } from "vitest";

import type { CorridorBox } from "../shared/corridorPlan";
import { corridorIndex } from "../shared/corridorPlan";
import { MARCHERS } from "./marcher";
import { smoothSoupNormals } from "./soupNormals";

describe("smoothSoupNormals", () => {
  it("points radially outward on a marched sphere and agrees at shared corners", () => {
    const box: CorridorBox = { origin: [0, 0, 0], size: [16, 16, 16] };
    const cost = new Float32Array(16 * 16 * 16);
    for (let z = 0; z < 16; z += 1) {
      for (let y = 0; y < 16; y += 1) {
        for (let x = 0; x < 16; x += 1) {
          cost[corridorIndex(box, x, y, z)] = Math.hypot(x + 0.5 - 8, y + 0.5 - 8, z + 0.5 - 8);
        }
      }
    }
    const { positions } = MARCHERS.cubes.march({ cost, box, iso: 6 });
    const normals = smoothSoupNormals(positions);
    expect(normals).toHaveLength(positions.length);

    const byKey = new Map<string, [number, number, number]>();
    for (let v = 0; v < positions.length; v += 3) {
      const rx = positions[v] - 8;
      const ry = positions[v + 1] - 8;
      const rz = positions[v + 2] - 8;
      const r = Math.hypot(rx, ry, rz);
      const dot = (normals[v] * rx + normals[v + 1] * ry + normals[v + 2] * rz) / r;
      expect(dot).toBeGreaterThan(0.95);
      // Every soup corner at the same position carries the same normal.
      const key = `${positions[v].toFixed(4)},${positions[v + 1].toFixed(4)},${positions[v + 2].toFixed(4)}`;
      const seen = byKey.get(key);
      if (seen) {
        expect(seen[0]).toBeCloseTo(normals[v], 6);
        expect(seen[1]).toBeCloseTo(normals[v + 1], 6);
        expect(seen[2]).toBeCloseTo(normals[v + 2], 6);
      } else {
        byKey.set(key, [normals[v], normals[v + 1], normals[v + 2]]);
      }
    }
  });

  it("handles a degenerate or empty soup", () => {
    expect(smoothSoupNormals(new Float32Array(0))).toHaveLength(0);
    const flat = smoothSoupNormals(new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]));
    expect([...flat]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
