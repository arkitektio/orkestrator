/**
 * Drag geometry for the registration gizmo — pointer RAYS in, world-space
 * gesture matrices out.
 *
 * Kept free of three.js and of the canvas so that the part of a gizmo that can
 * be wrong (which way a drag moves things, what happens when the view looks
 * straight down an axis) is testable, and the component is left with meshes
 * and event wiring. An orthographic ray is just one whose direction does not
 * depend on the pointer, so the 2D and 3D views share every function here.
 *
 * Every gesture is a delta ABOUT THE PIVOT that LEFT-multiplies the session
 * delta: `D ← G · D`. Gestures are measured from the drag's START state, never
 * frame to frame, so a drag that returns to its origin returns the layer
 * exactly (no accumulated drift).
 */
import {
  aboutPivot,
  add,
  cross,
  dot,
  identity,
  norm,
  normalize,
  rotationAxisAngle,
  scale,
  scaling,
  sub,
  translation,
  type Mat4,
  type Vec3,
} from "./mat4";

export type Ray = { origin: Vec3; direction: Vec3 };

/** Below this |sin| between ray and axis the drag is unreadable. ~2.9°. */
const PARALLEL_SIN = 0.05;

/**
 * Parameter along `axis` (through `axisOrigin`) of the point closest to the
 * ray. Null when the ray runs nearly parallel to the axis: the closest point
 * then swings wildly with sub-pixel pointer motion, and a handle that is being
 * viewed end-on should do nothing rather than fling the layer away.
 */
export const closestParamOnAxis = (ray: Ray, axisOrigin: Vec3, axis: Vec3): number | null => {
  const a = normalize(axis);
  const d = normalize(ray.direction);
  if (!a || !d) return null;
  const b = dot(a, d);
  const denominator = 1 - b * b;
  if (denominator < PARALLEL_SIN * PARALLEL_SIN) return null;
  const w = sub(axisOrigin, ray.origin);
  return (b * dot(d, w) - dot(a, w)) / denominator;
};

/** Ray ∩ plane, or null when the ray grazes it or the hit is behind the eye. */
export const intersectPlane = (ray: Ray, point: Vec3, normal: Vec3): Vec3 | null => {
  const n = normalize(normal);
  const d = normalize(ray.direction);
  if (!n || !d) return null;
  const facing = dot(n, d);
  if (Math.abs(facing) < PARALLEL_SIN) return null;
  const t = dot(n, sub(point, ray.origin)) / facing;
  if (t < 0) return null;
  return add(ray.origin, scale(d, t));
};

/** Signed angle from `from` to `to` about `normal`, both measured from `center`. */
export const signedAngle = (center: Vec3, normal: Vec3, from: Vec3, to: Vec3): number | null => {
  const n = normalize(normal);
  if (!n) return null;
  const project = (p: Vec3): Vec3 => {
    const v = sub(p, center);
    return sub(v, scale(n, dot(v, n)));
  };
  const a = project(from);
  const b = project(to);
  // Grabbing a ring at its centre gives no angle to measure.
  if (norm(a) < 1e-12 || norm(b) < 1e-12) return null;
  return Math.atan2(dot(n, cross(a, b)), dot(a, b));
};

export const snap = (value: number, step: number | null | undefined): number =>
  step && step > 0 ? Math.round(value / step) * step : value;

/** Drag an axis arrow. */
export const translateAlongAxis = (
  start: Ray,
  current: Ray,
  pivot: Vec3,
  axis: Vec3,
  snapStep?: number | null,
): Mat4 | null => {
  const a = normalize(axis);
  const from = closestParamOnAxis(start, pivot, axis);
  const to = closestParamOnAxis(current, pivot, axis);
  if (!a || from === null || to === null) return null;
  return translation(scale(a, snap(to - from, snapStep)));
};

