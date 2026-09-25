import * as THREE from "three";

import { planCorridor, type CorridorBox } from "./corridorPlan";
import { simplifyPath, type PathPoint } from "./pathSimplify";
import { climToUnit } from "../../../../platform/model/dataRange";
import { voxelWorldSizeOf } from "../../../../platform/coords/worldTransform";
import type { Vec3 } from "./strokeModel";

/**
 * The planning half of the skeleton/blob extractions: which pyramid level,
 * which corridor, and the coordinate plumbing between the three frames in
 * play (world ↔ level voxels ↔ box-relative voxels). Everything here is
 * deterministic arithmetic over plain inputs — the engines
 * (`cpuEngine.ts`/`gpuEngine.ts`) consume a `PickedCorridor`, and the hook
 * (`useBrushSkeleton`) owns the store/gesture side.
 */

/** A corridor resolved to a concrete pyramid level. */
export type PickedCorridor = {
  level: number;
  box: CorridorBox;
  /** Level-0 voxels per level voxel, per axis. */
  step: readonly [number, number, number];
  /** World size of one level voxel per axis. */
  spacing: Vec3;
  worldToLevelVoxel: (world: Vec3) => Vec3;
};

const pickScratch = new THREE.Vector3();

/**
 * The finest level whose voxels are at least `minSpacingWorld` along their
 * largest axis — the "detail" floor: a stroke asked for 4-voxel detail has no
 * business marching a level-0 field. Capped at the pyramid's coarsest level.
 */
export function levelForSpacing(
  minSpacingWorld: number,
  voxelSize: readonly [number, number, number],
  levelSteps: readonly (readonly [number, number, number])[],
): number {
  for (let level = 0; level < levelSteps.length; level += 1) {
    const step = levelSteps[level];
    const spacing = Math.max(voxelSize[0] * step[0], voxelSize[1] * step[1], voxelSize[2] * step[2]);
    if (spacing >= minSpacingWorld) return level;
  }
  return Math.max(0, levelSteps.length - 1);
}

/**
 * Choose the corridor: start at the on-screen level (or the detail floor,
 * whichever is coarser) and coarsen until the stroke's dilated tube fits
 * `maxVoxels` (`traceBox.chooseTraceLevel` restated over a stroke tube).
 */
export function pickCorridor(opts: {
  strokeWorld: readonly Vec3[];
  radiusWorld: number;
  inverse: THREE.Matrix4;
  voxelSize: readonly [number, number, number];
  levelSteps: readonly (readonly [number, number, number])[];
  shape: readonly [number, number, number];
  startLevel: number;
  maxVoxels: number;
  /** Detail floor: never march voxels finer than this (world units). */
  minSpacingWorld?: number;
}): PickedCorridor | null {
  const { strokeWorld, radiusWorld, inverse, voxelSize, levelSteps, shape } = opts;
  const floor =
    opts.minSpacingWorld !== undefined && opts.minSpacingWorld > 0
      ? levelForSpacing(opts.minSpacingWorld, voxelSize, levelSteps)
      : 0;
  for (let level = Math.max(opts.startLevel, floor); level < levelSteps.length; level += 1) {
    const step = levelSteps[level];
    const spacing: Vec3 = [
      voxelSize[0] * step[0],
      voxelSize[1] * step[1],
      voxelSize[2] * step[2],
    ];
    const worldToLevelVoxel = (world: Vec3): Vec3 => {
      // The layer's local frame IS corner-anchored level-0 voxel space
      // (COORDINATE_SYSTEMS.md), so a level voxel is local / step.
      pickScratch.set(world[0], world[1], world[2]).applyMatrix4(inverse);
      return [pickScratch.x / step[0], pickScratch.y / step[1], pickScratch.z / step[2]];
    };
    const levelShape: Vec3 = [
      Math.max(1, Math.ceil(shape[0] / step[0])),
      Math.max(1, Math.ceil(shape[1] / step[1])),
      Math.max(1, Math.ceil(shape[2] / step[2])),
    ];
    const box = planCorridor({
      strokeWorld: strokeWorld as Vec3[],
      radiusWorld,
      worldToLevelVoxel,
      levelVoxelWorldSize: spacing,
      levelShape,
      maxVoxels: opts.maxVoxels,
    });
    if (box) return { level, box, step, spacing, worldToLevelVoxel };
  }
  return null;
}

/**
 * World length of one level-0 voxel along each axis: the lengths of the
 * affine's basis vectors. This is what makes every search anisotropy-aware —
 * z spacing is routinely several times xy, and a lattice that ignored it
 * would prefer z-hops because they cover more ground for the same price.
 *
 * The enhancers' name for `platform/coords/worldTransform.ts`'s
 * `voxelWorldSizeOf`, which is the same three `Math.hypot` calls and used to
 * be a byte-identical second copy of them. The two were kept apart because
 * the platform one "needs no enhancers import" — but the dependency only ever
 * ran this way, and `platform/coords` is a leaf every tier may import, so one
 * definition serves both. The alias stays because the callers below read
 * better with the shorter name.
 */
