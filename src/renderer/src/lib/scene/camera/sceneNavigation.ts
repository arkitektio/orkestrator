import type { SceneZExtent } from "../coords/worldTransform";

/**
 * Keyboard navigation, as arithmetic. The R3F component
 * (`shell/keyboard/KeyboardSceneNavigation.tsx`) owns the camera and the stores;
 * everything here is a pure function of numbers, which is what makes the
 * binding map and the slice stepping testable without a WebGPU context.
 */

/** One press pans this fraction of the viewport's height. */
export const PAN_VIEWPORT_FRACTION = 0.08;

/** One press multiplies (or divides) the magnification by this. */
export const ZOOM_STEP = 1.15;

/** One press swings this far around the target. 72 presses make a full turn. */
export const ORBIT_STEP_RAD = (5 * Math.PI) / 180;

export type NavigationAction =
  /** Pan by whole steps along the camera's screen basis. +x is right, +y is up. */
  | { kind: "pan"; dx: number; dy: number }
  /** +1 magnifies, -1 pulls back. */
  | { kind: "zoom"; direction: 1 | -1 }
  /** Swing around the target. +1 turns the camera right, matching a drag right. */
  | { kind: "orbit"; direction: 1 | -1 }
  /** +1 walks towards `max`, -1 towards `min`. */
  | { kind: "z"; direction: 1 | -1 }
  /** Re-frame the whole scene (the F key), both display modes. */
  | { kind: "frame" };

/**
 * The whole binding map: arrows pan, Shift+↑/↓ zooms, and Shift+←/→ does
 * whichever of turning and slice-stepping the current view actually supports.
 *
 * That last one is not a compromise. Rotation is disabled outright in the flat
 * view (`enableRotate={false}` on the 2D controls) and `currentZ` is the flat
 * view's slice plane, meaningless in 3D — so one binding would have been dead
 * in one mode either way. Splitting it leaves neither key inert.
 *
 * Keyed on `KeyboardEvent.code`, matching `shell/keyboard/layerVisibilityKeys.ts`:
 * `code` is the physical key, so the map cannot come apart on a keyboard layout
 * that prints something else on the arrow cluster.
 *
 * Returns null for anything unbound, so the caller can bail before touching the
 * camera or the store.
 */
export const navigationActionForKey = (
  code: string,
  shiftKey: boolean,
  displayMode: "2D" | "3D",
): NavigationAction | null => {
  /** Shift+←/→: turn where turning is possible, walk the stack where it is not. */
  const shiftedHorizontal = (direction: 1 | -1): NavigationAction =>
    displayMode === "3D" ? { kind: "orbit", direction } : { kind: "z", direction };

  switch (code) {
    case "ArrowLeft":
      return shiftKey ? shiftedHorizontal(-1) : { kind: "pan", dx: -1, dy: 0 };
    case "ArrowRight":
      return shiftKey ? shiftedHorizontal(1) : { kind: "pan", dx: 1, dy: 0 };
    case "ArrowUp":
      return shiftKey ? { kind: "zoom", direction: 1 } : { kind: "pan", dx: 0, dy: 1 };
    case "ArrowDown":
      return shiftKey ? { kind: "zoom", direction: -1 } : { kind: "pan", dx: 0, dy: -1 };
    case "KeyF":
      // Frame the scene — mode-independent (the fit math handles both rigs).
      // Shift+F stays unbound.
      return shiftKey ? null : { kind: "frame" };
    default:
      return null;
  }
};

/** The camera facts the pan step needs, structurally — no THREE import. */
export type NavigationCamera = {
  isOrthographicCamera?: boolean;
  /** Orthographic magnification. */
  zoom?: number;
  /** Perspective vertical field of view, in degrees. */
  fov?: number;
};

/**
 * World units spanned by one screen pixel — the conversion that makes a pan
 * step feel identical however far in you are.
 *
 * Same formula as `computeWorldUnitsPerPixel` (`platform/probe/probeWorld.ts`), but
 * measured from the distance to the CONTROLS TARGET rather than to the world
 * origin. The origin is only the right pivot for a scene sitting on it, and
 * `PanScaleSync` re-seats the target along the view ray precisely because the
 * target is what the camera is actually working against.
 */
export const worldUnitsPerPixelAt = (
  camera: NavigationCamera,
  distanceToTarget: number,
  viewportHeight: number,
): number => {
  if (camera.isOrthographicCamera) {
    const zoom = camera.zoom ?? 1;
    return zoom > 0 ? 1 / zoom : 1;
  }
  const vFov = ((camera.fov ?? 45) * Math.PI) / 180;
  return (2 * Math.tan(vFov / 2) * distanceToTarget) / Math.max(viewportHeight, 1);
};

/** How far one press moves the camera, in world units. */
export const panDistance = (
  camera: NavigationCamera,
  distanceToTarget: number,
  viewportHeight: number,
): number =>
  worldUnitsPerPixelAt(camera, distanceToTarget, viewportHeight) *
  viewportHeight *
  PAN_VIEWPORT_FRACTION;

/**
 * The next slice along, in world µm.
 *
 * Snaps to the slice grid rather than accumulating `z ± step`: the extent is
 * physical, so repeated addition drifts off the voxel centres and — worse —
 * a scrubber that arrived at a half-slice position by any other route would
 * stay half a slice off forever. Rounding to the nearest index first means a
 * press always lands on a slice, wherever it started.
 *
 * Returns `currentZ` unchanged at either end, so the caller can skip the write.
 */
export const stepSceneZ = (
  extent: SceneZExtent,
  currentZ: number,
  direction: 1 | -1,
): number => {
  const { min, max, step } = extent;
  if (!(step > 0)) return currentZ;

  const lastIndex = Math.max(0, Math.round((max - min) / step));
  const current = Math.round((currentZ - min) / step);
  const next = Math.min(lastIndex, Math.max(0, current + direction));

  return min + next * step;
};
