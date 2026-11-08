import * as THREE from "three";
import { computeFitPose } from "./fitPose";

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
    const pose = computeFitPose(box, {
      kind: "perspective",
      fov: persp.fov,
      // Preserve the current viewing angle; only the distance changes. The
      // angle is the line of sight (camera → orbit target), NOT camera → box:
      // for a box off that line the latter turns the view toward it.
      viewDirection: currentViewOffset(camera, controls),
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

/** Camera minus what it looks at: the orbit target, else one unit ahead. */
function currentViewOffset(
  camera: THREE.Camera,
  controls: FitCanvasContext["controls"],
): THREE.Vector3 {
  if (controls && controls.target.distanceToSquared(camera.position) > 0) {
    return camera.position.clone().sub(controls.target);
  }
  return camera.getWorldDirection(new THREE.Vector3()).negate();
}

/**
 * Bring `point` to the center of the view without turning or zooming: the
 * camera (and the orbit target with it) slides so `point` lands on the line
 * of sight, at the depth the target had. A pan, not a fit — the go-to of the
 * 3D view, where reframing would change the angle the user chose.
 */
export function panCameraTo(point: THREE.Vector3, canvas: FitCanvasContext): void {
  const { camera, controls, invalidate } = canvas;
  const delta = new THREE.Vector3();
  if (controls) {
    delta.copy(point).sub(controls.target);
  } else {
    // No target: move by the part of camera → point across the line of sight.
    const ahead = camera.getWorldDirection(new THREE.Vector3());
    const toPoint = point.clone().sub(camera.position);
    delta.copy(toPoint).addScaledVector(ahead, -toPoint.dot(ahead));
  }
  if (delta.lengthSq() === 0) return;
  camera.position.add(delta);
  if (controls) {
    controls.target.add(delta);
    controls.update();
  } else {
    camera.updateMatrixWorld();
  }
  invalidate();
}

/** Frame `target`'s world-space bounding box in the canvas camera (ortho or perspective). */
export function fitCameraToObject(target: THREE.Object3D, canvas: FitCanvasContext): void {
  const box = new THREE.Box3().setFromObject(target);
  if (box.isEmpty()) throw new Error("Bounding box for fit target is empty");
  applyFitToCamera(box, canvas);
}
