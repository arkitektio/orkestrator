/**
 * Row-major affine 4×4 helpers for the registration workspace.
 *
 * The shape is the one the whole placement pipeline already speaks
 * (`transformGraph.ts` `Mat4`, `affineToMatrix4`): rows `[x', y', z', w]`,
 * column vectors, last row `0 0 0 1`. Everything here is plain arrays so the
 * suites run in `node` with no three.js in sight.
 */
export type Mat4 = number[][];
export type Vec3 = [number, number, number];

export const identity = (): Mat4 => [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

/** a · b — apply b first, then a. */
export const mul = (a: Mat4, b: Mat4): Mat4 => {
  const out = identity();
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      out[r][c] = a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c] + a[r][3] * b[3][c];
  return out;
};

export const mulAll = (...matrices: Mat4[]): Mat4 => matrices.reduce((acc, m) => mul(acc, m), identity());

export const clone = (m: Mat4): Mat4 => m.map((row) => [...row]);

export const translation = (t: Vec3): Mat4 => {
  const m = identity();
  m[0][3] = t[0];
  m[1][3] = t[1];
  m[2][3] = t[2];
  return m;
};

export const scaling = (s: Vec3): Mat4 => {
  const m = identity();
  m[0][0] = s[0];
  m[1][1] = s[1];
  m[2][2] = s[2];
  return m;
};

/** Rodrigues. `axis` need not be normalized; a zero axis yields identity. */
export const rotationAxisAngle = (axis: Vec3, angle: number): Mat4 => {
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  if (length < 1e-15) return identity();
  const [x, y, z] = [axis[0] / length, axis[1] / length, axis[2] / length];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y, 0],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x, 0],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c, 0],
    [0, 0, 0, 1],
  ];
};

/** Unit quaternion `[w, x, y, z]` → rotation. */
export const rotationFromQuaternion = (q: readonly number[]): Mat4 => {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  const [w, x, y, z] = [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y), 0],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x), 0],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y), 0],
    [0, 0, 0, 1],
  ];
};

/**
 * `T(p) · G · T(−p)`: the same linear gesture, performed ABOUT a pivot.
 *
 * This is the one place center parametrization is allowed to exist
 * (COORDINATE_SYSTEMS.md §0: "Center parametrization is the registration
 * OPTIMIZER's business"). The result is an ordinary origin-anchored affine, so
 * nothing downstream ever learns a pivot was involved.
 */
export const aboutPivot = (gesture: Mat4, pivot: Vec3): Mat4 =>
  mulAll(translation(pivot), gesture, translation([-pivot[0], -pivot[1], -pivot[2]]));

export const applyPoint = (m: Mat4, p: Vec3): Vec3 => [
  m[0][0] * p[0] + m[0][1] * p[1] + m[0][2] * p[2] + m[0][3],
  m[1][0] * p[0] + m[1][1] * p[1] + m[1][2] * p[2] + m[1][3],
  m[2][0] * p[0] + m[2][1] * p[1] + m[2][2] * p[2] + m[2][3],
];

export const linear3 = (m: Mat4): number[][] => [
  [m[0][0], m[0][1], m[0][2]],
  [m[1][0], m[1][1], m[1][2]],
  [m[2][0], m[2][1], m[2][2]],
];

export const det3 = (m: readonly (readonly number[])[]): number =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

/** Inverse of an affine 4×4; null when singular. Same threshold as `invert4`. */
export const invert = (m: Mat4): Mat4 | null => {
  const det = det3(m);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];
  const r = [
    [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ];
  const out = identity();
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) out[row][col] = r[row][col];
    out[row][3] = -(r[row][0] * m[0][3] + r[row][1] * m[1][3] + r[row][2] * m[2][3]);
  }
  return out;
};

export const approxEqual = (a: Mat4, b: Mat4, tolerance = 1e-9): boolean =>
  a.every((row, r) => row.every((value, c) => Math.abs(value - b[r][c]) <= tolerance));

export const isIdentity = (m: Mat4, tolerance = 1e-12): boolean => approxEqual(m, identity(), tolerance);

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: Vec3): Vec3 | null => {
  const n = norm(a);
  return n < 1e-15 ? null : [a[0] / n, a[1] / n, a[2] / n];
};
