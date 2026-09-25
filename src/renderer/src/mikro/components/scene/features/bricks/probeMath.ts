import * as THREE from "three";

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

export function intersectLocalVolumeBox(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
): { start: number; end: number } | null {
  const min = new THREE.Vector3(-0.5, -0.5, -0.5);
  const max = new THREE.Vector3(0.5, 0.5, 0.5);
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
