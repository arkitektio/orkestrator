import * as THREE from "three";
import type { LayerState } from "../model/layerModel";

/**
 * Convert a raw affine matrix (number[][]) to a THREE.Matrix4.
 *
 * The server always delivers the affine in **(x, y, z)** dim order:
 *   - 3×3  →  2-D affine  (x, y, translate)  – z is identity pass-through
 *   - 4×4  →  3-D affine  (x, y, z, translate)
 *   - 2×2  →  2-D linear  (no translation) – z is identity pass-through
 *   - null / empty → identity
 */
export function affineToMatrix4(raw: number[][] | null | undefined): THREE.Matrix4 {
  const mat = new THREE.Matrix4().identity();
  if (!raw || raw.length === 0) return mat;

  if (raw.length === 2 && raw[0].length === 2) {
    // 2×2 linear (no translation) – scale / rotation only in x-y
    mat.set(
      raw[0][0], raw[0][1], 0, 0,
      raw[1][0], raw[1][1], 0, 0,
      0,         0,         1, 0,
      0,         0,         0, 1,
    );
  } else if (raw.length === 3 && raw[0].length === 3) {
    // 3×3 2-D affine: rows = [x-out, y-out, homogeneous]
    //   [a00 a01 tx]       x' = a00·x + a01·y + tx
    //   [a10 a11 ty]  →    y' = a10·x + a11·y + ty
    //   [ 0   0   1]       z' = z  (pass-through)
    mat.set(
      raw[0][0], raw[0][1], 0, raw[0][2],
      raw[1][0], raw[1][1], 0, raw[1][2],
      0,         0,         1, 0,
      raw[2][0], raw[2][1], 0, raw[2][2],
    );
  } else if (raw.length === 4 && raw[0].length === 4) {
    // 4×4 3-D affine: direct mapping (x, y, z, homogeneous rows)
    mat.set(
      raw[0][0], raw[0][1], raw[0][2], raw[0][3],
      raw[1][0], raw[1][1], raw[1][2], raw[1][3],
      raw[2][0], raw[2][1], raw[2][2], raw[2][3],
      raw[3][0], raw[3][1], raw[3][2], raw[3][3],
    );
  }
  return mat;
}

/** Build a THREE.Matrix4 from the layer's composed affine (x,y,z convention) */
export function buildAffineMatrix(layer: LayerState): THREE.Matrix4 {
  return affineToMatrix4(layer.affineMatrix);
}

/**
 * World length of one voxel along each axis: the norms of the affine's
 * column basis vectors (column-major elements). THE anisotropy input of the
 * world-metric LOD contract (`orkestrator.worldLod`): distances/footprints
 * measured in raw voxel space are wrong by the affine's condition number,
 * direction-dependently — a 0.5/0.5/5 µm SPIM affine made the refinement
 * boundary a world ellipsoid 10:1 elongated along z regardless of view.
 * Identity affine → [1,1,1] → every consumer reduces to the legacy voxel
 * metric exactly. The enhancers re-export it as `voxelWorldSize`
 * (`features/annotations/enhancers/shared/planning.ts`) — an alias, not the
 * second copy it used to be.
 */
export function voxelWorldSizeOf(affine: THREE.Matrix4): [number, number, number] {
  const e = affine.elements; // column-major
  return [
    Math.hypot(e[0], e[1], e[2]) || 1,
    Math.hypot(e[4], e[5], e[6]) || 1,
    Math.hypot(e[8], e[9], e[10]) || 1,
  ];
}

/** Get the number of Z voxels for a layer, or null if the layer has no Z dimension */
export function getLayerZSize(layer: LayerState): number | null {
  if (!layer.zAxis) return null;
  const idx = layer.lens.axisNames.indexOf(layer.zAxis);
  if (idx === -1) return null;
  return layer.lens.shape[idx] ?? null;
}

/** Convert a voxel Z coordinate to physical Z using the affine matrix */
export function voxelToPhysicalZ(
  affine: THREE.Matrix4,
  voxelZ: number,
): number {
  const pt = new THREE.Vector3(0, 0, voxelZ);
  pt.applyMatrix4(affine);
  return pt.z;
}

/**
 * Whether a layer's physical Z span excludes the current viewing plane, i.e. the
 * layer has no data at `currentZ`. Layers without a Z dimension (or a single Z
 * slice) are never out-of-plane. Uses a half-voxel tolerance so the boundary
 * slices still count as in-plane. Mirrors how `ZSliderPanel` derives per-layer
 * physical Z ranges.
 */
