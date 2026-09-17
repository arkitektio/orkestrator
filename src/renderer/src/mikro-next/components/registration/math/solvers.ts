/**
 * Landmark fitting: the delta that best carries MOVING points onto FIXED ones.
 *
 * The server has no landmark API — a registration is an edge with a matrix —
 * so the fit is solved here and only its result is ever stored. Closed-form
 * throughout, with no linear-algebra dependency:
 *
 *  - rigid       Horn's unit-quaternion method (the rotation is the dominant
 *                eigenvector of a symmetric 4×4). Always a PROPER rotation, so
 *                a mirrored point set cannot trick it into a reflection.
 *  - similarity  the same rotation plus the least-squares uniform scale.
 *  - affine      ordinary least squares on the normal equations.
 *
 * PLANAR data is solved in 2D. Flat data has no information about the third
 * axis, and a 3D affine fitted to coplanar points is singular; rather than
 * return a confident-looking matrix with garbage in the unconstrained column,
 * the fit is done in-plane and z passes through.
 *
 * Every refusal names what is missing in the user's terms ("the points lie on
 * one line"), because the remedy is always "place another landmark".
 */
import { applyPoint, identity, rotationFromQuaternion, type Mat4, type Vec3 } from "./mat4";
import type { Constraint } from "./constraints";

export type LandmarkPair = { moving: Vec3; fixed: Vec3 };

export type FitResult =
  | {
      ok: true;
      matrix: Mat4;
      /** |M·moving − fixed| per pair, in world units. */
      residuals: number[];
      rms: number;
      /** Solved in the xy plane; z was passed through. */
      planar: boolean;
    }
  | { ok: false; reason: string };

/** Cyclic Jacobi: eigen-decomposition of a small SYMMETRIC matrix. */
export const symmetricEigen = (
  input: readonly (readonly number[])[],
): { values: number[]; vectors: number[][] } => {
  const n = input.length;
  const a = input.map((row) => [...row]);
  const v: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => (i === j ? 1 : 0)),
  );
  for (let sweep = 0; sweep < 64; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  return {
    values: a.map((row, i) => row[i]),
    // Column k of `v` is the eigenvector of values[k].
    vectors: Array.from({ length: n }, (_, k) => v.map((row) => row[k])),
  };
};

const centroid = (points: readonly Vec3[]): Vec3 => {
  const sum: Vec3 = [0, 0, 0];
  for (const p of points) {
    sum[0] += p[0];
    sum[1] += p[1];
    sum[2] += p[2];
  }
  return [sum[0] / points.length, sum[1] / points.length, sum[2] / points.length];
};

/**
 * How many directions a point set genuinely spans (0–3), relative to its own
 * size — so the test means the same thing for nanometres and for millimetres.
 */
export const spanRank = (points: readonly Vec3[], dims: 2 | 3 = 3): number => {
  if (points.length < 2) return 0;
  const c = centroid(points);
  const cov = Array.from({ length: dims }, () => new Array<number>(dims).fill(0));
  for (const p of points)
    for (let i = 0; i < dims; i++) for (let j = 0; j < dims; j++) cov[i][j] += (p[i] - c[i]) * (p[j] - c[j]);
  const { values } = symmetricEigen(cov);
  const largest = Math.max(...values);
  if (!(largest > 0)) return 0;
  return values.filter((value) => value > largest * 1e-9).length;
};

/** Both point sets are flat in z: solve in the plane. */
const isPlanarInZ = (pairs: readonly LandmarkPair[]): boolean => {
  const flat = (points: readonly Vec3[]) => {
    const zs = points.map((p) => p[2]);
    const extent = Math.max(
      ...[0, 1].map((axis) => {
        const values = points.map((p) => p[axis]);
        return Math.max(...values) - Math.min(...values);
      }),
    );
    return Math.max(...zs) - Math.min(...zs) <= Math.max(extent, 1e-12) * 1e-9;
  };
  return flat(pairs.map((pair) => pair.moving)) && flat(pairs.map((pair) => pair.fixed));
};

