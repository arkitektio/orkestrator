/**
 * Delta ↔ human-readable parts, ABOUT A PIVOT.
 *
 *   D = T(translation) · T(pivot) · R · U · T(−pivot)
 *
 * `R` is a proper rotation, `U` upper-triangular (scale on the diagonal, shear
 * above it). The numeric panel edits the parts and recomposes; the gizmo edits
 * `D` directly and the panel re-reads it. Either way the stored thing is the
 * plain origin-anchored matrix — the pivot is a way of TALKING about it.
 *
 * Angles are degrees, `R = Rz(z) · Ry(y) · Rx(x)`. In the 2D view only `z` is
 * ever non-zero, where it is simply "the rotation".
 */
import {
  applyPoint,
  det3,
  identity,
  linear3,
  mul,
  mulAll,
  translation as translationMatrix,
  type Mat4,
  type Vec3,
} from "./mat4";

export type DeltaParts = {
  translation: Vec3;
  /** Degrees about x, y, z. */
  rotation: Vec3;
  scale: Vec3;
  /** xy, xz, yz. */
  shear: Vec3;
  /** A mirror image: carried as a negative z scale. Legitimate data. */
  reflected: boolean;
};

export const IDENTITY_PARTS: DeltaParts = {
  translation: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  shear: [0, 0, 0],
  reflected: false,
};

const DEG = 180 / Math.PI;

export const rotationFromEuler = (degrees: Vec3): Mat4 => {
  const [a, b, g] = [degrees[0] / DEG, degrees[1] / DEG, degrees[2] / DEG];
  const [ca, sa, cb, sb, cg, sg] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(g), Math.sin(g)];
  return [
    [cb * cg, sa * sb * cg - ca * sg, ca * sb * cg + sa * sg, 0],
    [cb * sg, sa * sb * sg + ca * cg, ca * sb * sg - sa * cg, 0],
    [-sb, sa * cb, ca * cb, 0],
    [0, 0, 0, 1],
  ];
};

const eulerFromRotation = (r: number[][]): Vec3 => {
  const sb = Math.max(-1, Math.min(1, -r[2][0]));
  const b = Math.asin(sb);
  if (Math.abs(Math.cos(b)) > 1e-9) {
    return [Math.atan2(r[2][1], r[2][2]) * DEG, b * DEG, Math.atan2(r[1][0], r[0][0]) * DEG];
  }
  // Gimbal lock: x and z rotate about the same line, so put it all on x.
  return [Math.atan2(-r[1][2], r[1][1]) * DEG, b * DEG, 0];
};

/** Null when the linear block is singular — there is no rotation to speak of. */
export const decomposeAboutPivot = (delta: Mat4, pivot: Vec3): DeltaParts | null => {
  const l = linear3(delta);
  if (Math.abs(det3(l)) < 1e-12) return null;

  const column = (j: number): Vec3 => [l[0][j], l[1][j], l[2][j]];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const axpy = (a: Vec3, k: number, b: Vec3): Vec3 => [a[0] - k * b[0], a[1] - k * b[1], a[2] - k * b[2]];
  const unit = (a: Vec3, n: number): Vec3 => [a[0] / n, a[1] / n, a[2] / n];

  // Gram–Schmidt over the columns ("unmatrix", Graphics Gems II).
  const c0 = column(0);
  const sx = Math.hypot(...c0);
  const r0 = unit(c0, sx);

  let c1 = column(1);
  let shxy = dot(r0, c1);
  c1 = axpy(c1, shxy, r0);
  const sy = Math.hypot(...c1);
  const r1 = unit(c1, sy);
  shxy /= sy;

  let c2 = column(2);
  let shxz = dot(r0, c2);
  c2 = axpy(c2, shxz, r0);
  let shyz = dot(r1, c2);
  c2 = axpy(c2, shyz, r1);
  let sz = Math.hypot(...c2);
  let r2 = unit(c2, sz);
  shxz /= sz;
  shyz /= sz;

  const rotation = [
    [r0[0], r1[0], r2[0]],
    [r0[1], r1[1], r2[1]],
    [r0[2], r1[2], r2[2]],
  ];
  const reflected = det3(rotation) < 0;
  if (reflected) {
    // Flip the third basis vector and its scale together. The shears were
    // divided by the POSITIVE length above, so they change sign with it:
    // column 2 is `sz · (r2 + shxz·r0 + shyz·r1)`.
    sz = -sz;
    shxz = -shxz;
    shyz = -shyz;
    r2 = [-r2[0], -r2[1], -r2[2]];
    for (let i = 0; i < 3; i++) rotation[i][2] = r2[i];
  }

  // t = D.trans − pivot + L·pivot, from expanding T(t)·T(p)·L·T(−p).
  const moved = applyPoint(
    [
      [l[0][0], l[0][1], l[0][2], 0],
      [l[1][0], l[1][1], l[1][2], 0],
      [l[2][0], l[2][1], l[2][2], 0],
      [0, 0, 0, 1],
    ],
    pivot,
  );
  return {
    translation: [
      delta[0][3] - pivot[0] + moved[0],
      delta[1][3] - pivot[1] + moved[1],
      delta[2][3] - pivot[2] + moved[2],
    ],
    rotation: eulerFromRotation(rotation),
    scale: [sx, sy, sz],
    shear: [shxy, shxz, shyz],
    reflected,
  };
};

export const composeAboutPivot = (parts: DeltaParts, pivot: Vec3): Mat4 => {
  const [sx, sy, sz] = parts.scale;
  const [shxy, shxz, shyz] = parts.shear;
  const upper: Mat4 = identity();
  upper[0][0] = sx;
  upper[0][1] = sy * shxy;
  upper[0][2] = sz * shxz;
  upper[1][1] = sy;
  upper[1][2] = sz * shyz;
  upper[2][2] = sz;
  return mulAll(
    translationMatrix(parts.translation),
    translationMatrix(pivot),
    mul(rotationFromEuler(parts.rotation), upper),
    translationMatrix([-pivot[0], -pivot[1], -pivot[2]]),
  );
};
