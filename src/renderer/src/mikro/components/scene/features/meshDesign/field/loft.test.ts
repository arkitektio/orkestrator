import { describe, expect, it } from "vitest";

import { marchField } from "./sculptField";
import { loftContours, polygonSdf2 } from "./loft";

const square = (half: number): (readonly [number, number])[] => [
  [-half, -half],
  [half, -half],
  [half, half],
  [-half, half],
];

describe("loft", () => {
  it("polygonSdf2 is negative inside, positive outside, zero-ish on the edge", () => {
    const poly = square(2);
    expect(polygonSdf2(poly, 0, 0)).toBeLessThan(0);
    expect(polygonSdf2(poly, 5, 0)).toBeGreaterThan(0);
    expect(Math.abs(polygonSdf2(poly, 2, 0))).toBeLessThan(1e-6);
  });

  it("lofts two squares into a closed frustum of about the right volume", () => {
    const field = loftContours(
      [
        { points: square(4), z: 0 },
        { points: square(2), z: 6 },
      ],
      0.4,
    );
    const out = marchField(field, "cubes");
    let volume = 0;
    const p = out.positions;
    for (let t = 0; t + 2 < out.indices.length; t += 3) {
      const a = out.indices[t] * 3, b = out.indices[t + 1] * 3, c = out.indices[t + 2] * 3;
      volume +=
        (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
          p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
          p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
    }
    // Frustum of square cross-sections 8×8 → 4×4 over height 6 is 224;
    // SDF interpolation bulges slightly and the closing caps add a half-gap
    // of taper at each end, so accept a generous band around it.
    expect(volume).toBeGreaterThan(200);
    expect(volume).toBeLessThan(340);
    // Cross-section interpolates: halfway up the surface sits between the two.
    for (let v = 0; v < p.length; v += 3) {
      if (Math.abs(p[v + 2] - 3) < 0.3) {
        expect(Math.abs(p[v])).toBeLessThan(3.6);
        expect(Math.max(Math.abs(p[v]), Math.abs(p[v + 1]))).toBeGreaterThan(2.2);
      }
    }
  });

  it("refuses fewer than two contours", () => {
    expect(() => loftContours([{ points: square(2), z: 0 }], 0.5)).toThrow(/two contours/);
  });
});
