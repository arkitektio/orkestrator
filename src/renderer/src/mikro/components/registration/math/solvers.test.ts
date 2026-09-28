import { describe, expect, it } from "vitest";
import { composeAboutPivot } from "./decompose";
import { applyPoint, approxEqual, det3, linear3, type Mat4, type Vec3 } from "./mat4";
import { fitLandmarks, minimumPairs, spanRank, symmetricEigen, type LandmarkPair } from "./solvers";

const CLOUD: Vec3[] = [
  [0, 0, 0],
  [10, 0, 0],
  [0, 12, 0],
  [0, 0, 7],
  [5, 5, 5],
  [-3, 8, 2],
];

const pairsFor = (matrix: Mat4, points: readonly Vec3[] = CLOUD): LandmarkPair[] =>
  points.map((moving) => ({ moving, fixed: applyPoint(matrix, moving) }));

const RIGID = composeAboutPivot(
  { translation: [100, -40, 12], rotation: [20, -35, 50], scale: [1, 1, 1], shear: [0, 0, 0], reflected: false },
  [0, 0, 0],
);
const SIMILARITY = composeAboutPivot(
  { translation: [3, 4, 5], rotation: [10, 20, 30], scale: [2.5, 2.5, 2.5], shear: [0, 0, 0], reflected: false },
  [0, 0, 0],
);
const AFFINE = composeAboutPivot(
  { translation: [-7, 2, 9], rotation: [5, 15, -25], scale: [2, 0.5, 1.5], shear: [0.2, -0.1, 0.3], reflected: false },
  [0, 0, 0],
);

describe("symmetricEigen", () => {
  it("diagonalizes a symmetric matrix", () => {
    const { values, vectors } = symmetricEigen([
      [2, 1, 0],
      [1, 2, 0],
      [0, 0, 5],
    ]);
    expect([...values].sort((a, b) => a - b).map((v) => Math.round(v * 1e9) / 1e9)).toEqual([1, 3, 5]);
    // A·v = λ·v for every pair.
    values.forEach((lambda, k) => {
      const v = vectors[k];
      const av = [2 * v[0] + v[1], v[0] + 2 * v[1], 5 * v[2]];
      av.forEach((value, i) => expect(value).toBeCloseTo(lambda * v[i], 9));
    });
  });
});

describe("spanRank", () => {
  it("counts the directions a point set spans, at any scale", () => {
    expect(spanRank(CLOUD)).toBe(3);
    expect(spanRank(CLOUD.map((p) => [p[0], p[1], 0] as Vec3))).toBe(2);
    expect(spanRank([[0, 0, 0], [1, 1, 1], [2, 2, 2]])).toBe(1);
    expect(spanRank([[1e-9, 0, 0], [0, 1e-9, 0], [0, 0, 1e-9], [0, 0, 0]])).toBe(3);
  });
});

