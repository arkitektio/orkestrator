import * as THREE from "three";

/**
 * Zoom-sensitive panning for the 3D perspective camera.
 *
 * OrbitControls scales a pan drag by the CAMERA→TARGET distance
 * (`targetDistance` in three-stdlib's `pan()`): one screen-height of drag
 * moves the world by the frustum height AT THE TARGET PLANE. That is only
 * correct while the target sits at the depth of the content on screen. Both
 * zoom paths break that assumption on a volume: a plain dolly multiplies the
 * radius toward zero as the camera approaches the target, and `zoomToCursor`
 * re-seats the target at the collapsed radius on every wheel tick — after a
 * deep zoom the radius is microscopic while the voxels filling the screen sit
 * at real distances, so pan (∝ radius) freezes.
 *
 * Fix: measure where the content actually is — the layer bounding boxes along
 * the camera's view ray — and set `controls.panSpeed = content / target`.
 * three's pan math multiplies by `panSpeed · targetDistance`, so the target
 * term cancels exactly and a drag is screen-space correct at the CONTENT
 * depth, whatever the orbit radius has collapsed to.
 *
 * Pure math here; `platform/camera/CameraController.tsx` (`PanScaleSync`) is the store
 * glue, same split as `platform/camera/orbitPivot.ts`.
 */

/** Ray/AABB slab test returning [tEntry, tExit], or null when the ray misses. */
function slabT(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  box: THREE.Box3,
): [number, number] | null {
  let tmin = Number.NEGATIVE_INFINITY;
  let tmax = Number.POSITIVE_INFINITY;
  for (const axis of ["x", "y", "z"] as const) {
    const o = origin[axis];
    const d = direction[axis];
    if (Math.abs(d) < 1e-12) {
      if (o < box.min[axis] || o > box.max[axis]) return null;
      continue;
    }
    const inv = 1 / d;
    let t0 = (box.min[axis] - o) * inv;
    let t1 = (box.max[axis] - o) * inv;
    if (t0 > t1) [t0, t1] = [t1, t0];
    if (t0 > tmin) tmin = t0;
    if (t1 < tmax) tmax = t1;
    if (tmin > tmax) return null;
  }
  return [tmin, tmax];
}

/**
 * Distance along the view ray at which the content sits: the nearest layer
 * box's entry point, or — when the camera is INSIDE a box (zoomed into a
 * volume) — the midpoint of the remaining chord, a stable proxy for "the
 * voxels around the camera". Boxes entirely behind the camera are ignored;
 * no hit → `fallback` (the caller passes the target distance, which yields
 * a pan speed of exactly 1 — stock behavior).
 */
export function contentDistanceAlongRay(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  boxes: readonly THREE.Box3[],
  fallback: number,
): number {
  let best = Number.POSITIVE_INFINITY;
  for (const box of boxes) {
    if (box.isEmpty()) continue;
    const t = slabT(origin, direction, box);
    if (!t) continue;
    const [tEntry, tExit] = t;
    if (tExit <= 0) continue; // entirely behind the camera
    const d = tEntry >= 0 ? tEntry : tExit / 2;
    if (d > 0 && d < best) best = d;
  }
  return Number.isFinite(best) ? best : fallback;
}

/**
 * The visible chord of the UNION of the boxes along the ray: min entry
 * (UNCLAMPED — a negative tIn means the camera is inside the union) and max
 * exit over every box the ray hits ahead of the camera. Null when the ray
 * hits nothing.
 */
export function unionChordAlongRay(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  boxes: readonly THREE.Box3[],
): { tIn: number; tOut: number } | null {
  let tIn = Number.POSITIVE_INFINITY;
  let tOut = Number.NEGATIVE_INFINITY;
  for (const box of boxes) {
    if (box.isEmpty()) continue;
    const t = slabT(origin, direction, box);
    if (!t) continue;
    const [tEntry, tExit] = t;
    if (tExit <= 0) continue; // entirely behind the camera
    if (tEntry < tIn) tIn = tEntry;
    if (tExit > tOut) tOut = tExit;
  }
  return tOut > Number.NEGATIVE_INFINITY ? { tIn, tOut } : null;
}

/**
 * The t-projection of the CONTENT CENTER (center of the union Box3 of every
 * non-empty box — hit or not: the miss case is exactly when the ray passes
 * BESIDE the content) onto the ray. Null when no box contributes.
 */
