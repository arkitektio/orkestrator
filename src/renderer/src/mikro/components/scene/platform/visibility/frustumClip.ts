import * as THREE from "three";

/**
 * Exact AABB of (view frustum ∩ axis-aligned box), computed in the box's own
 * space.
 *
 * The legacy visible-box estimate was a DOUBLE AABB — world AABB of the 8
 * frustum corners ∩ the layer's world AABB, then re-AABBed through the
 * inverse affine. Under a 3D perspective camera the frustum's world AABB
 * almost always contains the entire layer once the camera is near or inside
 * the volume, so `visibleBox` degenerated to ~the whole dataset: the
 * planner's budget floor (`visibleBytesAtLevel`) stopped tracking what is
 * actually on screen, deep zoom could not unlock finer levels, and tilting
 * inflated the AABB further (up to ~√3×), flipping `budgetMinLevel` across
 * its byte threshold mid-gesture — replacing the whole finest target set
 * (abort/fetch/evict churn) during the exact gesture that is already
 * fragment-bound.
 *
 * This helper instead intersects the true frustum polytope with the box and
 * returns the tight AABB of the intersection. The classic exact construction:
 * the intersection of two convex polytopes is convex, and every vertex of it
 * is one of
 *   1. a frustum corner inside the box,
 *   2. a box corner inside the frustum,
 *   3. a frustum edge ∩ box face point,
 *   4. a box edge ∩ frustum plane point (inside the other 5 planes).
 * The AABB over those candidates is exact — no inflation under tilt.
 *
 * Coordinate system: WebGPU projection matrices map NDC z to [0, 1] (the
 * renderer is WebGPU-only, §5), WebGL-convention matrices (unit tests,
 * hand-built cameras) to [-1, 1]. The convention decides both the plane
 * extraction and which NDC z the near corners unproject from.
 */

export type FrustumClipCoordinateSystem =
  | typeof THREE.WebGLCoordinateSystem
  | typeof THREE.WebGPUCoordinateSystem;

/** Containment slack in box units (voxels here) — kills FP noise at faces. */
const EPS = 1e-4;

// Preallocated scratch (single-threaded, one computation at a time; runs per
// layer per camera write, ~16/s during a gesture — must not allocate).
const frustum = new THREE.Frustum();
const invClip = new THREE.Matrix4();
const corners: THREE.Vector3[] = Array.from({ length: 8 }, () => new THREE.Vector3());
const point = new THREE.Vector3();
const outBox = new THREE.Box3();

/**
 * Frustum corner order: index bit 0 = x (−1|+1), bit 1 = y (−1|+1),
 * bit 2 = z (near|far). Edges connect corners differing in exactly one bit.
 */
const FRUSTUM_EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [2, 3], [4, 5], [6, 7], // x edges
  [0, 2], [1, 3], [4, 6], [5, 7], // y edges
  [0, 4], [1, 5], [2, 6], [3, 7], // near→far edges
];

const insideBox = (
  p: THREE.Vector3,
  min: readonly [number, number, number],
  max: readonly [number, number, number],
): boolean =>
  p.x >= min[0] - EPS && p.x <= max[0] + EPS &&
  p.y >= min[1] - EPS && p.y <= max[1] + EPS &&
  p.z >= min[2] - EPS && p.z <= max[2] + EPS;

const insidePlanes = (p: THREE.Vector3, skip: number): boolean => {
  for (let i = 0; i < 6; i++) {
    if (i === skip) continue;
    if (frustum.planes[i].distanceToPoint(p) < -EPS) return false;
  }
  return true;
};

const axisOf = (p: THREE.Vector3, axis: 0 | 1 | 2): number =>
  axis === 0 ? p.x : axis === 1 ? p.y : p.z;

/**
 * Compute the AABB of (frustum ∩ [boxMin, boxMax]) into `out`.
 * `spaceToClip` maps the box's space to clip space (for a layer:
 * projScreenMatrix × affine, so the box space IS voxel space).
 * Returns false when the intersection is empty (out is left empty).
 */
