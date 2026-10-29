import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

import { useSettings } from "@/core/settings/store/SettingsContext";
import { ZOOM_STEP, worldUnitsPerPixelAt } from "@/core/data/scene/camera/sceneNavigation";
import { asNavControls, zoomCameraBy } from "@/core/data/scene/camera/keyboardNavigation";
import { createScrollClassifier } from "../input/scrollGesture";
import { useModeStoreApi } from "../stores/modeStore";
import { cameraInteraction } from "./cameraMotion";

/**
 * The trackpad half of the movement grammar (`platform/input/navigationBindings`):
 *
 * - two-finger SWIPE pans in 2D and orbits in 3D;
 * - PINCH (Ctrl + wheel) zooms, in proportion to the pinch;
 * - a mouse wheel keeps zooming the controls' own way;
 * - Shift + wheel is the z slider's (`KeyboardModeController`), untouched.
 *
 * Which of swipe / wheel an event is comes from the `sceneScrollGesture`
 * setting, or a per-gesture guess (`scrollGesture.ts`). OrbitControls knows
 * only "wheel = dolly, one fixed step per event", which turns a swipe into a
 * zoom and a pinch's stream of tiny events into a lurch — so the events this
 * claims are stopped in the CAPTURE phase, before the controls' listener on
 * the canvas sees them.
 */

/** How strongly a pinch's deltaY scales the view. */
const PINCH_ZOOM_PER_DELTA = 0.01;

const scratchRight = new THREE.Vector3();
const scratchUp = new THREE.Vector3();

export const ScrollGestureNavigation = () => {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const modeApi = useModeStoreApi();
  const { settings } = useSettings();
  const setting = settings.sceneScrollGesture;
  const classify = useMemo(() => createScrollClassifier(), []);

  useEffect(() => {
    const ctrl = asNavControls(controls);
    if (!ctrl) return;
    const element = gl.domElement;
    const orbit = controls as {
      getPolarAngle?: () => number;
      setPolarAngle?: (value: number) => void;
    };

    const onWheel = (event: WheelEvent) => {
      if (event.target !== element) return;
      if (event.shiftKey) return; // z, or the controls' own zoom in 3D
      const intent = classify(event, setting);
      if (intent === "zoom") return; // the controls' wheel, as always

      event.preventDefault();
      event.stopPropagation();
      const height = element.clientHeight || 1;

      if (intent === "pinch") {
        const factor = Math.min(
          ZOOM_STEP,
          Math.max(1 / ZOOM_STEP, Math.exp(-event.deltaY * PINCH_ZOOM_PER_DELTA)),
        );
        zoomCameraBy(camera, ctrl, factor);
      } else if (modeApi.getState().displayMode === "3D") {
        // Orbit like a drag of the same length: a full viewport height of
        // swipe is one turn, as OrbitControls' own rotate speed has it.
        const turn = (2 * Math.PI) / height;
        if (ctrl.getAzimuthalAngle && ctrl.setAzimuthalAngle) {
          ctrl.setAzimuthalAngle(ctrl.getAzimuthalAngle() + event.deltaX * turn);
        }
        if (orbit.getPolarAngle && orbit.setPolarAngle) {
          orbit.setPolarAngle(orbit.getPolarAngle() + event.deltaY * turn);
        }
      } else {
        // Pan like a scroll: scrolling down moves the view down the image.
        const perPixel = worldUnitsPerPixelAt(
          camera as { isOrthographicCamera?: boolean; zoom?: number; fov?: number },
          camera.position.distanceTo(ctrl.target),
          height,
        );
        scratchRight.setFromMatrixColumn(camera.matrix, 0).multiplyScalar(event.deltaX * perPixel);
        scratchUp.setFromMatrixColumn(camera.matrix, 1).multiplyScalar(-event.deltaY * perPixel);
        scratchRight.add(scratchUp);
        camera.position.add(scratchRight);
        ctrl.target.add(scratchRight);
        ctrl.update();
      }

      // The controls never saw this event, so say what their listeners would
      // have: a wheel tick for the motion gate, and a start/end pair so the
      // initial fit knows the user has taken the camera (see
      // `KeyboardSceneNavigation.claimCamera`).
      cameraInteraction.wheel(performance.now());
      ctrl.dispatchEvent?.({ type: "start" });
      ctrl.dispatchEvent?.({ type: "end" });
      invalidate();
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  }, [camera, controls, gl, invalidate, modeApi, classify, setting]);

  return null;
};
