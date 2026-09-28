import { describe, expect, it } from "vitest";

import { eraseNearPolyline, mergeGeometry, polylineDistanceSq } from "./sculpt";

const square = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]),
  indices: new Uint32Array([0, 1, 2, 1, 3, 2]),
};

describe("mergeGeometry", () => {
  it("offsets the second geometry's indices", () => {
    const merged = mergeGeometry(square, square);
    expect(merged.positions).toHaveLength(24);
    expect([...merged.indices]).toEqual([0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6]);
  });
});

describe("polylineDistanceSq", () => {
  it("measures to a point, a segment, and the nearest of several", () => {
    expect(polylineDistanceSq([0, 3, 0], [[0, 0, 0]])).toBe(9);
    expect(polylineDistanceSq([5, 1, 0], [[0, 0, 0], [10, 0, 0]])).toBe(1);
    expect(polylineDistanceSq([12, 0, 0], [[0, 0, 0], [10, 0, 0]])).toBe(4);
    expect(polylineDistanceSq([0, 0, -1], [[5, 5, 5], [9, 9, 9], [0, 0, 0]])).toBe(1);
  });
});

describe("eraseNearPolyline", () => {
  it("returns the same object when nothing is within reach", () => {
    expect(eraseNearPolyline(square, [[50, 50, 50]], 1)).toBe(square);
  });

  it("removes the triangles the stroke passes over and compacts the vertices", () => {
    // The first triangle's centroid is (1/3, 1/3, 0); the second's (2/3, 2/3, 0).
    const out = eraseNearPolyline(square, [[0, 0, 0]], 0.5);
    // Kept triangle [1, 3, 2], vertices renumbered in order of first use.
    expect([...out.indices]).toEqual([0, 1, 2]);
    expect([...out.positions]).toEqual([1, 0, 0, 1, 1, 0, 0, 1, 0]);
  });

  it("can erase everything", () => {
    const out = eraseNearPolyline(square, [[0, 0, 0], [1, 1, 0]], 0.5);
    expect(out.indices).toHaveLength(0);
    expect(out.positions).toHaveLength(0);
  });
});
