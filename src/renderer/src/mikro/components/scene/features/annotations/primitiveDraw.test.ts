import { describe, expect, it } from "vitest";
import {
  ellipsoidCrossSectionScale,
  planarRadius,
  primitiveCornerVectors,
  spatialRadius,
} from "./primitiveDraw";

describe("primitiveCornerVectors", () => {
  it("builds symmetric bounding corners around the center", () => {
    expect(primitiveCornerVectors([10, -4, 2.5], 2)).toEqual([
      [8, -6, 0.5],
      [12, -2, 4.5],
    ]);
  });

  it("collapses to the center at radius 0", () => {
    expect(primitiveCornerVectors([1, 2, 3], 0)).toEqual([
      [1, 2, 3],
      [1, 2, 3],
    ]);
  });

  it("treats a negative radius as its magnitude", () => {
    expect(primitiveCornerVectors([0, 0, 0], -3)).toEqual([
      [-3, -3, -3],
      [3, 3, 3],
    ]);
  });
});

describe("planarRadius", () => {
  it("measures XY distance and ignores z", () => {
    expect(planarRadius([0, 0, 5], [3, 4, -100])).toBe(5);
  });
});

describe("ellipsoidCrossSectionScale", () => {
  it("is the full radius at the equator", () => {
    expect(ellipsoidCrossSectionScale(10, 10, 4)).toBe(1);
  });

  it("shrinks towards the poles", () => {
    // Half way up: sqrt(1 - 0.25).
    expect(ellipsoidCrossSectionScale(12, 10, 4)).toBeCloseTo(Math.sqrt(0.75), 10);
    // Symmetric below the equator.
    expect(ellipsoidCrossSectionScale(8, 10, 4)).toBeCloseTo(Math.sqrt(0.75), 10);
    // At 60% of the radius the circle is 80% wide — the 3-4-5 case.
    expect(ellipsoidCrossSectionScale(12.4, 10, 4)).toBeCloseTo(0.8, 10);
  });

  it("closes to a point at the pole", () => {
    expect(ellipsoidCrossSectionScale(14, 10, 4)).toBe(0);
    expect(ellipsoidCrossSectionScale(6, 10, 4)).toBe(0);
  });

  it("cuts nothing past the pole, or with no depth to cut", () => {
    expect(ellipsoidCrossSectionScale(14.1, 10, 4)).toBeNull();
    expect(ellipsoidCrossSectionScale(0, 10, 4)).toBeNull();
    expect(ellipsoidCrossSectionScale(10, 10, 0)).toBeNull();
  });

  it("reads a negative radius as its magnitude", () => {
    expect(ellipsoidCrossSectionScale(12, 10, -4)).toBeCloseTo(Math.sqrt(0.75), 10);
  });
});

describe("spatialRadius", () => {
  it("counts the z the camera-facing sizing plane legitimately introduces", () => {
    expect(spatialRadius([0, 0, 0], [3, 4, 12])).toBe(13);
  });

  it("agrees with planarRadius when the cursor stays on the anchor's plane", () => {
    expect(spatialRadius([1, 2, 5], [4, 6, 5])).toBe(planarRadius([1, 2, 5], [4, 6, 5]));
  });
});
