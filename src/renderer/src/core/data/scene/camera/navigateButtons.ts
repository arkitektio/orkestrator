import * as THREE from "three";

/**
 * The 3D navigate button map every orbiting viewer shares (mikro's scene,
 * elektro's morphology): left-drag pans, middle pans too, right orbits; the
 * wheel zooms. Middle pans (rather than dollying) so it means the same in
 * every view and mode — mikro's grammar is `platform/input/navigationBindings`.
 *
 * A module-level constant on purpose: R3F diffs object props by reference, so
 * an inline literal would re-apply on every commit. Omitting LEFT is how a tool
 * mode frees the left button — see mikro's `CameraController` for those maps.
 */
export const NAVIGATE_BUTTONS_3D = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.ROTATE,
} as const;