const finish = (matrix: Mat4, pairs: readonly LandmarkPair[], planar: boolean): FitResult => {
  if (matrix.some((row) => row.some((value) => !Number.isFinite(value)))) {
    return { ok: false, reason: "The fit did not converge to a finite transform." };
  }
  const residuals = pairs.map((pair) => {
    const mapped = applyPoint(matrix, pair.moving);
    return Math.hypot(mapped[0] - pair.fixed[0], mapped[1] - pair.fixed[1], mapped[2] - pair.fixed[2]);
  });
  const rms = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length);
  return { ok: true, matrix, residuals, rms, planar };
};

const withTranslation = (linear: number[][], from: Vec3, to: Vec3): Mat4 => {
  const m = identity();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i][j] = linear[i][j];
  const moved = applyPoint(m, from);
  for (let i = 0; i < 3; i++) m[i][3] = to[i] - moved[i];
  return m;
};

const fitRotation3D = (pairs: readonly LandmarkPair[], withScale: boolean): FitResult => {
  const moving = pairs.map((pair) => pair.moving);
  if (pairs.length < 3) return { ok: false, reason: "Place at least 3 landmark pairs." };
  if (spanRank(moving) < 2 || spanRank(pairs.map((pair) => pair.fixed)) < 2) {
    return {
      ok: false,
      reason: "The landmarks lie on one line, which leaves the rotation about it open. Add one off the line.",
    };
  }
  const cq = centroid(moving);
  const cp = centroid(pairs.map((pair) => pair.fixed));
  // S[a][b] = Σ q_a · p_b over centered pairs.
  const s = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const pair of pairs)
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++) s[a][b] += (pair.moving[a] - cq[a]) * (pair.fixed[b] - cp[b]);

  const [sxx, sxy, sxz] = s[0];
  const [syx, syy, syz] = s[1];
  const [szx, szy, szz] = s[2];
  const n = [
    [sxx + syy + szz, syz - szy, szx - sxz, sxy - syx],
    [syz - szy, sxx - syy - szz, sxy + syx, szx + sxz],
    [szx - sxz, sxy + syx, -sxx + syy - szz, syz + szy],
    [sxy - syx, szx + sxz, syz + szy, -sxx - syy + szz],
  ];
  const { values, vectors } = symmetricEigen(n);
  const best = values.indexOf(Math.max(...values));
  const rotation = rotationFromQuaternion(vectors[best]);

  let factor = 1;
  if (withScale) {
    let numerator = 0;
    let denominator = 0;
    for (const pair of pairs) {
      const q: Vec3 = [pair.moving[0] - cq[0], pair.moving[1] - cq[1], pair.moving[2] - cq[2]];
      const rq = applyPoint(rotation, q);
      for (let i = 0; i < 3; i++) numerator += (pair.fixed[i] - cp[i]) * rq[i];
      denominator += q[0] * q[0] + q[1] * q[1] + q[2] * q[2];
    }
    factor = numerator / denominator;
    if (!(factor > 0)) return { ok: false, reason: "The landmarks do not agree on a scale." };
  }

  const linear = [0, 1, 2].map((i) => [0, 1, 2].map((j) => rotation[i][j] * factor));
  return finish(withTranslation(linear, cq, cp), pairs, false);
};

/** Gaussian elimination with partial pivoting; null when ill-conditioned. */
const solveLinear = (matrix: number[][], rhs: number[][]): number[][] | null => {
  const n = matrix.length;
  const a = matrix.map((row, i) => [...row, ...rhs[i]]);
  const scaleOf = Math.max(...matrix.flat().map(Math.abs));
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) <= scaleOf * 1e-10) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const k = a[row][col] / a[col][col];
      if (k === 0) continue;
      for (let c = col; c < a[row].length; c++) a[row][c] -= k * a[col][c];
    }
  }
  return a.map((row, i) => row.slice(n).map((value) => value / a[i][i]));
};

/**
 * Least-squares affine in `dims` dimensions. Solved on CENTERED moving points:
 * the normal matrix is then the scatter matrix, whose conditioning does not
 * degrade with how far the data sits from the origin (world coordinates in µm
 * are routinely 1e4–1e5 from it).
 */
