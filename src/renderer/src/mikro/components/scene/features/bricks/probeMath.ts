import * as THREE from "three";
import { cropBoxToVoxelAabb, type CropBox } from "../../platform/coords/cropBox";

/**
 * The ray/volume intersection the probe paths share.
 *
 * Both 3D probes (`BrickVolumeLayer`, `BrickLabelVolumeLayer`) transform a
 * pointer ray into the layer's local frame and clip it against the unit box
 * before marching resident bricks; this is that clip, and it is deliberately
 * the ONLY thing left in this file.
 *
 * It used to also carry `marchVolumeTexture` (a CPU mirror of the pre-WebGPU
 * GLSL volume shader) plus `prioritizeChunkLoaders`/`runChunkLoaderQueue`,
 * which served the old single-texture volume path. That path was deleted at
 * the octree cutover and its own header had said so ever since -- "LEGACY /
 * DEAD CODE ... kept only until the old volume-probe UI is removed". It was,
 * and they were unreferenced; removing them also retired the dim-remap
 * helpers, whose sole consumer they were.
 */

/** A sub-box of the unit box, in the same local frame. */
export type LocalClip = { min: THREE.Vector3; max: THREE.Vector3 };

const scratchInverse = new THREE.Matrix4();

/**
 * The layer's share of the crop box in the probe's unit-box frame — the CPU
 * twin of the raymarcher's `uClipMin`/`uClipMax` (P12): the same
 * `cropBoxToVoxelAabb`, re-expressed in `[-0.5, 0.5]`. `"outside"` when the
 * layer has nothing inside the box, null when there is no crop.
 */
export function localCropClip(
  cropBox: CropBox | null,
  voxelToWorld: THREE.Matrix4,
  baseShape: readonly [number, number, number],
): LocalClip | "outside" | null {
  if (!cropBox) return null;
  const voxel = cropBoxToVoxelAabb(
    cropBox,
    scratchInverse.copy(voxelToWorld).invert(),
    baseShape,
  );
  if (!voxel) return "outside";
  const local = (value: number, axis: 0 | 1 | 2) =>
    baseShape[axis] > 0 ? value / baseShape[axis] - 0.5 : value - 0.5;
  return {
    min: new THREE.Vector3(local(voxel.min[0], 0), local(voxel.min[1], 1), local(voxel.min[2], 2)),
    max: new THREE.Vector3(local(voxel.max[0], 0), local(voxel.max[1], 1), local(voxel.max[2], 2)),
  };
}

export function intersectLocalVolumeBox(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  /** The crop (`localCropClip`): the ray is clipped to it instead of the whole box. */
  clip: LocalClip | null = null,
): { start: number; end: number } | null {
  const min = clip ? clip.min : new THREE.Vector3(-0.5, -0.5, -0.5);
  const max = clip ? clip.max : new THREE.Vector3(0.5, 0.5, 0.5);
  let start = -Infinity;
  let end = Infinity;

  for (const axis of ["x", "y", "z"] as const) {
    const axisDirection = direction[axis];
    const axisOrigin = origin[axis];

    if (Math.abs(axisDirection) < Number.EPSILON) {
      if (axisOrigin < min[axis] || axisOrigin > max[axis]) return null;
      continue;
    }

    const invDirection = 1 / axisDirection;
    const t1 = (min[axis] - axisOrigin) * invDirection;
    const t2 = (max[axis] - axisOrigin) * invDirection;
    start = Math.max(start, Math.min(t1, t2));
    end = Math.min(end, Math.max(t1, t2));
  }

  if (start > end) return null;
  return { start: Math.max(start, 0), end };
}
