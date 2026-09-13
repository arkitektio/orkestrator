import * as THREE from "three";
import { resolveAxisIndices } from "../model/dims";
import type { LayerState } from "../model/layerModel";
import { isPlaceable } from "../model/placeable";
import { buildAffineMatrix } from "../coords/worldTransform";

/**
 * Metadata-only scene fitting: compute the union world-space bounding box of a
 * set of layers and the camera pose that frames it. Deliberately free of any
 * mounted three.js objects so the INITIAL camera pose can be derived before the
 * first render (`platform/camera/InitialCameraFit.tsx`) — `fitCameraToObject`
 * (`platform/camera/cameraFit.ts`) shares the same pose math for post-mount fits.
 */

/** Padding factors matching the historical `fitCameraToObject` behavior. */
const ORTHO_PADDING = 1.1;
const PERSPECTIVE_PADDING = 1.3;

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

export type FitPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  /** Set for orthographic fits only. */
  zoom?: number;
};

export type FitPoseOptions =
  | {
      kind: "perspective";
      /** Vertical field of view in DEGREES (three.js convention). */
      fov: number;
      /** Direction from the box center toward the camera (normalized inside). */
      viewDirection: THREE.Vector3;
    }
  | {
      kind: "orthographic";
      viewport: { width: number; height: number };
      /** z to keep the ortho camera at (2D rig parks it far above the plane). */
      cameraZ: number;
    };

/**
 * Camera pose framing `box` — pure math shared by the pre-render initial fit
 * and `fitCameraToObject`. Perspective: back off along `viewDirection` until
 * the box's bounding sphere fits the vertical fov (× padding). Orthographic:
 * center x/y and zoom to the limiting axis (× padding).
 */
export function computeFitPose(box: THREE.Box3, opts: FitPoseOptions): FitPose {
  const center = box.getCenter(new THREE.Vector3());

  if (opts.kind === "orthographic") {
    const size = box.getSize(new THREE.Vector3());
    const zoomX = opts.viewport.width / (Math.max(size.x, 1e-6) * ORTHO_PADDING);
    const zoomY = opts.viewport.height / (Math.max(size.y, 1e-6) * ORTHO_PADDING);
    return {
      position: new THREE.Vector3(center.x, center.y, opts.cameraZ),
      target: new THREE.Vector3(center.x, center.y, 0),
      zoom: Math.min(zoomX, zoomY),
    };
  }

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const halfFovRad = THREE.MathUtils.degToRad(opts.fov / 2);
  const distance =
    (Math.max(sphere.radius, 1e-6) / Math.sin(halfFovRad)) * PERSPECTIVE_PADDING;
  const direction = opts.viewDirection.clone().normalize();
  return {
    position: center.clone().add(direction.multiplyScalar(distance)),
    target: center,
  };
}