export function unionCenterT(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  boxes: readonly THREE.Box3[],
): number | null {
  let has = false;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const box of boxes) {
    if (box.isEmpty()) continue;
    has = true;
    if (box.min.x < minX) minX = box.min.x;
    if (box.min.y < minY) minY = box.min.y;
    if (box.min.z < minZ) minZ = box.min.z;
    if (box.max.x > maxX) maxX = box.max.x;
    if (box.max.y > maxY) maxY = box.max.y;
    if (box.max.z > maxZ) maxZ = box.max.z;
  }
  if (!has) return null;
  const cx = (minX + maxX) / 2 - origin.x;
  const cy = (minY + maxY) / 2 - origin.y;
  const cz = (minZ + maxZ) / 2 - origin.z;
  return cx * direction.x + cy * direction.y + cz * direction.z;
}

/**
 * Where the orbit TARGET should sit along the view ray so that three's OWN
 * radius-proportional math (dolly steps, pan scale, rotate pivot) is
 * zoom-sensitive natively — CONTENT-CENTER aware:
 *
 *  - Ray hits the content, camera OUTSIDE the union chord: the projection of
 *    the content center onto the ray, clamped into the chord. Looking at the
 *    middle this is the chord midpoint (the old rule); a grazing/oblique ray
 *    no longer parks the pivot at a shallow surface point, and rotation
 *    orbits at the depth of the content the user is actually looking at.
 *    Deliberate consequence: successive rotate settles nudge the depth
 *    toward the content's center-plane (within the caller's dead band) —
 *    that is the centering working, and each re-seat is view-preserving.
 *  - Camera INSIDE the union: midpoint of the REMAINING chord (the old
 *    inside rule, generalized to the union). NOT the clamped projection:
 *    that would collapse the radius to ~0 as the camera dollies through the
 *    center — exactly the freeze this machinery exists to prevent.
 *  - Ray MISSES everything (content panned beside the screen center): the
 *    center projection when it lies ahead — the pivot keeps the content's
 *    depth instead of going stale — else `fallback`.
 *
 * The midpoint-not-surface choice is what lets a dolly-in actually ENTER the
 * volume; re-seating on every settle keeps the pivot ahead of the camera as
 * it advances. `fallback` is the caller's current target distance (a no-op).
 */
export function orbitDepthAlongRay(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  boxes: readonly THREE.Box3[],
  fallback: number,
): number {
  const chord = unionChordAlongRay(origin, direction, boxes);
  const tc = unionCenterT(origin, direction, boxes);
  let depth: number;
  if (chord) {
    if (chord.tIn >= 0 && tc !== null) {
      depth = Math.min(Math.max(tc, chord.tIn), chord.tOut);
    } else {
      depth = (Math.max(chord.tIn, 0) + chord.tOut) / 2;
    }
  } else {
    depth = tc !== null && tc > 0 ? tc : fallback;
  }
  return depth > 0 ? depth : fallback;
}

/**
 * The OLD nearest-box rule, kept for cursor picking (double-click recenter):
 * midpoint of the visible chord through the NEAREST box along the ray — the
 * box the user pointed at beats the union midpoint between it and a box far
 * behind it. No hit → `fallback`.
 */
export function nearestChordMidpointAlongRay(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  boxes: readonly THREE.Box3[],
  fallback: number,
): number {
  let bestEntry = Number.POSITIVE_INFINITY;
  let best = fallback;
  for (const box of boxes) {
    if (box.isEmpty()) continue;
    const t = slabT(origin, direction, box);
    if (!t) continue;
    const [tEntry, tExit] = t;
    if (tExit <= 0) continue; // entirely behind the camera
    const entry = Math.max(tEntry, 0);
    if (entry < bestEntry) {
      bestEntry = entry;
      best = (entry + tExit) / 2;
    }
  }
  return best > 0 ? best : fallback;
}

/**
 * The `panSpeed` that makes a drag screen-space correct at `contentDistance`:
 * three multiplies pan by `panSpeed · targetDistance`, so the ratio replaces
 * the target term with the content term exactly. Clamped only against
 * degenerate geometry (collapsed radius, content at the near plane) — within
 * the clamp the target distance cancels and no tuning constant is involved.
 */
export function resolvePanSpeed(
  contentDistance: number,
  targetDistance: number,
  maxRatio = 1e4,
): number {
  if (!(contentDistance > 0) || !(targetDistance > 0)) return 1;
  if (!Number.isFinite(contentDistance) || !Number.isFinite(targetDistance)) return 1;
  return THREE.MathUtils.clamp(contentDistance / targetDistance, 1 / maxRatio, maxRatio);
}