export function isLayerOutOfPlane(
  layer: LayerState,
  currentZ: number,
): boolean {
  const zSize = getLayerZSize(layer);
  if (zSize == null || zSize <= 1) return false;
  const affine = buildAffineMatrix(layer);
  const z0 = voxelToPhysicalZ(affine, 0);
  const zEnd = voxelToPhysicalZ(affine, zSize - 1);
  const min = Math.min(z0, zEnd);
  const max = Math.max(z0, zEnd);
  const tol = Math.abs(zEnd - z0) / Math.max(1, zSize - 1) / 2;
  return currentZ < min - tol || currentZ > max + tol;
}

/** The flat view's z axis: world µm extent plus the size of one z step. */
export type SceneZExtent = {
  min: number;
  max: number;
  /** Physical thickness of one slice — the ZSlider's step, i.e. one slab. */
  step: number;
};

/**
 * The physical z axis the flat view scrubs, pooled across every layer that has
 * a z dimension. Null when no layer does: such a scene has one plane, so there
 * is no slice to be on the wrong side of.
 *
 * `step` is the ZSlider's step by construction — the pooled range divided by
 * the finest layer's slice count — so it is also the natural slab thickness for
 * "is this z on the plane the viewer is looking at". Hidden layers count, for
 * the same reason they count towards the slider's range: hiding a layer must
 * not move the plane the scrubber is sitting on.
 */
export function sceneZExtent(layers: readonly LayerState[]): SceneZExtent | null {
  let min = Infinity;
  let max = -Infinity;
  let maxVoxelSpan = 0;

  for (const layer of layers) {
    const zSize = getLayerZSize(layer);
    if (zSize === null || zSize <= 1) continue;
    const affine = buildAffineMatrix(layer);
    const z0 = voxelToPhysicalZ(affine, 0);
    const zEnd = voxelToPhysicalZ(affine, zSize - 1);
    min = Math.min(min, z0, zEnd);
    max = Math.max(max, z0, zEnd);
    maxVoxelSpan = Math.max(maxVoxelSpan, zSize - 1);
  }

  if (maxVoxelSpan === 0) return null;

  const range = max - min;
  return { min, max, step: range > 0 ? range / maxVoxelSpan : 1 };
}

/**
 * The finest per-LAYER z step among layers with a real stack — the honest
 * slab thickness for "is this z on the drawn plane". `sceneZExtent.step` is a
 * SCENE-WIDE average (pooled range / finest count), which a sparse two-slice
 * layer inflates for everyone: with 0.1 µm slices next to a 1000 µm two-slice
 * stack the average grants ±5 µm of slack and fifty slices' worth of
 * annotations "on" every plane. Null when no layer has a stack.
 */
export function finestLayerZStep(layers: readonly LayerState[]): number | null {
  let finest = Infinity;
  for (const layer of layers) {
    const zSize = getLayerZSize(layer);
    if (zSize === null || zSize <= 1) continue;
    const affine = buildAffineMatrix(layer);
    const span = Math.abs(voxelToPhysicalZ(affine, zSize - 1) - voxelToPhysicalZ(affine, 0));
    if (span <= 0) continue;
    finest = Math.min(finest, span / (zSize - 1));
  }
  return Number.isFinite(finest) ? finest : null;
}

/** Convert a physical Z coordinate to the closest voxel Z index, clamped to [0, maxZ] */
export function physicalToVoxelZ(
  affine: THREE.Matrix4,
  physicalZ: number,
  maxVoxelZ: number,
): number {
  const inv = affine.clone().invert();
  const pt = new THREE.Vector3(0, 0, physicalZ);
  pt.applyMatrix4(inv);
  return Math.max(0, Math.min(maxVoxelZ, Math.round(pt.z)));
}

/**
 * Like `physicalToVoxelZ`, but honest about range: null when the plane lies
 * OUTSIDE the layer's stack (beyond half a voxel past either end) instead of
 * clamping to the nearest slice. The clamp is right for a slider snapping to
 * a slice; it is wrong for a visibility test, where it makes a plane far past
 * a stack report the stack's end slice as "showing".
 */
export function physicalToVoxelZStrict(
  affine: THREE.Matrix4,
  physicalZ: number,
  maxVoxelZ: number,
): number | null {
  const inv = affine.clone().invert();
  const pt = new THREE.Vector3(0, 0, physicalZ).applyMatrix4(inv);
  if (pt.z < -0.5 || pt.z > maxVoxelZ + 0.5) return null;
  return Math.max(0, Math.min(maxVoxelZ, Math.round(pt.z)));
}
