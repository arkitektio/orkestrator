import * as THREE from "three";

/**
 * The crop box: the one region of the scene that is loaded and drawn.
 *
 * WORLD space, axis-aligned. Everything outside it is hidden, and for image
 * and label volumes never requested. Session-only; it is not a lens and the
 * server never hears of it.
 *
 * ## One box, one voxel AABB per layer
 *
 * A layer consumes the box in ITS voxel space, as the AABB of the box's eight
 * corners taken through the inverse affine (`cropBoxToVoxelAabb`). The planner,
 * the raymarcher's entry/exit, the plane discard and the CPU probe all read
 * that same AABB — if any of them used a different box the shader would fall
 * back to bricks the planner never asked for (P18), or the probe would report
 * data nobody can see (P12).
 *
 * For an axis-aligned affine the AABB IS the box. For a rotated one it is
 * larger, so such a layer keeps a little extra at the corners: conservative,
 * never missing data inside the box.
 */
export type CropVec3 = [number, number, number];
export type CropBox = { min: CropVec3; max: CropVec3 };

/** A layer's share of the crop box, in its own voxel space. */
export type CropVoxelBox = { min: CropVec3; max: CropVec3 };

export const sameCropBox = (a: CropBox | null, b: CropBox | null): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  for (let axis = 0; axis < 3; axis++) {
    if (a.min[axis] !== b.min[axis] || a.max[axis] !== b.max[axis]) return false;
  }
  return true;
};

/** The box spanned by two corners, whichever way round they were given. */
export const cropBoxFromCorners = (a: CropVec3, b: CropVec3): CropBox => ({
  min: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])],
  max: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])],
});

const corner = new THREE.Vector3();

/**
 * The crop box in a layer's voxel space, intersected with the layer's own
 * extent `[0, shape]`. Null when the layer lies wholly outside the box.
 *
 * A layer with no stack (`shape[2] <= 1`) is a single plane that the flat view
 * shows on every slice, so the box's z does not crop it.
 */
export const cropBoxToVoxelAabb = (
  box: CropBox,
  worldToVoxel: THREE.Matrix4,
  shape: readonly [number, number, number],
): CropVoxelBox | null => {
  const min: CropVec3 = [Infinity, Infinity, Infinity];
  const max: CropVec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 8; i++) {
    corner
      .set(
        i & 1 ? box.max[0] : box.min[0],
        i & 2 ? box.max[1] : box.min[1],
        i & 4 ? box.max[2] : box.min[2],
      )
      .applyMatrix4(worldToVoxel);
    min[0] = Math.min(min[0], corner.x);
    min[1] = Math.min(min[1], corner.y);
    min[2] = Math.min(min[2], corner.z);
    max[0] = Math.max(max[0], corner.x);
    max[1] = Math.max(max[1], corner.y);
    max[2] = Math.max(max[2], corner.z);
  }
  if (shape[2] <= 1) {
    min[2] = 0;
    max[2] = shape[2];
  }
  for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.max(0, min[axis]);
    max[axis] = Math.min(shape[axis], max[axis]);
    // A flat axis (extent 0) is inside as long as the box reaches it.
    if (shape[axis] > 0 ? min[axis] >= max[axis] : min[axis] > max[axis]) return null;
  }
  return { min, max };
};

/** Is a world point inside the box (faces included)? */
export const cropBoxContains = (box: CropBox, point: readonly [number, number, number]): boolean =>
  point[0] >= box.min[0] &&
  point[0] <= box.max[0] &&
  point[1] >= box.min[1] &&
  point[1] <= box.max[1] &&
  point[2] >= box.min[2] &&
  point[2] <= box.max[2];

/** Do a world AABB and the box share any point? */
export const cropBoxOverlaps = (
  box: CropBox,
  min: readonly [number, number, number],
  max: readonly [number, number, number],
): boolean =>
  min[0] <= box.max[0] &&
  max[0] >= box.min[0] &&
  min[1] <= box.max[1] &&
  max[1] >= box.min[1] &&
  min[2] <= box.max[2] &&
  max[2] >= box.min[2];

/**
 * The six world clip planes of the box, in a FIXED order: `+x, -x, +y, -y,
 * +z, -z` by normal, i.e. "keeps x >= min", "keeps x <= max", and so on.
 *
 * Same contract as `slabClip.ts`: handed to a `ClippingGroup` ONCE and mutated
 * in place. They are never removed — with no crop they sit `CROP_PLANE_FAR`
 * away, where they clip nothing — because changing a group's plane COUNT
 * rebuilds every pipeline under it on WebGPU.
 */
export type CropPlanes = readonly [
  THREE.Plane,
  THREE.Plane,
  THREE.Plane,
  THREE.Plane,
  THREE.Plane,
  THREE.Plane,
];

/** Finite (it reaches a float32 uniform), and far past any scene. */
export const CROP_PLANE_FAR = 1e30;

export const createCropPlanes = (): CropPlanes => [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), CROP_PLANE_FAR),
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), CROP_PLANE_FAR),
  new THREE.Plane(new THREE.Vector3(0, 1, 0), CROP_PLANE_FAR),
  new THREE.Plane(new THREE.Vector3(0, -1, 0), CROP_PLANE_FAR),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), CROP_PLANE_FAR),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), CROP_PLANE_FAR),
];

/** Point the planes at `box`; `null` moves them out of the way. */
export const updateCropPlanes = (planes: CropPlanes, box: CropBox | null): void => {
  for (let axis = 0; axis < 3; axis++) {
    planes[axis * 2].constant = box ? -box.min[axis] : CROP_PLANE_FAR;
    planes[axis * 2 + 1].constant = box ? box.max[axis] : CROP_PLANE_FAR;
  }
};

/** The scene's slice grid along world z: where slices start and how thick one is. */
export type CropZGrid = { min: number; max: number; step: number };

/**
 * The box's z range after `steps` wheel steps: the ONE slice the anchor lies
 * in at zero, one more slice on EACH side per step, held inside the stack.
 *
 * Slice-aligned on purpose. Slice `k` occupies `[min + k·step, min + (k+1)·step)`
 * (corner-anchored, like everything else), so a box centred on a slice's own z
 * would straddle two slices and show half of each in 3D. `currentZ` sits
 * exactly ON a slice start, hence the epsilon before the floor.
 *
 * Without a grid (no layer has a stack) one "slice" is one world unit.
 */
export const cropZRange = (
  anchorZ: number,
  steps: number,
  grid: CropZGrid | null,
): [number, number] => {
  const count = Math.max(0, Math.round(steps));
  if (!grid || !(grid.step > 0)) return [anchorZ - 0.5 - count, anchorZ + 0.5 + count];
  const last = Math.max(0, Math.round((grid.max - grid.min) / grid.step));
  const slice = Math.min(last, Math.max(0, Math.floor((anchorZ - grid.min) / grid.step + 1e-6)));
  const lo = Math.max(0, slice - count);
  const hi = Math.min(last, slice + count);
  return [grid.min + lo * grid.step, grid.min + (hi + 1) * grid.step];
};
