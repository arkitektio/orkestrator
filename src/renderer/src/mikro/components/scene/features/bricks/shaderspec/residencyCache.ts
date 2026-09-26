/**
 * CPU mirror of the raymarchers' residency CACHE (`emitCachedResidency` in
 * `gpu/brickNodeMaterials.ts`) — keep in lockstep.
 *
 * The level walk (`emitResolveBrickResidency`) is a chain of DEPENDENT page
 * table loads, and the volume raymarcher used to run it on every step, ~30–60
 * times inside one brick for the identical answer. The cache keeps the answer
 * while the next sample provably gets it too.
 *
 * What makes that provable: the walk reads nothing but, per visited level,
 * the brick index of the point — `floor(clamp(p / scale, 0, shape − 0.5001) /
 * payload)` — and that brick's page entry (fixed for the draw). So the result
 * is identical for every point whose brick index agrees at EVERY level the
 * walk visited. The cache records the INTERSECTION of those bricks' base-voxel
 * boxes; per level it is the brick's own box, and the intersection matters
 * because coarse brick boundaries need not nest the fine ones (a z scale of
 * 4.22 is real). Each face is pulled in by `CELL_BOX_EPSILON` so a point on a
 * boundary, where `p / scale / payload` and `brick · payload · scale` may round
 * apart, always re-resolves instead of trusting the cache.
 */

export const CELL_BOX_EPSILON = 1e-3;

export type Vec3 = readonly [number, number, number];
export type ResidencyLevel = { scale: Vec3; shape: Vec3 };

export type ResolvedResidency = {
  /** 0 unmapped, 1 resident, 2 empty. */
  status: number;
  /** The level the walk stopped at (−1 when it ran off the chain). */
  level: number;
  brick: Vec3 | null;
  /** Points inside [boxMin, boxMax) resolve identically at this desired level. */
  boxMin: Vec3;
  boxMax: Vec3;
};

/** The shader's walk, from `desiredLevel` up, with the validity box. */
export function resolveResidency(
  p: Vec3,
  desiredLevel: number,
  levels: readonly ResidencyLevel[],
  payload: Vec3,
  flagAt: (level: number, brick: Vec3) => number,
): ResolvedResidency {
  const boxMin = [-Infinity, -Infinity, -Infinity];
  const boxMax = [Infinity, Infinity, Infinity];
  for (let level = Math.max(desiredLevel, 0); level < levels.length; level++) {
    const { scale, shape } = levels[level];
    const brick = [0, 1, 2].map((a) => {
      const voxel = Math.min(Math.max(p[a] / scale[a], 0), shape[a] - 0.5001);
      return Math.floor(voxel / payload[a]);
    }) as unknown as Vec3;
    for (let a = 0; a < 3; a++) {
      const size = payload[a] * scale[a];
      boxMin[a] = Math.max(boxMin[a], brick[a] * size + CELL_BOX_EPSILON);
      boxMax[a] = Math.min(boxMax[a], (brick[a] + 1) * size - CELL_BOX_EPSILON);
    }
    const flag = flagAt(level, brick);
    if (flag === 1 || flag === 2) {
      return { status: flag, level, brick, boxMin: boxMin as never, boxMax: boxMax as never };
    }
  }
  return { status: 0, level: -1, brick: null, boxMin: boxMin as never, boxMax: boxMax as never };
}

/** The shader's hit test: same desired level, point strictly inside the box. */
export function residencyCacheHit(
  cached: { desiredLevel: number; boxMin: Vec3; boxMax: Vec3 },
  p: Vec3,
  desiredLevel: number,
): boolean {
  if (cached.desiredLevel !== desiredLevel) return false;
  for (let a = 0; a < 3; a++) {
    if (!(p[a] >= cached.boxMin[a] && p[a] < cached.boxMax[a])) return false;
  }
  return true;
}
