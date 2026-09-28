/**
 * The cull pass's box: what of the point cloud the camera can see, in the DATA's own space.
 *
 * The kernel tests each point centre against an axis-aligned box in the space the position
 * buffer is written in (`pointsCompute.ts`), because the layer's matrix sits between the data
 * and the world and a world-space test would need the inverse per point. So the frustum is
 * carried INTO data space instead: `frustumBoxIntersectionAabb` over `viewProjection × model`
 * gives the exact AABB of (frustum ∩ the cloud's own bounds), the same construction the image
 * layers' visible ranges use (`platform/visibility/visibility.ts`).
 *
 * Every step errs towards drawing. The contract is "never cull a point that is on screen";
 * drawing one that is not only costs what culling was saving.
 *
 *  - A point is a view-space quad `pointSize` wide, so its centre can sit up to half a diagonal
 *    OUTSIDE the frustum and still paint pixels. That radius is taken into data space through
 *    the Frobenius norm of the model matrix's inverse (an upper bound on its largest singular
 *    value — assumes an unscaled camera, as three's controls leave it), the cloud's bounds are
 *    grown by it before the intersection, and the result is grown by it again after.
 *  - The result is grown by a further `slack` of its own extent. The cull is re-dispatched on
 *    the view store's THROTTLED camera emissions, not per frame, so between two of them the
 *    survivor list is a few frames old; the slack is what stops the edge from popping during a
 *    slow coast. The layer drops the box altogether while the camera is flagged moving.
 *  - Anything the math cannot vouch for — a singular or non-finite matrix, no bounds — is
 *    UNBOUNDED, never empty.
 */
import * as THREE from "three";
import {
  frustumBoxIntersectionAabb,
  type FrustumClipCoordinateSystem,
} from "../../platform/visibility/frustumClip";

export type CullBox = {
  min: [number, number, number];
  max: [number, number, number];
};

/** Every point survives the spatial test. */
export const UNBOUNDED_CULL_BOX: CullBox = Object.freeze({
  min: [-Infinity, -Infinity, -Infinity],
  max: [Infinity, Infinity, Infinity],
}) as CullBox;

/** No point survives: min above max on every axis, so no centre can satisfy both sides. */
export const EMPTY_CULL_BOX: CullBox = Object.freeze({
  min: [Infinity, Infinity, Infinity],
  max: [-Infinity, -Infinity, -Infinity],
}) as CullBox;

/** Fraction of the visible extent added on each side; see the header. */
export const DEFAULT_CULL_SLACK = 0.25;

/**
 * The cloud's own AABB, in the position buffer's space. A 2D cloud has z pinned to 0, which is
 * what the kernel substitutes for it. Non-finite coordinates are skipped: they fail every
 * comparison in the kernel, so they never draw whatever the box is. Null when nothing is finite.
 */
export const pointDataBounds = (
  positions: Float32Array,
  stride: 2 | 3,
  count: number,
): CullBox | null => {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  let any = false;
  for (let i = 0; i < count; i++) {
    const base = i * stride;
    const x = positions[base];
    const y = positions[base + 1];
    const z = stride === 3 ? positions[base + 2] : 0;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    any = true;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return any ? { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] } : null;
};

const linear = new THREE.Matrix3();

/**
 * An upper bound on how far one view-space unit reaches in data space: the Frobenius norm of
 * the inverse of the model matrix's linear part. Null when that part is singular or not finite.
 */
export const inverseGainBound = (model: THREE.Matrix4): number | null => {
  linear.setFromMatrix4(model);
  const det = linear.determinant();
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  linear.invert();
  let sum = 0;
  for (const value of linear.elements) sum += value * value;
  const gain = Math.sqrt(sum);
  return Number.isFinite(gain) ? gain : null;
};

// Preallocated scratch: this runs once per camera emission (~17/s during a gesture).
const dataToClip = new THREE.Matrix4();
const hitBox = new THREE.Box3();

export type PointCullBoxInput = {
  /** `camera.projectionMatrix × camera.matrixWorldInverse`. */
  viewProjection: THREE.Matrix4;
  /** The layer's world matrix: data space -> world. */
  model: THREE.Matrix4;
  /** `pointDataBounds` of the cloud; null draws everything. */
  dataBounds: CullBox | null;
  /** The material's `uPointSize`, in view-space units. */
  pointSize: number;
  coordinateSystem: FrustumClipCoordinateSystem;
  slack?: number;
};

export const pointCullBox = ({
  viewProjection,
  model,
  dataBounds,
  pointSize,
  coordinateSystem,
  slack = DEFAULT_CULL_SLACK,
}: PointCullBoxInput): CullBox => {
  if (!dataBounds) return UNBOUNDED_CULL_BOX;
  const gain = inverseGainBound(model);
  if (gain === null) return UNBOUNDED_CULL_BOX;
  // Half the quad's diagonal: the corner offsets span [-0.5, 0.5]² times the point size.
  const radius = Math.max(0, pointSize) * Math.SQRT1_2 * gain;
  if (!Number.isFinite(radius)) return UNBOUNDED_CULL_BOX;

  dataToClip.multiplyMatrices(viewProjection, model);
  if (!Number.isFinite(dataToClip.determinant()) || dataToClip.determinant() === 0) {
    return UNBOUNDED_CULL_BOX;
  }
  const hit = frustumBoxIntersectionAabb(
    dataToClip,
    [dataBounds.min[0] - radius, dataBounds.min[1] - radius, dataBounds.min[2] - radius],
    [dataBounds.max[0] + radius, dataBounds.max[1] + radius, dataBounds.max[2] + radius],
    hitBox,
    coordinateSystem,
  );
  if (!hit) return EMPTY_CULL_BOX;

  const min: [number, number, number] = [hitBox.min.x, hitBox.min.y, hitBox.min.z];
  const max: [number, number, number] = [hitBox.max.x, hitBox.max.y, hitBox.max.z];
  for (let axis = 0; axis < 3; axis++) {
    // Plus a relative epsilon: the intersection's round-trip through the inverse clip matrix
    // lands a hair inside an on-screen edge, and a point exactly there must not flicker out.
    const rounding = 1e-6 * Math.max(1, Math.abs(min[axis]), Math.abs(max[axis]));
    const pad = radius + slack * (max[axis] - min[axis]) + rounding;
    min[axis] -= pad;
    max[axis] += pad;
    if (!Number.isFinite(min[axis]) || !Number.isFinite(max[axis])) return UNBOUNDED_CULL_BOX;
  }
  return { min, max };
};

export const sameCullBox = (a: CullBox | null, b: CullBox): boolean =>
  !!a &&
  a.min[0] === b.min[0] &&
  a.min[1] === b.min[1] &&
  a.min[2] === b.min[2] &&
  a.max[0] === b.max[0] &&
  a.max[1] === b.max[1] &&
  a.max[2] === b.max[2];