/** Drag a plane handle (or the layer body, with the view direction as normal). */
export const translateInPlane = (start: Ray, current: Ray, pivot: Vec3, normal: Vec3): Mat4 | null => {
  const from = intersectPlane(start, pivot, normal);
  const to = intersectPlane(current, pivot, normal);
  if (!from || !to) return null;
  return translation(sub(to, from));
};

/** Drag a rotation ring whose plane has `axis` as normal. */
export const rotateAboutAxis = (
  start: Ray,
  current: Ray,
  pivot: Vec3,
  axis: Vec3,
  snapStep?: number | null,
): Mat4 | null => {
  const from = intersectPlane(start, pivot, axis);
  const to = intersectPlane(current, pivot, axis);
  if (!from || !to) return null;
  const angle = signedAngle(pivot, axis, from, to);
  if (angle === null) return null;
  return aboutPivot(rotationAxisAngle(axis, snap(angle, snapStep)), pivot);
};

/** Smallest factor a scale drag can reach: through zero is a collapse, not a gesture. */
const MIN_SCALE = 1e-3;

/**
 * Uniform scale: ratio of the pointer's distance from the pivot, measured in
 * the plane facing the viewer.
 */
export const scaleUniform = (start: Ray, current: Ray, pivot: Vec3, viewNormal: Vec3): Mat4 | null => {
  const from = intersectPlane(start, pivot, viewNormal);
  const to = intersectPlane(current, pivot, viewNormal);
  if (!from || !to) return null;
  const startDistance = norm(sub(from, pivot));
  if (startDistance < 1e-12) return null;
  const factor = Math.max(MIN_SCALE, norm(sub(to, pivot)) / startDistance);
  return aboutPivot(scaling([factor, factor, factor]), pivot);
};

/**
 * Stretch along one WORLD axis (0 = x, 1 = y, 2 = z). World-aligned on
 * purpose: a stretch along an arbitrary direction is a shear in disguise, and
 * that belongs to the numeric panel where it can be seen for what it is.
 */
export const scaleAlongWorldAxis = (start: Ray, current: Ray, pivot: Vec3, slot: 0 | 1 | 2): Mat4 | null => {
  const axis: Vec3 = [slot === 0 ? 1 : 0, slot === 1 ? 1 : 0, slot === 2 ? 1 : 0];
  const from = closestParamOnAxis(start, pivot, axis);
  const to = closestParamOnAxis(current, pivot, axis);
  if (from === null || to === null || Math.abs(from) < 1e-12) return null;
  const factor = Math.max(MIN_SCALE, to / from);
  const factors: Vec3 = [1, 1, 1];
  factors[slot] = factor;
  return aboutPivot(scaling(factors), pivot);
};

/** One arrow-key nudge: a fixed number of SCREEN pixels, whatever the zoom. */
export const nudge = (direction: Vec3, pixels: number, worldUnitsPerPixel: number): Mat4 => {
  const d = normalize(direction);
  return d ? translation(scale(d, pixels * worldUnitsPerPixel)) : identity();
};

/** World size that renders as `pixels` on screen — handles never zoom away. */
export const screenConstantSize = (pixels: number, worldUnitsPerPixel: number): number =>
  pixels * Math.max(worldUnitsPerPixel, 1e-12);

/**
 * World units covered by one screen pixel at `distance` from the camera.
 * Orthographic ignores the distance — its scale is pure zoom — so the 2D view
 * and the 3D view share this one formula's two arms.
 */
export const worldUnitsPerPixel = (
  camera: { isOrthographicCamera?: boolean; zoom?: number; fov?: number },
  distance: number,
  viewportHeight: number,
): number => {
  if (camera.isOrthographicCamera) {
    const zoom = camera.zoom ?? 1;
    return zoom > 0 ? 1 / zoom : 1;
  }
  const verticalFov = ((camera.fov ?? 45) * Math.PI) / 180;
  return (2 * Math.tan(verticalFov / 2) * distance) / Math.max(viewportHeight, 1);
};
