import type * as THREE from "three";

import { DOUBLE_PRESS_SLOP_PX } from "../../platform/input/navigationBindings";
import { CLICK_SLOP_PX } from "../../platform/input/pressLedger";

/**
 * Gesture arithmetic for the scene's drawing tools: telling a click from a drag,
 * and turning a pointer ray into a point on the plane being drawn on.
 */

/**
 * Screen-pixel slop below which a press-release is a CLICK, not a drag.
 *
 * Screen pixels, not world units, deliberately: world units differ by orders of
 * magnitude between scenes (nm to px), so no single world constant exists, and
 * the same physical hand movement must mean the same thing at every zoom. R3F
 * measures its own `event.delta` the same way, so the two stay commensurate.
 * The press ledger's click rule, by another name (`platform/input/pressLedger.ts`).
 */
export const DRAG_THRESHOLD_PX = CLICK_SLOP_PX;

/**
 * How far a second click may land from the first and still count as a
 * double-click. The browser's `detail` counter is position-blind — Chrome
 * increments it for successive clicks inside the double-click window however far
 * apart they are — so placing two polygon vertices quickly would otherwise
 * finish the polygon.
 */
export const DOUBLE_CLICK_SLOP_PX = DOUBLE_PRESS_SLOP_PX;

export interface ScreenPoint {
  x: number;
  y: number;
}

/** Strictly greater: exactly at the threshold is still a click. */
export function exceedsDragThreshold(
  a: ScreenPoint,
  b: ScreenPoint,
  thresholdPx: number = DRAG_THRESHOLD_PX,
): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy > thresholdPx * thresholdPx;
}

export function withinSlop(
  a: ScreenPoint,
  b: ScreenPoint,
  slopPx: number = DOUBLE_CLICK_SLOP_PX,
): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= slopPx * slopPx;
}

/** Rays closer to parallel than this never meet the plane usefully. */
const PARALLEL_EPSILON = 1e-8;

/**
 * Where the pointer ray meets the drawing plane `z = planeZ`, or null when the
 * ray is parallel to it or points away. Writes into `target` and allocates
 * nothing.
 *
 * This — not `event.point` — is the drawer's ground truth, for two reasons:
 *
 * 1. Under pointer capture R3F replays the *press-time* intersection, so
 *    `event.point` silently freezes the moment the ray stops hitting the
 *    plane — exactly when a drag leaves the shape. `event.ray` is recomputed
 *    from the live pointer on every event.
 * 2. The old code intersected the hit plane at z≈0.01 and then overwrote z with
 *    the slice's z. Under an orthographic top-down camera x/y don't depend on z
 *    so it looked fine; under a tilted perspective camera it is a parallax error
 *    proportional to the distance between the two planes.
 *
 * Scalar math rather than `THREE.Plane` so it stays allocation-free and testable
 * without constructing one.
 */
export function intersectDrawPlane(
  ray: THREE.Ray,
  planeZ: number,
  target: THREE.Vector3,
): THREE.Vector3 | null {
  const dz = ray.direction.z;
  if (Math.abs(dz) < PARALLEL_EPSILON) return null;

  const t = (planeZ - ray.origin.z) / dz;
  if (t < 0) return null;

  target.set(
    ray.origin.x + ray.direction.x * t,
    ray.origin.y + ray.direction.y * t,
    planeZ,
  );
  return target;
}

/**
 * Where the pointer ray meets the plane through `origin` whose normal is
 * `normal` (assumed unit length), or null when the ray runs parallel to it or
 * points away. Writes into `target` and allocates nothing.
 *
 * The general form of `intersectDrawPlane`, and the one the volumetric sizing
 * gesture needs in 3D. Sizing a sphere against the world-XY plane through its
 * anchor is right only while the camera looks down that plane's normal, which
 * is exactly the flat view; orbit until the view direction is shallow against
 * it and the ray meets that plane far away from the anchor, so a click a few
 * pixels from the centre asks for an enormous radius. Facing the plane at the
 * camera keeps the radius the world distance the cursor actually moved, at
 * every orbit angle.
 */
export function intersectFacingPlane(
  ray: THREE.Ray,
  origin: THREE.Vector3,
  normal: THREE.Vector3,
  target: THREE.Vector3,
): THREE.Vector3 | null {
  const denominator = normal.dot(ray.direction);
  if (Math.abs(denominator) < PARALLEL_EPSILON) return null;

  const t =
    (normal.x * (origin.x - ray.origin.x) +
      normal.y * (origin.y - ray.origin.y) +
      normal.z * (origin.z - ray.origin.z)) /
    denominator;
  if (t < 0) return null;

  target.set(
    ray.origin.x + ray.direction.x * t,
    ray.origin.y + ray.direction.y * t,
    ray.origin.z + ray.direction.z * t,
  );
  return target;
}

/**
 * Backspace on a half-drawn chain: drop its last anchor (click) and every
 * vertex that click added. `anchorEnds[i]` is `vertices.length` just after
 * anchor `i` was placed — a traced edge or a freehand stroke adds many
 * vertices per click, so the cut goes back to the previous anchor's end.
 *
 * Null when at most one anchor would remain (or there were none, as for the
 * flat two-point drag and the primitive anchor): removing that point removes
 * the shape, which is the caller's to discard.
 */
export function undoLastAnchor<V, A>(chain: {
  vertices: V[];
  anchors: A[];
  anchorEnds: number[];
}): { vertices: V[]; anchors: A[]; anchorEnds: number[] } | null {
  const { vertices, anchors, anchorEnds } = chain;
  if (anchors.length <= 1 || anchorEnds.length !== anchors.length) return null;
  const keep = anchors.length - 1;
  return {
    vertices: vertices.slice(0, anchorEnds[keep - 1]),
    anchors: anchors.slice(0, keep),
    anchorEnds: anchorEnds.slice(0, keep),
  };
}
