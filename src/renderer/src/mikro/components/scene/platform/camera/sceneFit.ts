import * as THREE from "three";
import { resolveAxisIndices } from "../model/dims";
import type { LayerState } from "../model/layerModel";
import { isPlaceable } from "../model/placeable";
import { buildAffineMatrix } from "../coords/worldTransform";

/**
 * Metadata-only scene fitting: compute the union world-space bounding box of a
 * set of layers. Deliberately free of any mounted three.js objects so the
 * INITIAL camera pose can be derived before the first render
 * (`platform/camera/InitialCameraFit.tsx`). The pose that frames the box is
 * `computeFitPose` (`@/lib/scene/camera/fitPose`), shared with
 * `fitCameraToObject` (`@/lib/scene/camera/cameraFit`) for post-mount fits.
 */

/**
 * Union world-space box of the layers, from metadata alone. Each layer's box
 * is the 8 corners of its base-voxel extent `[0..xMax]×[0..yMax]×[0..zMax]`
 * pushed through the plain layer affine — corner-anchored, exactly the frame
 * the meshes render in (COORDINATE_SYSTEMS.md "Coordinate conventions").
 * Corners are transformed individually because the affine may rotate or
 * shear. Returns null when no layer contributes a valid spatial extent.
 */
export function computeSceneWorldBox(layers: readonly LayerState[]): THREE.Box3 | null {
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  let contributed = false;

  for (const layer of layers) {
    // No server placement → not drawn, and its (prefix-only) affine is not a
    // world position; framing it would fit the camera to nothing.
    if (!isPlaceable(layer)) continue;
    const { xPos, yPos, zPos } = resolveAxisIndices(layer.lens.axisNames, layer);
    // x/y are required; z is optional (2D layers have no z dim → flat box).
    if (xPos === -1 || yPos === -1) continue;
    const xMax = layer.lens.shape[xPos] ?? 0;
    const yMax = layer.lens.shape[yPos] ?? 0;
    const zMax = zPos !== -1 ? layer.lens.shape[zPos] ?? 0 : 0;
    if (xMax <= 0 || yMax <= 0) continue;

    const voxelToWorld = buildAffineMatrix(layer);
    for (const cx of [0, xMax]) {
      for (const cy of [0, yMax]) {
        for (const cz of [0, zMax]) {
          corner.set(cx, cy, cz).applyMatrix4(voxelToWorld);
          box.expandByPoint(corner);
        }
      }
    }
    contributed = true;
  }

  return contributed ? box : null;
}
