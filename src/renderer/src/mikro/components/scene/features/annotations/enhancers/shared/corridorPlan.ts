import type { Vec3 } from "./strokeModel";

/**
 * The corridor: the box of level voxels the skeleton extraction is allowed to
 * work in. Like `features/annotations/enhancers/paths/vectorTrace/traceBox` it exists because a 3D search grows
 * cubically — but a stroke is tube-shaped, not endpoint-pair-shaped, so the
 * box is the stroke's dilated bounding box and the CORRIDOR TEST
 * (`corridorCost.inCorridor`) is what keeps the working set tube-thin inside
 * it. The box merely bounds the buffers.
 */

export type CorridorBox = {
  /** Level-voxel coordinates of the box's min corner. */
  origin: Vec3;
  /** Voxel counts along x, y, z. */
  size: Vec3;
};

/**
 * Buffer ceiling for one extraction. dist + pred at 4M voxels is 32 MB of
 * readback — a click can wait for that; it cannot wait for the next octave.
 * Overflow answers null and the caller retries one pyramid level coarser.
 */
export const MAX_CORRIDOR_VOXELS = 4_000_000;

export type CorridorPlanInput = {
  /** The resampled stroke, world coordinates. */
  strokeWorld: readonly Vec3[];
  /** Brush radius in world units. */
  radiusWorld: number;
  /** World point → LEVEL-voxel coordinates (continuous, not rounded). */
  worldToLevelVoxel: (world: Vec3) => Vec3;
  /** World length of one level voxel along each axis (anisotropy-aware pad). */
  levelVoxelWorldSize: Vec3;
  /** Level spatial extent, voxels. */
  levelShape: Vec3;
  maxVoxels?: number;
};

/**
 * The stroke's bounding box in level-voxel space, dilated by the brush radius
 * (converted per axis — z spacing is routinely several times xy) plus one
 * voxel so the geodesic can round a corner at the corridor wall. Clamped to
 * the level; null when the box exceeds the voxel budget.
 */
export function planCorridor(input: CorridorPlanInput): CorridorBox | null {
  const {
    strokeWorld,
    radiusWorld,
    worldToLevelVoxel,
    levelVoxelWorldSize,
    levelShape,
    maxVoxels = MAX_CORRIDOR_VOXELS,
  } = input;
  if (strokeWorld.length === 0) return null;

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const world of strokeWorld) {
    const v = worldToLevelVoxel(world);
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], v[axis]);
      max[axis] = Math.max(max[axis], v[axis]);
    }
  }

  const origin: [number, number, number] = [0, 0, 0];
  const size: [number, number, number] = [1, 1, 1];
  for (let axis = 0; axis < 3; axis += 1) {
    const pad = Math.ceil(radiusWorld / (levelVoxelWorldSize[axis] || 1)) + 1;
    const from = Math.max(0, Math.floor(min[axis]) - pad);
    const to = Math.min(
      Math.max(0, levelShape[axis] - 1),
      Math.ceil(max[axis]) + pad,
    );
    origin[axis] = from;
    size[axis] = Math.max(1, to - from + 1);
  }

  if (size[0] * size[1] * size[2] > maxVoxels) return null;
  return { origin, size };
}

/** Flat index of a box voxel, x-fastest — the layout every buffer here uses. */
export const corridorIndex = (box: CorridorBox, x: number, y: number, z: number): number =>
  x + y * box.size[0] + z * box.size[0] * box.size[1];

export const corridorVoxelCount = (box: CorridorBox): number =>
  box.size[0] * box.size[1] * box.size[2];
