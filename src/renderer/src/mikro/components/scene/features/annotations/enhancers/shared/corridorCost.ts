import type { Vec3 } from "./strokeModel";
import { corridorIndex, type CorridorBox } from "./corridorPlan";

/**
 * What one corridor voxel costs to travel through — the SINGLE SOURCE of the
 * cost semantics. `features/annotations/enhancers/shared/gpu/skeletonKernel.ts` mirrors these formulas in
 * WGSL and the parity self-test pins the two together, so a change here
 * without the twin change there is a test failure, not a silent drift.
 *
 * The centerline is the geodesic through this field: bright voxels are cheap,
 * so the shortest path between the stroke's endpoints runs along the bright
 * core of the structure the user painted over.
 */

export type SkeletonWeights = {
  /** How much a fully dark voxel resists, on top of the base cost. */
  intensity: number;
  /** Contrast shaping: higher = only the truly bright core is cheap. */
  exponent: number;
};

export const DEFAULT_SKELETON_WEIGHTS: SkeletonWeights = {
  intensity: 1,
  exponent: 2,
};

/**
 * Strictly-positive floor, same role as `traceSearch.TRACE_BASE_COST`: a
 * zero-cost region would let the geodesic wander through it for free.
 */
export const SKELETON_BASE_COST = 0.05;

/**
 * Impassable. A finite sentinel rather than `Infinity` because the GPU field
 * is f32 storage the relaxation kernel adds to — `INF + step` must stay
 * recognizably enormous, not NaN-adjacent. `fround`ed so the value is exactly
 * representable in f32: what a `Float32Array` (or a WGSL buffer) stores is
 * the sentinel itself, not a neighbour of it.
 */
export const INF_COST = Math.fround(1e30);

/** Cost of a voxel with normalized intensity `i` in [0, 1]. */
export function voxelCost(i: number, weights: SkeletonWeights): number {
  const dark = 1 - Math.min(1, Math.max(0, i));
  return SKELETON_BASE_COST + weights.intensity * Math.pow(dark, weights.exponent);
}

/**
 * Squared world distance from a point to the segment [a, b], all three given
 * in LEVEL-voxel coordinates with `spacing` scaling each axis to world units.
 * Anisotropy is not decoration: with 4 µm z over 0.3 µm xy an unscaled radius
 * would make the corridor a plate, not a tube.
 */
export function segmentDistanceSq(
  p: Vec3,
  a: Vec3,
  b: Vec3,
  spacing: Vec3,
): number {
  const ax = (p[0] - a[0]) * spacing[0];
  const ay = (p[1] - a[1]) * spacing[1];
  const az = (p[2] - a[2]) * spacing[2];
  const bx = (b[0] - a[0]) * spacing[0];
  const by = (b[1] - a[1]) * spacing[1];
  const bz = (b[2] - a[2]) * spacing[2];
  const lenSq = bx * bx + by * by + bz * bz;
  const t =
    lenSq > 0
      ? Math.min(1, Math.max(0, (ax * bx + ay * by + az * bz) / lenSq))
      : 0;
  const dx = ax - t * bx;
  const dy = ay - t * by;
  const dz = az - t * bz;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Whether a level voxel's CENTER lies within `radiusWorld` of the stroke
 * polyline. `strokeLevelPts` are the resampled stroke points in level-voxel
 * coordinates; a single-point stroke degenerates to a sphere test.
 */
export function inCorridor(
  voxel: Vec3,
  strokeLevelPts: readonly Vec3[],
  radiusWorld: number,
  spacing: Vec3,
): boolean {
  const p: Vec3 = [voxel[0] + 0.5, voxel[1] + 0.5, voxel[2] + 0.5];
  const rSq = radiusWorld * radiusWorld;
  if (strokeLevelPts.length === 1) {
    return segmentDistanceSq(p, strokeLevelPts[0], strokeLevelPts[0], spacing) <= rSq;
  }
  for (let i = 0; i + 1 < strokeLevelPts.length; i += 1) {
    if (segmentDistanceSq(p, strokeLevelPts[i], strokeLevelPts[i + 1], spacing) <= rSq) {
      return true;
    }
  }
  return false;
}

/**
 * The CONNECTIVITY field for the smooth-blob's Gap: bright voxels (cost at
 * or below the iso, i.e. intensity at or above τ — cost is monotone) travel
 * for FREE, dark voxels cost their world length, walls stay impassable. A
 * geodesic over this field therefore measures the minimal total DARK
 * distance from the seed — "how much gap must be crossed to reach here" —
 * which is what the Gap slider thresholds. CPU twin of the cost kernel's
 * binary mode (`binary_tau`).
 */
export function connectivityFromCost(
  cost: Float32Array,
  iso: number,
): Float32Array {
  const out = new Float32Array(cost.length);
  for (let i = 0; i < cost.length; i += 1) {
    out[i] = cost[i] >= INF_COST ? INF_COST : cost[i] <= iso ? 0 : 1;
  }
  return out;
}

/**
 * Mask a (smoothed) field by the connectivity distance: voxels farther than
 * `gapLimit` from the seed's component read as OUTSIDE (`clampValue`), so
 * the marched surface simply cannot exist there. CPU twin of the tube
 * kernel's `gap_limit` corner test.
 */
export function maskFieldByDistance(
  field: Float32Array,
  dist: Float32Array,
  gapLimit: number,
  clampValue: number,
): Float32Array {
  const out = new Float32Array(field.length);
  for (let i = 0; i < field.length; i += 1) {
    out[i] = dist[i] > gapLimit ? clampValue : field[i];
  }
  return out;
}

export type CostFieldResult = {
  /** Per-voxel travel resistance; `INF_COST` = impassable. x-fastest. */
  cost: Float32Array;
  /** Corridor voxels that had nothing resident — the "may detour" count. */
  holes: number;
};

/**
 * The CPU twin of the GPU cost kernel: sample every corridor-box voxel and
 * price it. `sample` answers normalized intensity in [0, 1] or null for
 * nothing-resident; outside the corridor tube and unresident voxels are both
 * impassable, but only the latter count as holes — the tube wall is policy,
 * a hole is missing data the user should hear about.
 */
export function buildCostField(opts: {
  box: CorridorBox;
  strokeLevelPts: readonly Vec3[];
  radiusWorld: number;
  spacing: Vec3;
  weights: SkeletonWeights;
  sample: (levelVoxel: Vec3) => number | null;
}): CostFieldResult {
  const { box, strokeLevelPts, radiusWorld, spacing, weights, sample } = opts;
  const cost = new Float32Array(box.size[0] * box.size[1] * box.size[2]);
  let holes = 0;
  for (let z = 0; z < box.size[2]; z += 1) {
    for (let y = 0; y < box.size[1]; y += 1) {
      for (let x = 0; x < box.size[0]; x += 1) {
        const voxel: Vec3 = [
          box.origin[0] + x,
          box.origin[1] + y,
          box.origin[2] + z,
        ];
        const index = corridorIndex(box, x, y, z);
        if (!inCorridor(voxel, strokeLevelPts, radiusWorld, spacing)) {
          cost[index] = INF_COST;
          continue;
        }
        const value = sample(voxel);
        if (value === null) {
          cost[index] = INF_COST;
          holes += 1;
          continue;
        }
        cost[index] = voxelCost(value, weights);
      }
    }
  }
  return { cost, holes };
}
