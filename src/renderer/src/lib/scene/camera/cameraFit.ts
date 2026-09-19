import * as THREE from "three";
import { computeFitPose } from "./sceneFit";

/**
 * The camera/controls surface `fitCameraToObject` needs. Structurally matches
 * `viewerStore`'s `CanvasContext`. Extracted here so the THREE camera-fitting
 * math lives outside the store (the store action just looks up the target and
 * delegates).
 */
export type FitCanvasContext = {
  camera: THREE.Camera;
  controls: { target: THREE.Vector3; update: () => void } | null;
  size: { width: number; height: number };
  invalidate: () => void;
};

/**
 * Grow any axis thinner than `2 * minHalfExtent` around its own centre.
 *
 * A go-to target is routinely flat or degenerate — a POINT annotation, a mesh
 * object one voxel deep — and fitting such a box literally yields an absurd
 * ortho zoom. Padding it to a fixed on-screen size (callers pass
 * `worldUnitsPerPixel * 40`, i.e. ~80 px) frames it the way a user means.
 * Mutates and returns `box`.
 */
export function padDegenerateAxes(box: THREE.Box3, minHalfExtent: number): THREE.Box3 {
  for (const axis of ["x", "y", "z"] as const) {
    const size = box.max[axis] - box.min[axis];
    if (size < 2 * minHalfExtent) {
      const center = (box.max[axis] + box.min[axis]) / 2;
      box.min[axis] = center - minHalfExtent;
      box.max[axis] = center + minHalfExtent;
    }
  }
  return box;
}

/**
 * Apply a `computeFitPose` result to a live camera + controls. Shared by the
 * post-mount object fit below and the pre-first-render initial fit
 * (`platform/camera/InitialCameraFit.tsx`).
 */
export function applyFitToCamera(box: THREE.Box3, canvas: FitCanvasContext): void {
  const { camera, controls, size, invalidate } = canvas;

  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const ortho = camera as THREE.OrthographicCamera;
    const pose = computeFitPose(box, {
      kind: "orthographic",
      viewport: size,
      cameraZ: ortho.position.z,
    });
    ortho.position.copy(pose.position);
    ortho.zoom = pose.zoom!;
    ortho.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(pose.target);
      controls.update();
    }
  } else {
    const persp = camera as THREE.PerspectiveCamera;
    const center = box.getCenter(new THREE.Vector3());
    const pose = computeFitPose(box, {
      kind: "perspective",
      fov: persp.fov,
      // Preserve the current viewing angle; only the distance changes.
      viewDirection: camera.position.clone().sub(center),
    });
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    if (controls) {
      controls.target.copy(pose.target);
      controls.update();
    }
  }
  invalidate();
}

/** Frame `target`'s world-space bounding box in the canvas camera (ortho or perspective). */
export function fitCameraToObject(target: THREE.Object3D, canvas: FitCanvasContext): void {
  const box = new THREE.Box3().setFromObject(target);
  if (box.isEmpty()) throw new Error("Bounding box for fit target is empty");
  applyFitToCamera(box, canvas);
}
