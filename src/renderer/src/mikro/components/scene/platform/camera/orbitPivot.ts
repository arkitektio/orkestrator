import * as THREE from "three";
import type { ProbeOrigin } from "../probe/probeTypes";

/**
 * Orbit-pivot math for the "rotate around the probed point" setting.
 *
 * Kept out of `platform/camera/CameraController.tsx` so the geometry and the
 * when-do-we-move rule are testable without a Canvas — the React side is then a
 * thin wrapper that reads stores and calls these two functions.
 */

/**
 * The camera surface a re-pivot needs. Structurally a subset of
 * `platform/camera/cameraState.ts`'s `CameraFrame`, so a real frame can be passed straight
 * in. `controls` is nullable because `ArcballControls`-style controllers have no
 * `.target` (`platform/camera/CanvasSync.tsx` narrows them to null the same way).
 */
export type PivotFrame = {
  camera: { position: THREE.Vector3 };
  controls: { target: THREE.Vector3; update: () => void } | null;
};

/**
 * Preserve-offset re-pivot: move the orbit target onto `world` and shift the
 * camera by the same delta, so the *view* does not change — only the rotation
 * center does.
 *
 * Returns whether anything actually moved, so the caller only pays an
 * `invalidate()` when it must (the scene Canvas is `frameloop="demand"`). The
 * epsilon no-op is load-bearing rather than a micro-optimization: an async
 * exact-value merge mints a fresh `ProbeResult` for the *same* voxel, which
 * re-runs the effect — without this it would re-target and re-render for free.
 */
export function repivotPreservingView(
  frame: PivotFrame,
  world: THREE.Vector3,
  epsilon = 1e-6,
): boolean {
  const { controls, camera } = frame;
  if (!controls) return false;
  if (controls.target.distanceToSquared(world) <= epsilon * epsilon) return false;

  const offset = camera.position.clone().sub(controls.target);
  controls.target.copy(world);
  camera.position.copy(world).add(offset);
  controls.update();
  return true;
}

/**
 * When the pivot is allowed to follow the probe.
 *
 * Hover probes never move the camera — a follow-cursor sweep would otherwise
 * re-pivot on every voxel the cursor crosses. Flipping the setting on, however,
 * pivots to whatever probe is current (hover-origin included), so the switch
 * has an immediate effect. Animation playback owns the camera outright while a
 * tour runs (`features/animation/AnimationPlayer.tsx` writes position + target every
 * frame), so we stay out of its way.
 */
export function shouldRepivot(args: {
  pivotOnProbe: boolean;
  probe: { origin: ProbeOrigin } | null;
  isAnimationPlaying: boolean;
  /** True on the first evaluation after `pivotOnProbe` went false → true. */
  justEnabled: boolean;
}): boolean {
  if (!args.pivotOnProbe || !args.probe || args.isAnimationPlaying) return false;
  return args.justEnabled || args.probe.origin === "click";
}
