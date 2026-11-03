import { describe, expect, it } from "vitest";
import * as THREE from "three";

import { resolveDepthBox } from "./useDepthCodeUniforms";

const box = (min: [number, number, number], max: [number, number, number]) =>
  new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max));

describe("resolveDepthBox", () => {
  it("is the union of the visible layers' boxes", () => {
    expect(resolveDepthBox([box([0, 0, 0], [1, 1, 1]), box([5, -2, 3], [6, 0, 9])], null)).toEqual({
      min: [0, -2, 0],
      max: [6, 1, 9],
    });
  });

  it("is cut to the crop box", () => {
    expect(
      resolveDepthBox([box([0, 0, 0], [10, 10, 10])], { min: [2, 2, 4], max: [3, 30, 6] }),
    ).toEqual({ min: [2, 2, 4], max: [3, 10, 6] });
  });

  it("is null with nothing visible or a crop that misses everything", () => {
    expect(resolveDepthBox([], null)).toBeNull();
    expect(resolveDepthBox([box([0, 0, 0], [1, 1, 1])], { min: [5, 5, 5], max: [6, 6, 6] })).toBeNull();
  });
});
