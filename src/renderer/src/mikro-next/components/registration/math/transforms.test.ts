/** mat4 · decompose · constraints · fit — the small algebra the panels lean on. */
import { describe, expect, it } from "vitest";
import {
  allowedHandles,
  constrainParts,
  describeSession,
  nearestRotation,
  projectToConstraint,
} from "./constraints";
import { composeAboutPivot, decomposeAboutPivot, IDENTITY_PARTS, type DeltaParts } from "./decompose";
import { fitDelta, unionBoxes } from "./fit";
import {
  aboutPivot,
  applyPoint,
  approxEqual,
  det3,
  identity,
  invert,
  isIdentity,
  linear3,
  mul,
  rotationAxisAngle,
  scaling,
  type Mat4,
  type Vec3,
} from "./mat4";

const PIVOT: Vec3 = [120, -45, 30];

describe("mat4", () => {
  it("aboutPivot leaves the pivot where it was", () => {
    const g = aboutPivot(mul(rotationAxisAngle([1, 2, 3], 0.7), scaling([2, 2, 2])), PIVOT);
    applyPoint(g, PIVOT).forEach((value, i) => expect(value).toBeCloseTo(PIVOT[i], 9));
  });

  it("inverts an affine and refuses a singular one", () => {
    const m = aboutPivot(rotationAxisAngle([0, 0, 1], 1.1), PIVOT);
    expect(isIdentity(mul(m, invert(m)!), 1e-9)).toBe(true);
    expect(invert(scaling([1, 0, 1]))).toBeNull();
  });

  it("rotates counter-clockwise about +z", () => {
    const p = applyPoint(rotationAxisAngle([0, 0, 1], Math.PI / 2), [1, 0, 0]);
    expect(p[0]).toBeCloseTo(0, 12);
    expect(p[1]).toBeCloseTo(1, 12);
  });
});

describe("decomposeAboutPivot", () => {
  const parts: DeltaParts = {
    translation: [5, -6, 7],
    rotation: [12, -34, 56],
    scale: [2, 0.5, 1.25],
    shear: [0.1, -0.2, 0.3],
    reflected: false,
  };

  it("round-trips compose → decompose → compose", () => {
    const delta = composeAboutPivot(parts, PIVOT);
    const back = decomposeAboutPivot(delta, PIVOT)!;
    back.translation.forEach((v, i) => expect(v).toBeCloseTo(parts.translation[i], 9));
    back.rotation.forEach((v, i) => expect(v).toBeCloseTo(parts.rotation[i], 9));
    back.scale.forEach((v, i) => expect(v).toBeCloseTo(parts.scale[i], 9));
    back.shear.forEach((v, i) => expect(v).toBeCloseTo(parts.shear[i], 9));
    expect(approxEqual(composeAboutPivot(back, PIVOT), delta, 1e-8)).toBe(true);
  });

  it("reads a pure rotation about the pivot as ZERO translation", () => {
    // The whole point of the pivot parametrization: rotating in place is not
    // reported as a huge translation the way an origin-anchored read would.
    const delta = aboutPivot(rotationAxisAngle([0, 0, 1], Math.PI / 6), PIVOT);
    const read = decomposeAboutPivot(delta, PIVOT)!;
    read.translation.forEach((v) => expect(v).toBeCloseTo(0, 9));
    expect(read.rotation[2]).toBeCloseTo(30, 9);
    expect(Math.abs(delta[0][3])).toBeGreaterThan(1);
  });

  it("carries a mirror as a negative scale and still round-trips", () => {
    const mirrored = mul(composeAboutPivot(parts, PIVOT), scaling([1, 1, -1]));
    const read = decomposeAboutPivot(mirrored, PIVOT)!;
    expect(read.reflected).toBe(true);
    expect(read.scale[2]).toBeLessThan(0);
    expect(approxEqual(composeAboutPivot(read, PIVOT), mirrored, 1e-8)).toBe(true);
  });

  it("identity parts compose to identity; singular deltas do not decompose", () => {
    expect(isIdentity(composeAboutPivot(IDENTITY_PARTS, PIVOT), 1e-9)).toBe(true);
    expect(decomposeAboutPivot(scaling([1, 0, 1]), PIVOT)).toBeNull();
  });
});

