import * as THREE from "three";
import { octreeCellKey } from "../parquet/mortonCell";

/**
 * The catalog pass both LOD-Parquet formats run at load: voxel-space cell
 * boxes into WORLD space, once per (collection, matrix).
 *
 * Doing the transform here rather than per plan is what lets each planner work
 * with the real camera and the real frustum — no inverse-matrix pull-through,
 * no per-plan `Frustum` clone — and it costs one pass over the catalog,
 * repeated only when the layer matrix changes, which is a registration edit and
 * not a frame event.
 */

/** What the world pass needs of a catalog row; formats carry more. */
export type LodCellRow = {
  level: number;
  cell: number;
  bboxMin: readonly [number, number, number];
  bboxMax: readonly [number, number, number];
  /** Upper bound, in VOXELS, on how far this level moves a vertex from level 0. */
  lodError: number;
};

/** The world-space facts the pass adds to every row. */
export type LodWorldCell = {
  key: string;
  worldMin: [number, number, number];
  worldMax: [number, number, number];
  /** `lodError` in world units; see `maxAxisScale`. */
  worldLodError: number;
};

/**
 * The largest scale factor the voxel→world map applies along any axis.
 *
 * An LOD error is a scalar, but the voxel→world map is anisotropic, so there is
 * no single "the" scale. The max is the conservative choice: it can only
 * over-state the error, which refines too eagerly rather than too late.
 *
 * Not `voxelWorldSizeOf` + `Math.max`: that one substitutes 1 for a degenerate
 * axis, which is right for a step size and wrong here — a collapsed axis should
 * shrink this bound, not pin it to 1.
 */
export function maxAxisScale(matrix: THREE.Matrix4): number {
  const e = matrix.elements;
  const x = Math.hypot(e[0], e[1], e[2]);
  const y = Math.hypot(e[4], e[5], e[6]);
  const z = Math.hypot(e[8], e[9], e[10]);
  return Math.max(x, y, z);
}

/** Reused across the pass: one Box3 for the whole catalog, not one per row. */
const scratchBox = new THREE.Box3();

/**
 * Add world AABBs and world-space errors to every catalog row.
 *
 * The callers keep their own tails — fabriks collects `roots` for an octree
 * descent, konnektion buckets `byLevel` because it draws one level whole — but
 * the pass itself is one decision, and it is the one worth stating once:
 * `Box3.applyMatrix4` transforms all EIGHT corners and re-bounds them, which is
 * what a rotated or sheared placement needs. Transforming just min and max
 * would silently under-cover the cell, and the symptom is geometry culled at an
 * angle rather than an error.
 */
export const toWorldCells = <R extends LodCellRow>(
  rows: readonly R[],
  voxelToWorld: THREE.Matrix4,
): (R & LodWorldCell)[] => {
  const errorScale = maxAxisScale(voxelToWorld);
  return rows.map((row) => {
    scratchBox.min.set(row.bboxMin[0], row.bboxMin[1], row.bboxMin[2]);
    scratchBox.max.set(row.bboxMax[0], row.bboxMax[1], row.bboxMax[2]);
    scratchBox.applyMatrix4(voxelToWorld);
    return {
      ...row,
      key: octreeCellKey(row.level, row.cell),
      worldMin: [scratchBox.min.x, scratchBox.min.y, scratchBox.min.z] as [number, number, number],
      worldMax: [scratchBox.max.x, scratchBox.max.y, scratchBox.max.z] as [number, number, number],
      worldLodError: row.lodError * errorScale,
    };
  });
};
