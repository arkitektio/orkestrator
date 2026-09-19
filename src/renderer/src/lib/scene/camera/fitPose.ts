import * as THREE from "three";

/**
 * Camera pose framing a world box — the pure math every viewer's fit shares
 * (mikro's scene, elektro's morphology). Free of any mounted three.js objects,
 * so an initial pose can be derived before the first render.
 */

/** Padding factors matching the historical `fitCameraToObject` behavior. */
const ORTHO_PADDING = 1.1;
const PERSPECTIVE_PADDING = 1.3;

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

/**
 * Perspective pose framing a SPHERE around a chosen pivot — for viewers that
 * orbit something other than the box centre (the morphology orbits its root
 * sections). Fits against the narrower of the vertical and horizontal fov, so
 * it never clips whatever the aspect, and reports near/far planes scaled to
 * the distance.
 */
export function computeSphereFitPose(
  center: THREE.Vector3,
  radius: number,
  opts: {
    /** Vertical field of view in DEGREES. */
    fov: number;
    aspect: number;
    /** Direction from the centre toward the camera (normalized inside). */
    viewDirection: THREE.Vector3;
    padding?: number;
  },
): FitPose & { near: number; far: number } {
  const vFov = THREE.MathUtils.degToRad(opts.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (opts.aspect || 1));
  const distance =
    (Math.max(radius, 1e-6) * (opts.padding ?? 1.4)) / Math.sin(Math.min(vFov, hFov) / 2);
  const direction = opts.viewDirection.clone();
  if (direction.lengthSq() < 1e-12) direction.set(1, 1, 1);
  direction.normalize();
  return {
    position: center.clone().addScaledVector(direction, distance),
    target: center.clone(),
    near: Math.max(distance / 100, 0.01),
    far: distance * 100,
  };
}