describe("constraints", () => {
  const sheared = composeAboutPivot(
    { translation: [1, 2, 3], rotation: [0, 0, 40], scale: [3, 1, 2], shear: [0.4, 0, 0], reflected: false },
    PIVOT,
  );

  it("offers only the handles a family has", () => {
    expect(allowedHandles("rigid")).toEqual(["translate", "rotate"]);
    expect(allowedHandles("similarity")).toContain("scale-uniform");
    expect(allowedHandles("similarity")).not.toContain("scale-axis");
    expect(allowedHandles("affine")).toContain("scale-axis");
  });

  it("finds the nearest PROPER rotation, even for a mirrored map", () => {
    const r = nearestRotation(linear3(mul(sheared, scaling([1, 1, -1]))))!;
    expect(det3(r)).toBeCloseTo(1, 9);
    // Orthonormal: R·Rᵀ = I.
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        const dot = r[i][0] * r[j][0] + r[i][1] * r[j][1] + r[i][2] * r[j][2];
        expect(dot).toBeCloseTo(i === j ? 1 : 0, 9);
      }
  });

  it("projects in place: the pivot's image does not move", () => {
    const target = applyPoint(sheared, PIVOT);
    for (const constraint of ["rigid", "similarity"] as const) {
      const projected = projectToConstraint(sheared, constraint, PIVOT);
      applyPoint(projected, PIVOT).forEach((v, i) => expect(v).toBeCloseTo(target[i], 9));
    }
    expect(det3(linear3(projectToConstraint(sheared, "rigid", PIVOT)))).toBeCloseTo(1, 9);
    expect(det3(linear3(projectToConstraint(sheared, "similarity", PIVOT)))).toBeCloseTo(6, 9);
    expect(projectToConstraint(sheared, "affine", PIVOT)).toBe(sheared);
  });

  it("clamps parts to the family, the edited scale winning under similarity", () => {
    const parts: DeltaParts = { ...IDENTITY_PARTS, scale: [2, 3, 4], shear: [0.1, 0.1, 0.1] };
    expect(constrainParts(parts, "rigid").scale).toEqual([1, 1, 1]);
    expect(constrainParts(parts, "similarity", 1).scale).toEqual([3, 3, 3]);
    expect(constrainParts(parts, "similarity").shear).toEqual([0, 0, 0]);
    expect(constrainParts(parts, "affine")).toBe(parts);
  });

  it("names the saved edge after what was done", () => {
    expect(describeSession({ constraint: "rigid" })).toBe("interactive (rigid)");
    expect(describeSession({ constraint: "affine", landmarkPairs: 6, rms: 1.2345, unit: "µm" })).toBe(
      "interactive (affine, 6 pairs, RMS 1.23 µm)",
    );
  });
});

describe("fitDelta", () => {
  const moving = { min: [0, 0, 0] as Vec3, max: [2048, 1024, 0] as Vec3 };
  const fixed = { min: [100, 100, 5] as Vec3, max: [356, 356, 5] as Vec3 };

  it("only translates under a rigid constraint", () => {
    const delta = fitDelta(moving, fixed, "rigid");
    expect(approxEqual(delta, [[1, 0, 0, -796], [0, 1, 0, -284], [0, 0, 1, 5], [0, 0, 0, 1]] as Mat4)).toBe(true);
  });

  it("contains the moving box in the fixed one, ignoring flat axes", () => {
    const delta = fitDelta(moving, fixed, "similarity");
    const lo = applyPoint(delta, moving.min);
    const hi = applyPoint(delta, moving.max);
    expect(hi[0] - lo[0]).toBeCloseTo(256, 9); // widest axis fills the box
    expect(hi[1] - lo[1]).toBeCloseTo(128, 9);
    expect((lo[0] + hi[0]) / 2).toBeCloseTo(228, 9);
    expect((lo[1] + hi[1]) / 2).toBeCloseTo(228, 9);
    expect(lo[2]).toBeCloseTo(5, 9);
  });

  it("unions boxes, and has nothing to say about none", () => {
    expect(unionBoxes([])).toBeNull();
    expect(unionBoxes([moving, fixed])).toEqual({ min: [0, 0, 0], max: [2048, 1024, 5] });
    expect(isIdentity(identity())).toBe(true);
  });
});
