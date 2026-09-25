import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { navigationActionForKey, stepSceneZ } from "@/lib/scene/camera/sceneNavigation";
import {
  asNavControls,
  orbitCamera,
  panCamera,
  zoomCamera,
} from "@/lib/scene/camera/keyboardNavigation";
import { applyFitToCamera } from "@/lib/scene/camera/cameraFit";
import { computeSceneWorldBox } from "../../platform/camera/sceneFit";
import { sceneZExtent } from "../../platform/coords/worldTransform";
import { useModeStoreApi } from "../../platform/stores/modeStore";
import { useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { isSceneNavigationTarget } from "../../platform/input/keyboardTarget";

/**
 * Arrow keys drive the scene: bare arrows pan, Shift+←/→ walks the Z stack,
 * Shift+↑/↓ zooms. The map itself lives in `platform/camera/sceneNavigation.ts`; this
 * applies it to the live rig.
 *
 * Mounted INSIDE the Canvas (after `<CameraController/>`, which installs the
 * controls) because it needs the real OrbitControls instance — `RoiDrawer` sets
 * the same precedent of a window listener on an in-canvas component, and the
 * zustand scopes reach in here just as they do for `AnimationPlayer`.
 */
export const KeyboardSceneNavigation = () => {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const viewerApi = useViewerStoreApi();
  const sceneApi = useSceneStoreApi();
  const modeApi = useModeStoreApi();

  useEffect(() => {
    const ctrl = asNavControls(controls);
    if (!ctrl) return;

    /**
     * Tell `InitialCameraFit` the user has taken the wheel. It arms its latch
     * off the controls' "start" event, which only a pointer gesture fires — so
     * without this, the next canvas resize would re-fit and throw away
     * everything that was navigated to by keyboard.
     *
     * Paired with a matching "end": drei forwards both to `onStart`/`onEnd`,
     * which latch `cameraInteraction` — a lone "start" pinned it true for the
     * rest of the session (half-res volume, no settle ladder). The keystroke's
     * own matrix change is what registers it as motion.
     */
    const claimCamera = () => {
      ctrl.dispatchEvent?.({ type: "start" });
      ctrl.dispatchEvent?.({ type: "end" });
    };

    const pan = (dx: number, dy: number) => panCamera(camera, ctrl, size.height, dx, dy);
    const zoom = (direction: 1 | -1) => zoomCamera(camera, ctrl, direction);
    const orbit = (direction: 1 | -1) => orbitCamera(ctrl, direction);

    const stepZ = (direction: 1 | -1) => {
      const extent = sceneZExtent(sceneApi.getState().layers);
      if (!extent) return; // A scene of single planes has nothing to walk.

      const { currentZ, setCurrentZ } = viewerApi.getState();
      const next = stepSceneZ(extent, currentZ, direction);
      if (next !== currentZ) setCurrentZ(next);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl/Alt+arrow are browser and OS navigation. Shift is ours.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!isSceneNavigationTarget(e.target as { tagName?: string } | null)) return;

      // The mode decides what Shift+←/→ means, so it is part of the map rather
      // than a branch out here.
      const action = navigationActionForKey(
        e.code,
        e.shiftKey,
        modeApi.getState().displayMode,
      );
      if (!action) return;

      // Arrows scroll the page by default, and `e.repeat` is deliberately NOT
      // filtered — holding a key should keep moving.
      e.preventDefault();

      // Stepping the stack moves the data, not the camera: no fit latch to
      // claim and no frame to force — the store write re-renders the layers.
      if (action.kind === "z") {
        stepZ(action.direction);
        return;
      }

      // F frames the whole scene. Deliberately NO claimCamera(): the fit IS
      // the reset pose — pristine sessions keep their resize-refit, and an
      // already-armed latch stays armed either way. applyFitToCamera
      // invalidates itself. (While "orbit around probe" is on this moves the
      // target off the probe until the next probe event — acceptable.)
      if (action.kind === "frame") {
        const box = computeSceneWorldBox(sceneApi.getState().layers);
        if (box) {
          applyFitToCamera(box, {
            camera,
            controls: ctrl,
            size: { width: size.width, height: size.height },
            invalidate,
          });
        }
        return;
      }

      if (action.kind === "pan") pan(action.dx, action.dy);
      else if (action.kind === "orbit") orbit(action.direction);
      else zoom(action.direction);

      claimCamera();
      invalidate(); // frameloop="demand": nothing redraws unless asked.
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // Both dimensions: the frame action reads size.width too (ortho fit).
  }, [camera, controls, size.width, size.height, invalidate, viewerApi, sceneApi, modeApi]);

  return null; // Headless: a binding, not a control.
};