describe("fitLandmarks — 3D", () => {
  it("recovers a rigid transform exactly", () => {
    const fit = fitLandmarks(pairsFor(RIGID), "rigid");
    if (!fit.ok) throw new Error(fit.reason);
    expect(approxEqual(fit.matrix, RIGID, 1e-8)).toBe(true);
    expect(fit.rms).toBeLessThan(1e-8);
    expect(fit.planar).toBe(false);
  });

  it("recovers a similarity, including its scale", () => {
    const fit = fitLandmarks(pairsFor(SIMILARITY), "similarity");
    if (!fit.ok) throw new Error(fit.reason);
    expect(approxEqual(fit.matrix, SIMILARITY, 1e-8)).toBe(true);
  });

  it("recovers a general affine, far from the origin", () => {
    const far = CLOUD.map((p) => [p[0] + 5e4, p[1] - 8e4, p[2] + 2e4] as Vec3);
    const fit = fitLandmarks(pairsFor(AFFINE, far), "affine");
    if (!fit.ok) throw new Error(fit.reason);
    expect(approxEqual(fit.matrix, AFFINE, 1e-5)).toBe(true);
    expect(fit.rms).toBeLessThan(1e-6);
  });

  it("a rigid fit of scaled data keeps unit scale and reports the misfit", () => {
    const fit = fitLandmarks(pairsFor(SIMILARITY), "rigid");
    if (!fit.ok) throw new Error(fit.reason);
    expect(det3(linear3(fit.matrix))).toBeCloseTo(1, 9);
    expect(fit.rms).toBeGreaterThan(1);
    expect(fit.residuals).toHaveLength(CLOUD.length);
  });

  it("never answers a mirrored point set with a reflection", () => {
    const mirror: Mat4 = [
      [-1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    const fit = fitLandmarks(pairsFor(mirror), "rigid");
    if (!fit.ok) throw new Error(fit.reason);
    expect(det3(linear3(fit.matrix))).toBeCloseTo(1, 9);
  });

  it("averages out noise instead of chasing it", () => {
    let seed = 7;
    const noise = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed / 2147483647 - 0.5) * 0.02;
    };
    const noisy = pairsFor(RIGID).map((pair) => ({
      moving: pair.moving,
      fixed: [pair.fixed[0] + noise(), pair.fixed[1] + noise(), pair.fixed[2] + noise()] as Vec3,
    }));
    const fit = fitLandmarks(noisy, "rigid");
    if (!fit.ok) throw new Error(fit.reason);
    expect(approxEqual(fit.matrix, RIGID, 0.05)).toBe(true);
    expect(fit.rms).toBeLessThan(0.03);
  });

  it("refuses collinear landmarks and says what to do", () => {
    const line: Vec3[] = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3]];
    const fit = fitLandmarks(pairsFor(RIGID, line), "rigid");
    expect(fit.ok).toBe(false);
    if (!fit.ok) expect(fit.reason).toMatch(/one line/);
  });

  it("refuses a 3D affine over coplanar (tilted) landmarks", () => {
    // Coplanar but NOT flat in z, so the planar branch does not take it.
    const tilted: Vec3[] = [[0, 0, 0], [10, 0, 10], [0, 10, 0], [10, 10, 10], [5, 2, 5]];
    const fit = fitLandmarks(pairsFor(AFFINE, tilted), "affine");
    expect(fit.ok).toBe(false);
    if (!fit.ok) expect(fit.reason).toMatch(/one plane/);
  });

  it("enforces minimum counts", () => {
    expect(fitLandmarks([], "rigid").ok).toBe(false);
    expect(fitLandmarks(pairsFor(RIGID).slice(0, 2), "rigid").ok).toBe(false);
    expect(fitLandmarks(pairsFor(AFFINE).slice(0, 3), "affine").ok).toBe(false);
    expect(minimumPairs("affine", false)).toBe(4);
    expect(minimumPairs("rigid", true)).toBe(2);
  });
});

describe("fitLandmarks — planar", () => {
  const FLAT: Vec3[] = [
    [0, 0, 3],
    [100, 0, 3],
    [0, 80, 3],
    [60, 90, 3],
  ];
  const c = Math.cos(0.4);
  const s = Math.sin(0.4);
  const IN_PLANE: Mat4 = [
    [1.5 * c, -1.5 * s, 0, 20],
    [1.5 * s, 1.5 * c, 0, -10],
    [0, 0, 1, 4],
    [0, 0, 0, 1],
  ];

  it("detects flat data, solves in-plane and passes z through", () => {
    const fit = fitLandmarks(pairsFor(IN_PLANE, FLAT), "similarity");
    if (!fit.ok) throw new Error(fit.reason);
    expect(fit.planar).toBe(true);
    expect(approxEqual(fit.matrix, IN_PLANE, 1e-9)).toBe(true);
  });

  it("fits a 2D affine from three non-collinear pairs", () => {
    const shear: Mat4 = [
      [2, 0.5, 0, 1],
      [0.1, 0.8, 0, 2],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    const fit = fitLandmarks(pairsFor(shear, FLAT.slice(0, 3)), "affine");
    if (!fit.ok) throw new Error(fit.reason);
    expect(approxEqual(fit.matrix, shear, 1e-9)).toBe(true);
  });

  it("fits a rigid 2D transform from two pairs", () => {
    const rigid: Mat4 = [
      [c, -s, 0, 5],
      [s, c, 0, 6],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    const fit = fitLandmarks(pairsFor(rigid, FLAT.slice(0, 2)), "rigid");
    if (!fit.ok) throw new Error(fit.reason);
    expect(approxEqual(fit.matrix, rigid, 1e-9)).toBe(true);
  });

  it("can be forced planar for data that is not flat (the 2D view)", () => {
    const fit = fitLandmarks(pairsFor(IN_PLANE), "similarity", { planar: true });
    if (!fit.ok) throw new Error(fit.reason);
    expect(fit.planar).toBe(true);
    expect(fit.matrix[2].slice(0, 3)).toEqual([0, 0, 1]);
  });

  it("refuses collinear points for a 2D affine", () => {
    const line: Vec3[] = [[0, 0, 0], [1, 1, 0], [2, 2, 0]];
    expect(fitLandmarks(pairsFor(IN_PLANE, line), "affine").ok).toBe(false);
  });
});