export const voxelWorldSize = voxelWorldSizeOf;

/**
 * The layer's DISPLAY window in raw units — clim bounds resolved against the
 * pool's data range (`climToUnit`, the raymarcher's own convention).
 *
 * The brush normalizes intensity through THIS window, not the full data
 * range, on purpose: the user paints over what they SEE, and what they see
 * is clim-windowed. Wide-dtype data (uint16 microscopy) routinely lives in a
 * few percent of its dtype range — full-range normalization would make every
 * structure "dark" (a flat cost field, and a Wrap threshold that never
 * selects anything). Gamma stays out: it reshapes contrast monotonically, so
 * it moves no isosurface the slider can't reach.
 */
export function climWindow(
  layer: unknown,
  pool: { minValue: number; maxValue: number },
): { min: number; max: number } {
  const range = Math.max(pool.maxValue - pool.minValue, 1e-5);
  const clim = layer as { climMin?: number | null; climMax?: number | null };
  const c0 = climToUnit(clim.climMin ?? null, pool.minValue, pool.maxValue, 0);
  const c1 = climToUnit(clim.climMax ?? null, pool.minValue, pool.maxValue, 1);
  return {
    min: pool.minValue + c0 * range,
    max: pool.minValue + Math.max(c1, c0 + 1e-3) * range,
  };
}

/**
 * A level-0 voxel (a probe hit) brought to BOX-relative level coordinates,
 * clamped into the box — the geodesic's seed/target frame.
 */
export function boxRelative(
  voxel: Vec3,
  box: CorridorBox,
  step: readonly [number, number, number],
): Vec3 {
  return [
    Math.min(box.size[0] - 1, Math.max(0, Math.floor(voxel[0] / step[0]) - box.origin[0])),
    Math.min(box.size[1] - 1, Math.max(0, Math.floor(voxel[1] / step[1]) - box.origin[1])),
    Math.min(box.size[2] - 1, Math.max(0, Math.floor(voxel[2] / step[2]) - box.origin[2])),
  ];
}

const soupScratch = new THREE.Vector3();

/** Level-voxel triangle soup → world, the volume's own index→physical map. */
export function soupToWorld(
  levelPositions: Float32Array,
  step: readonly [number, number, number],
  affine: THREE.Matrix4,
): Float32Array {
  const out = new Float32Array(levelPositions.length);
  for (let i = 0; i < levelPositions.length; i += 3) {
    soupScratch
      .set(
        levelPositions[i] * step[0],
        levelPositions[i + 1] * step[1],
        levelPositions[i + 2] * step[2],
      )
      .applyMatrix4(affine);
    out[i] = soupScratch.x;
    out[i + 1] = soupScratch.y;
    out[i + 2] = soupScratch.z;
  }
  return out;
}

/** Same simplification allowance the vector trace uses, in node steps. */
const SIMPLIFY_TOLERANCE_STEPS = 0.5;

const nodeScratch = new THREE.Vector3();

/**
 * A backtracked centerline (level-voxel centers) → simplified world points:
 * the IDENTICAL index→physical map the volume itself renders through, then
 * `simplifyPath` to collapse the diagonal staircase.
 */
export function centerlineToWorld(
  nodes: readonly Vec3[],
  picked: PickedCorridor,
  affine: THREE.Matrix4,
): Vec3[] {
  const world = nodes.map((node) => {
    nodeScratch
      .set(node[0] * picked.step[0], node[1] * picked.step[1], node[2] * picked.step[2])
      .applyMatrix4(affine);
    return [nodeScratch.x, nodeScratch.y, nodeScratch.z] as PathPoint;
  });
  const tolerance =
    SIMPLIFY_TOLERANCE_STEPS *
    Math.min(picked.spacing[0], picked.spacing[1], picked.spacing[2]);
  return simplifyPath(world, tolerance) as Vec3[];
}

/**
 * Whether a surface still reaches the search sphere's boundary — the grow
 * loop's stop test. The tube closes flat against the corridor wall
 * (`tubeMarch`), parking those vertices just inside `radius`, so "any vertex
 * within `margin` of the boundary" is exactly "still clipped by it".
 */
export function touchesBoundary(
  positions: Float32Array,
  seedWorld: Vec3,
  radius: number,
  margin: number,
): boolean {
  const limit = Math.max(0, radius - margin);
  const limitSq = limit * limit;
  for (let i = 0; i < positions.length; i += 3) {
    const dx = positions[i] - seedWorld[0];
    const dy = positions[i + 1] - seedWorld[1];
    const dz = positions[i + 2] - seedWorld[2];
    if (dx * dx + dy * dy + dz * dz >= limitSq) return true;
  }
  return false;
}