const fitAffine = (pairs: readonly LandmarkPair[], dims: 2 | 3): number[][] | null => {
  const cq = centroid(pairs.map((pair) => pair.moving));
  const cp = centroid(pairs.map((pair) => pair.fixed));
  const scatter = Array.from({ length: dims }, () => new Array<number>(dims).fill(0));
  const crossTerm = Array.from({ length: dims }, () => new Array<number>(dims).fill(0));
  for (const pair of pairs) {
    for (let i = 0; i < dims; i++) {
      for (let j = 0; j < dims; j++) {
        scatter[i][j] += (pair.moving[i] - cq[i]) * (pair.moving[j] - cq[j]);
        // crossTerm[i][j] = Σ q_i · p_j ; row i of the solve is for q_i.
        crossTerm[i][j] += (pair.moving[i] - cq[i]) * (pair.fixed[j] - cp[j]);
      }
    }
  }
  // scatter · X = crossTerm, with the linear map A = Xᵀ.
  const x = solveLinear(scatter, crossTerm);
  if (!x) return null;
  return Array.from({ length: dims }, (_, i) => Array.from({ length: dims }, (__, j) => x[j][i]));
};

const fitPlanar = (pairs: readonly LandmarkPair[], constraint: Constraint): FitResult => {
  const moving = pairs.map((pair) => pair.moving);
  const fixed = pairs.map((pair) => pair.fixed);
  const cq = centroid(moving);
  const cp = centroid(fixed);
  let linear2: number[][];

  if (constraint === "affine") {
    if (pairs.length < 3) return { ok: false, reason: "Place at least 3 landmark pairs for an affine fit." };
    if (spanRank(moving, 2) < 2) {
      return { ok: false, reason: "The landmarks lie on one line. Add one off the line." };
    }
    const fitted = fitAffine(pairs, 2);
    if (!fitted) return { ok: false, reason: "The landmarks are too close to a line for a stable affine fit." };
    linear2 = fitted;
  } else {
    if (pairs.length < 2) return { ok: false, reason: "Place at least 2 landmark pairs." };
    if (spanRank(moving, 2) < 1 || spanRank(fixed, 2) < 1) {
      return { ok: false, reason: "The landmarks coincide. Spread them out." };
    }
    let dotSum = 0;
    let crossSum = 0;
    let movingEnergy = 0;
    for (const pair of pairs) {
      const [qx, qy] = [pair.moving[0] - cq[0], pair.moving[1] - cq[1]];
      const [px, py] = [pair.fixed[0] - cp[0], pair.fixed[1] - cp[1]];
      dotSum += qx * px + qy * py;
      crossSum += qx * py - qy * px;
      movingEnergy += qx * qx + qy * qy;
    }
    const angle = Math.atan2(crossSum, dotSum);
    const factor = constraint === "similarity" ? Math.hypot(dotSum, crossSum) / movingEnergy : 1;
    const [c, s] = [Math.cos(angle) * factor, Math.sin(angle) * factor];
    linear2 = [
      [c, -s],
      [s, c],
    ];
  }

  const linear = [
    [linear2[0][0], linear2[0][1], 0],
    [linear2[1][0], linear2[1][1], 0],
    [0, 0, 1],
  ];
  return finish(withTranslation(linear, cq, cp), pairs, true);
};

export const minimumPairs = (constraint: Constraint, planar: boolean): number =>
  planar ? (constraint === "affine" ? 3 : 2) : constraint === "affine" ? 4 : 3;

export const fitLandmarks = (
  pairs: readonly LandmarkPair[],
  constraint: Constraint,
  options: { /** Force the in-plane solve (the 2D view, a world with no z). */ planar?: boolean } = {},
): FitResult => {
  if (!pairs.length) return { ok: false, reason: "Place some landmark pairs first." };
  if (options.planar || isPlanarInZ(pairs)) return fitPlanar(pairs, constraint);
  if (constraint !== "affine") return fitRotation3D(pairs, constraint === "similarity");

  if (pairs.length < 4) return { ok: false, reason: "Place at least 4 landmark pairs for a 3D affine fit." };
  if (spanRank(pairs.map((pair) => pair.moving)) < 3) {
    return {
      ok: false,
      reason:
        "The landmarks lie in one plane, which leaves the affine open across it. Add one off the plane, or fit a similarity.",
    };
  }
  const linear = fitAffine(pairs, 3);
  if (!linear) return { ok: false, reason: "The landmarks are too close to a plane for a stable affine fit." };
  return finish(
    withTranslation(
      linear,
      centroid(pairs.map((pair) => pair.moving)),
      centroid(pairs.map((pair) => pair.fixed)),
    ),
    pairs,
    false,
  );
};
