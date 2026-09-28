import type { BrickSpec } from "./brickSpec";
import type { LayerLevelGeometry, Vec3 } from "../../../platform/coords/levelGeometry";

/**
 * Octree node addressing. A node is one brick on one pyramid level, keyed by
 * its brick-grid coordinates on that level's own grid — no power-of-two
 * assumptions; parent/child relations are derived per axis from the levels'
 * scale ratios (so a pyramid that never downsamples z degenerates into a
 * quadtree along z automatically). All boxes are half-open `[min, max)` in
 * [x, y, z] order.
 */

export type VoxelBox = { min: Vec3; max: Vec3 };

export const nodeKey = (level: number, coords: Vec3): string =>
  `${level}:${coords[0]}:${coords[1]}:${coords[2]}`;

export function parseNodeKey(key: string): { level: number; coords: Vec3 } {
  const [level, x, y, z] = key.split(":").map(Number);
  return { level, coords: [x, y, z] };
}

/** Bricks per axis on a level's grid. */
export function brickGridForLevel(
  geo: LayerLevelGeometry,
  spec: BrickSpec,
  levelIndex: number,
): Vec3 {
  const shape = geo.levels[levelIndex].spatialShape;
  return [
    Math.ceil(shape[0] / spec.payload[0]),
    Math.ceil(shape[1] / spec.payload[1]),
    Math.ceil(shape[2] / spec.payload[2]),
  ];
}

/**
 * Total bricks across every level — the hard ceiling on how many atlas slots
 * a layer can ever occupy (for one slice signature). Small datasets must be
 * pool-sized by this, not by the device budget share, or a 1.5 MB debug
 * volume happily allocates a multi-hundred-MB atlas.
 */
export function totalBrickCount(geo: LayerLevelGeometry, spec: BrickSpec): number {
  let total = 0;
  for (let level = 0; level < geo.levels.length; level++) {
    const grid = brickGridForLevel(geo, spec, level);
    total += grid[0] * grid[1] * grid[2];
  }
  return total;
}

/** Payload box in level voxels, clamped to the level shape (edge bricks). */
export function nodeVoxelBox(
  geo: LayerLevelGeometry,
  spec: BrickSpec,
  levelIndex: number,
  coords: Vec3,
): VoxelBox {
  const shape = geo.levels[levelIndex].spatialShape;
  const min: [number, number, number] = [0, 0, 0];
  const max: [number, number, number] = [0, 0, 0];
  for (const axis of [0, 1, 2] as const) {
    min[axis] = Math.min(coords[axis] * spec.payload[axis], shape[axis]);
    max[axis] = Math.min(min[axis] + spec.payload[axis], shape[axis]);
  }
  return { min, max };
}

/**
 * Voxels the repack step needs from the source level: the payload box plus
 * the border guard band, clamped to the level shape (out-of-range border
 * voxels are edge-replicated during repack instead).
 */
export function fetchVoxelBox(
  geo: LayerLevelGeometry,
  spec: BrickSpec,
  levelIndex: number,
  coords: Vec3,
): VoxelBox {
  const { min, max } = nodeVoxelBox(geo, spec, levelIndex, coords);
  const shape = geo.levels[levelIndex].spatialShape;
  return {
    min: [
      Math.max(0, min[0] - spec.border),
      Math.max(0, min[1] - spec.border),
      Math.max(0, min[2] - spec.border),
    ],
    max: [
      Math.min(shape[0], max[0] + spec.border),
      Math.min(shape[1], max[1] + spec.border),
      Math.min(shape[2], max[2] + spec.border),
    ],
  };
}

/** Payload box scaled into base (level-0-equivalent) voxel space. */
export function nodeBaseBox(
  geo: LayerLevelGeometry,
  spec: BrickSpec,
  levelIndex: number,
  coords: Vec3,
): VoxelBox {
  const { min, max } = nodeVoxelBox(geo, spec, levelIndex, coords);
  const scale = geo.levels[levelIndex].scale;
  return {
    min: [min[0] * scale[0], min[1] * scale[1], min[2] * scale[2]],
    max: [max[0] * scale[0], max[1] * scale[1], max[2] * scale[2]],
  };
}

/** Bricks on the next-finer level overlapping this node's base-space box. */
export function childrenOf(
  geo: LayerLevelGeometry,
  spec: BrickSpec,
  levelIndex: number,
  coords: Vec3,
): Vec3[] {
  if (levelIndex <= 0) return [];
  const childLevel = levelIndex - 1;
  const base = nodeBaseBox(geo, spec, levelIndex, coords);
  const childScale = geo.levels[childLevel].scale;
  const childGrid = brickGridForLevel(geo, spec, childLevel);

  const lo: number[] = [];
  const hi: number[] = [];
  for (const axis of [0, 1, 2] as const) {
    const v0 = base.min[axis] / childScale[axis];
    const v1 = base.max[axis] / childScale[axis];
    const b0 = Math.max(0, Math.floor(v0 / spec.payload[axis]));
    const b1 = Math.min(childGrid[axis], Math.ceil(v1 / spec.payload[axis]));
    if (b1 <= b0) return [];
    lo.push(b0);
    hi.push(b1);
  }

  const children: Vec3[] = [];
  for (let z = lo[2]; z < hi[2]; z++)
    for (let y = lo[1]; y < hi[1]; y++)
      for (let x = lo[0]; x < hi[0]; x++) children.push([x, y, z]);
  return children;
}

/**
 * Which voxels a brick fetch covers. `"full"` = payload + border guard band
 * (`fetchVoxelBox`); `"core"` = the payload only (`nodeVoxelBox`) — the
 * two-phase brick's first pass, whose border is edge-replicated from the
 * payload and refined later by a `"full"` pass. With `spec.border === 0` the
 * two are identical.
 */
export type FetchPhase = "core" | "full";

/** The voxel box a fetch of the given phase needs from the source level. */
export function brickFetchBox(
  geo: LayerLevelGeometry,
  spec: BrickSpec,
  levelIndex: number,
  coords: Vec3,
  phase: FetchPhase = "full",
): VoxelBox {
  return phase === "core"
    ? nodeVoxelBox(geo, spec, levelIndex, coords)
    : fetchVoxelBox(geo, spec, levelIndex, coords);
}

/** Spatial zarr chunk coords ([x, y, z] chunk indices) covering the phase's fetch box. */
export function chunksTouchingBrick(
  geo: LayerLevelGeometry,
  spec: BrickSpec,
  levelIndex: number,
  coords: Vec3,
  phase: FetchPhase = "full",
): Vec3[] {
  const box = brickFetchBox(geo, spec, levelIndex, coords, phase);
  const chunkShape = geo.levels[levelIndex].spatialChunks;

  const lo: number[] = [];
  const hi: number[] = [];
  for (const axis of [0, 1, 2] as const) {
    if (box.max[axis] <= box.min[axis]) return [];
    lo.push(Math.floor(box.min[axis] / chunkShape[axis]));
    hi.push(Math.ceil(box.max[axis] / chunkShape[axis]));
  }

  const chunkCoords: Vec3[] = [];
  for (let z = lo[2]; z < hi[2]; z++)
    for (let y = lo[1]; y < hi[1]; y++)
      for (let x = lo[0]; x < hi[0]; x++) chunkCoords.push([x, y, z]);
  return chunkCoords;
}
