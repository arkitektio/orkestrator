import { describe, expect, it } from "vitest";

import { marchField, meshToField, createField } from "./sculptField";
import {
  applyStamp,
  boxStamp,
  capsuleChainStamp,
  ellipsoidStamp,
  halfspaceStamp,
  orientedEllipsoidStamp,
  smoothInSphere,
  sphereStamp,
  stampToField,
  taperedChainStamp,
} from "./stamps";
import type { DesignGeometry } from "../store/meshDesignStore";

const signedVolume = (g: DesignGeometry): number => {
  let volume = 0;
  const p = g.positions;
  for (let t = 0; t + 2 < g.indices.length; t += 3) {
    const a = g.indices[t] * 3, b = g.indices[t + 1] * 3, c = g.indices[t + 2] * 3;
    volume +=
      (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
        p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
        p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
  }
  return volume;
};

describe("stamps", () => {
  it("a sphere stamp marches to the right volume", () => {
    const field = stampToField(sphereStamp([0, 0, 0], 6), 0.4);
    const out = marchField(field, "cubes");
    const analytic = (4 / 3) * Math.PI * 6 ** 3;
    expect(Math.abs(signedVolume(out) - analytic) / analytic).toBeLessThan(0.05);
  });

  it("a box stamp marches to the right volume and stays inside its bounds", () => {
    const field = stampToField(boxStamp([0, 0, 0], [4, 3, 2]), 0.4);
    const out = marchField(field, "cubes");
    expect(Math.abs(signedVolume(out) - 8 * 4 * 3 * 2) / (8 * 4 * 3 * 2)).toBeLessThan(0.06);
    for (let v = 0; v < out.positions.length; v += 3) {
      expect(Math.abs(out.positions[v])).toBeLessThan(4.5);
      expect(Math.abs(out.positions[v + 2])).toBeLessThan(2.5);
    }
  });

  it("subtracting a capsule chain carves through an added sphere", () => {
    let field = stampToField(sphereStamp([0, 0, 0], 6), 0.4);
    const before = signedVolume(marchField(field, "cubes"));
    field = applyStamp(field, capsuleChainStamp([[-8, 0, 0], [8, 0, 0]], 2), "subtract");
    const after = signedVolume(marchField(field, "cubes"));
    expect(after).toBeLessThan(before * 0.95);
  });

  it("a halfspace subtract cuts the sphere roughly in half", () => {
    let field = stampToField(sphereStamp([0, 0, 0], 6), 0.4);
    const before = signedVolume(marchField(field, "cubes"));
    field = applyStamp(field, halfspaceStamp([1, 0, 0], 0), "subtract");
    const out = marchField(field, "cubes");
    expect(Math.abs(signedVolume(out) - before / 2) / before).toBeLessThan(0.06);
    // The x < 0 half-space is the removed one; the kept hemisphere sits at x >= 0.
    for (let v = 0; v < out.positions.length; v += 3) expect(out.positions[v]).toBeGreaterThan(-0.5);
  });

  it("adding grows the field; a miss returns the identical field", () => {
    let field = stampToField(sphereStamp([0, 0, 0], 3), 0.5);
    const size = field.size[0];
    field = applyStamp(field, sphereStamp([20, 0, 0], 3), "add");
    expect(field.size[0]).toBeGreaterThan(size);
    expect(applyStamp(field, sphereStamp([100, 100, 100], 2), "subtract")).toBe(field);
  });

  it("smoothInSphere relaxes a spike without moving distant cells", () => {
    const field = stampToField(sphereStamp([0, 0, 0], 5), 0.5);
    const spiked = { ...field, data: Float32Array.from(field.data) };
    // The cell nearest world (0,0,0) — safely inside the smoothing sphere.
    const cell = (w: number) => Math.round((w - field.min[0]) / field.spacing - 0.5);
    const i = cell(0) + cell(0) * field.size[0] + cell(0) * field.size[0] * field.size[1];
    spiked.data[i] = field.band; // a pit punched into the middle
    const smoothed = smoothInSphere(spiked, [0, 0, 0], 3);
    expect(smoothed).not.toBe(spiked);
    expect(smoothed.data[i]).toBeLessThan(spiked.data[i]);
    expect(smoothed.data[0]).toBe(spiked.data[0]);
  });

  it("an empty region stamp on a fresh field stays empty on subtract", () => {
    const field = createField([0, 0, 0], [10, 10, 10], 1);
    expect(applyStamp(field, sphereStamp([5, 5, 5], 2), "subtract")).toBe(field);
    expect(meshToField).toBeTypeOf("function");
  });

  it("a tapered chain at constant radius is the capsule chain", () => {
    const points = [[0, 0, 0], [6, 2, 0], [9, 2, 5]] as const;
    const capsule = capsuleChainStamp(points, 1.5);
    const tapered = taperedChainStamp(points, [1.5, 1.5, 1.5]);
    for (const [x, y, z] of [[0, 0, 0], [3, 3, 1], [-2, 0, 0], [9, 4, 6], [7, 2, 2.5], [20, 0, 0]]) {
      expect(tapered.sdf(x, y, z)).toBeCloseTo(capsule.sdf(x, y, z), 9);
    }
    expect(tapered.min).toEqual(capsule.min);
    expect(tapered.max).toEqual(capsule.max);
  });

  it("a tapered chain is each end's sphere at its end and a cone between", () => {
    const stamp = taperedChainStamp([[0, 0, 0], [10, 0, 0]], [1, 3]);
    // Behind the thin end and beyond the thick one: plain sphere distances.
    expect(stamp.sdf(-4, 0, 0)).toBeCloseTo(3, 9);
    expect(stamp.sdf(15, 0, 0)).toBeCloseTo(2, 9);
    // On the surface points the two spheres share with the cone, distance 0.
    const sin = (3 - 1) / 10;
    const cos = Math.sqrt(1 - sin * sin);
    expect(stamp.sdf(0 - 1 * sin, 1 * cos, 0)).toBeCloseTo(0, 9);
    expect(stamp.sdf(10 - 3 * sin, 3 * cos, 0)).toBeCloseTo(0, 9);
    // Inside is negative, and the widening shows half way along.
    expect(stamp.sdf(5, 0, 0)).toBeLessThan(-1.9);
    expect(stamp.sdf(5, 2.5, 0)).toBeGreaterThan(0);
    expect(stamp.sdf(5, 1.5, 0)).toBeLessThan(0);
  });

  it("a tapered chain marches to a closed tube of about the right volume", () => {
    const out = marchField(stampToField(taperedChainStamp([[0, 0, 0], [20, 0, 0]], [2, 4]), 0.4), "cubes");
    // Frustum between the tangent circles plus the two end caps ≈ the
    // frustum of the two radii over the length plus two half-spheres.
    const frustum = (Math.PI * 20 * (2 * 2 + 2 * 4 + 4 * 4)) / 3;
    const caps = (2 / 3) * Math.PI * (2 ** 3 + 4 ** 3);
    const analytic = frustum + caps;
    expect(Math.abs(signedVolume(out) - analytic) / analytic).toBeLessThan(0.08);
  });

  it("an oriented ellipsoid at identity is the axis-aligned one", () => {
    const aligned = ellipsoidStamp([1, 2, 3], [5, 3, 2]);
    const oriented = orientedEllipsoidStamp([1, 2, 3], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [5, 3, 2]);
    for (const [x, y, z] of [[1, 2, 3], [6, 2, 3], [1, 6, 3], [0, 0, 0], [9, 9, 9]]) {
      expect(oriented.sdf(x, y, z)).toBeCloseTo(aligned.sdf(x, y, z), 9);
    }
    expect(oriented.min).toEqual(aligned.min);
    expect(oriented.max).toEqual(aligned.max);
  });

  it("an oriented ellipsoid turns with its axes and its box contains it", () => {
    const r = Math.SQRT1_2;
    const stamp = orientedEllipsoidStamp([0, 0, 0], [[r, r, 0], [-r, r, 0], [0, 0, 1]], [6, 2, 1]);
    expect(stamp.sdf(6 * r, 6 * r, 0)).toBeCloseTo(0, 9); // tip of the long axis
    expect(stamp.sdf(6 * r, -6 * r, 0)).toBeGreaterThan(0); // across it
    expect(stamp.sdf(0, 0, 0)).toBeLessThan(0);
    expect(stamp.max[0]).toBeGreaterThanOrEqual(6 * r - 1e-9);
    expect(stamp.max[0]).toBeLessThan(6);
    const out = marchField(stampToField(stamp, 0.25), "cubes");
    const analytic = (4 / 3) * Math.PI * 6 * 2 * 1;
    expect(Math.abs(signedVolume(out) - analytic) / analytic).toBeLessThan(0.1);
  });

  it("a chain applied part by part is the chain applied whole, cell for cell", () => {
    const points = [[0, 0, 0], [8, 3, 0], [12, 3, 6], [20, -2, 6]] as const;
    for (const chain of [capsuleChainStamp(points, 2), taperedChainStamp(points, [1, 2.5, 1.5, 3])]) {
      expect(chain.parts?.length).toBe(3);
      const whole = { sdf: chain.sdf, min: chain.min, max: chain.max };
      const byParts = stampToField(chain, 0.5);
      const monolithic = stampToField(whole, 0.5);
      expect(byParts.size).toEqual(monolithic.size);
      expect(Array.from(byParts.data)).toEqual(Array.from(monolithic.data));
      // Subtraction too: carve the chain out of a block both ways.
      const block = stampToField(boxStamp([10, 0, 3], [14, 8, 8]), 0.5);
      expect(Array.from(applyStamp(block, chain, "subtract").data)).toEqual(
        Array.from(applyStamp(block, whole, "subtract").data),
      );
    }
  });

  it("returns the same field when a stamp changes nothing", () => {
    const field = stampToField(sphereStamp([0, 0, 0], 4), 0.5);
    expect(applyStamp(field, sphereStamp([0, 0, 0], 2), "add")).toBe(field);
    expect(applyStamp(field, capsuleChainStamp([[40, 40, 40], [44, 40, 40], [48, 40, 40]], 1), "subtract")).toBe(field);
  });
});