export function frustumBoxIntersectionAabb(
  spaceToClip: THREE.Matrix4,
  boxMin: readonly [number, number, number],
  boxMax: readonly [number, number, number],
  out: THREE.Box3,
  coordinateSystem: FrustumClipCoordinateSystem = THREE.WebGLCoordinateSystem,
): boolean {
  frustum.setFromProjectionMatrix(spaceToClip, coordinateSystem);
  invClip.copy(spaceToClip).invert();

  const ndcNearZ = coordinateSystem === THREE.WebGPUCoordinateSystem ? 0 : -1;
  for (let i = 0; i < 8; i++) {
    corners[i]
      .set((i & 1) === 0 ? -1 : 1, (i & 2) === 0 ? -1 : 1, (i & 4) === 0 ? ndcNearZ : 1)
      .applyMatrix4(invClip);
  }

  outBox.makeEmpty();

  // 1. Frustum corners inside the box.
  for (let i = 0; i < 8; i++) {
    if (insideBox(corners[i], boxMin, boxMax)) outBox.expandByPoint(corners[i]);
  }

  // 2. Box corners inside the frustum.
  for (let i = 0; i < 8; i++) {
    point.set(
      (i & 1) === 0 ? boxMin[0] : boxMax[0],
      (i & 2) === 0 ? boxMin[1] : boxMax[1],
      (i & 4) === 0 ? boxMin[2] : boxMax[2],
    );
    if (insidePlanes(point, -1)) outBox.expandByPoint(point);
  }

  // 3. Frustum edges against the box's 6 face planes.
  for (const [ai, bi] of FRUSTUM_EDGES) {
    const a = corners[ai];
    const b = corners[bi];
    for (let axis = 0 as 0 | 1 | 2; axis < 3; axis++) {
      const av = axisOf(a, axis);
      const bv = axisOf(b, axis);
      const dv = bv - av;
      if (Math.abs(dv) < 1e-12) continue;
      for (let side = 0; side <= 1; side++) {
        const bound = side === 0 ? boxMin[axis] : boxMax[axis];
        const t = (bound - av) / dv;
        if (t < -EPS || t > 1 + EPS) continue;
        point.copy(a).lerp(b, Math.min(1, Math.max(0, t)));
        if (insideBox(point, boxMin, boxMax)) outBox.expandByPoint(point);
      }
    }
  }

  // 4. Box edges against the 6 frustum planes.
  for (let axis = 0 as 0 | 1 | 2; axis < 3; axis++) {
    const u = ((axis + 1) % 3) as 0 | 1 | 2;
    const v = ((axis + 2) % 3) as 0 | 1 | 2;
    for (let ub = 0; ub <= 1; ub++) {
      for (let vb = 0; vb <= 1; vb++) {
        // Edge runs along `axis`; the other two coordinates are pinned.
        const set = (t: number) => {
          point.setComponent(axis, boxMin[axis] + t * (boxMax[axis] - boxMin[axis]));
          point.setComponent(u, ub === 0 ? boxMin[u] : boxMax[u]);
          point.setComponent(v, vb === 0 ? boxMin[v] : boxMax[v]);
        };
        for (let pi = 0; pi < 6; pi++) {
          const plane = frustum.planes[pi];
          set(0);
          const da = plane.distanceToPoint(point);
          set(1);
          const db = plane.distanceToPoint(point);
          if ((da < 0) === (db < 0)) continue; // no straddle
          const t = da / (da - db);
          set(t);
          if (insidePlanes(point, pi)) outBox.expandByPoint(point);
        }
      }
    }
  }

  if (outBox.isEmpty()) {
    out.makeEmpty();
    return false;
  }

  // Clamp eps leakage back into the box.
  out.min.set(
    Math.max(boxMin[0], outBox.min.x),
    Math.max(boxMin[1], outBox.min.y),
    Math.max(boxMin[2], outBox.min.z),
  );
  out.max.set(
    Math.min(boxMax[0], outBox.max.x),
    Math.min(boxMax[1], outBox.max.y),
    Math.min(boxMax[2], outBox.max.z),
  );
  return true;
}
