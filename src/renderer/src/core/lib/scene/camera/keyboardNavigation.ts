import * as THREE from "three";
import { ORBIT_STEP_RAD, ZOOM_STEP, panDistance } from "./sceneNavigation";

/**
 * Applying the keyboard navigation map (`sceneNavigation.ts`) to a live
 * OrbitControls rig — pan along the screen basis, dolly/zoom, turn about the
 * target. Shared by mikro's scene and elektro's morphology viewer; each owns
 * its key listener and its own `frame`/`z` actions.
 */

/**
 * The camera surface this needs. OrbitControls is all of it and more; narrowing
 * structurally is what every other camera-toucher in the tree does, and it keeps
 * this honest about the four things it actually touches.
 */
export type NavControls = {
  target: THREE.Vector3;
  update: () => void;
  minZoom?: number;
  maxZoom?: number;
  getAzimuthalAngle?: () => number;
  setAzimuthalAngle?: (value: number) => void;
  dispatchEvent?: (event: { type: string }) => void;
};

const scratchRight = new THREE.Vector3();
const scratchUp = new THREE.Vector3();
const scratchDelta = new THREE.Vector3();

/** Narrow R3F's `controls` to the rig surface, or null when none is installed. */
export const asNavControls = (controls: unknown): NavControls | null =>
  controls && typeof controls === "object" && "target" in controls
    ? (controls as NavControls)
    : null;

/** Pan by whole steps along the camera's screen basis (+x right, +y up). */
export const panCamera = (
  camera: THREE.Camera,
  ctrl: NavControls,
  viewportHeight: number,
  dx: number,
  dy: number,
) => {
  const distance = panDistance(
    camera as { isOrthographicCamera?: boolean; zoom?: number; fov?: number },
    camera.position.distanceTo(ctrl.target),
    viewportHeight,
  );

  // The camera's own screen basis, so "right" means right on screen in
  // either display mode and at any orientation.
  scratchRight.setFromMatrixColumn(camera.matrix, 0);
  scratchUp.setFromMatrixColumn(camera.matrix, 1);
  scratchDelta
    .copy(scratchRight)
    .multiplyScalar(dx * distance)
    .addScaledVector(scratchUp, dy * distance);

  // Both ends move together, so the target-relative offset `update()`
  // rebuilds the position from is unchanged and the pan survives it.
  camera.position.add(scratchDelta);
  ctrl.target.add(scratchDelta);
  ctrl.update();
};

/** +1 magnifies, -1 pulls back. */
export const zoomCamera = (camera: THREE.Camera, ctrl: NavControls, direction: 1 | -1) => {
  const factor = direction === 1 ? ZOOM_STEP : 1 / ZOOM_STEP;
  const ortho = camera as THREE.OrthographicCamera;

  if (ortho.isOrthographicCamera) {
    // Safe against `update()`: it only rewrites `zoom` when its internal
    // dolly scale is not 1, which a direct write never sets. It does not
    // clamp in that case either, hence the explicit bounds.
    ortho.zoom = Math.min(
      ctrl.maxZoom ?? Infinity,
      Math.max(ctrl.minZoom ?? 0, ortho.zoom * factor),
    );
    ortho.updateProjectionMatrix();
  } else {
    // Dolly along the view ray. `update()` clamps the resulting radius to
    // the controls' min/max distance for us.
    scratchDelta.copy(camera.position).sub(ctrl.target).multiplyScalar(1 / factor);
    camera.position.copy(ctrl.target).add(scratchDelta);
  }
  ctrl.update();
};

/** Swing around the target. +1 turns the camera right, matching a drag right. */
export const orbitCamera = (ctrl: NavControls, direction: 1 | -1) => {
  const { getAzimuthalAngle, setAzimuthalAngle } = ctrl;
  if (!getAzimuthalAngle || !setAzimuthalAngle) return;
  // Subtracted, so → turns the camera to the right: OrbitControls decreases
  // theta for a rightward drag, and the key should feel like the gesture.
  // The setter calls `update()` itself.
  setAzimuthalAngle(getAzimuthalAngle() - direction * ORBIT_STEP_RAD);
};
