import { describe, expect, it } from "vitest";

import { marchField, meshToField, createField } from "./sculptField";
import { applyStamp, boxStamp, capsuleChainStamp, halfspaceStamp, smoothInSphere, sphereStamp, stampToField } from "./stamps";
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
});
