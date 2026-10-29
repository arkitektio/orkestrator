import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";

import {
  cameraButtonsFor,
  createPressCounter,
  leftPressOwner,
} from "../../platform/input/navigationBindings";
import { useModeStoreApi } from "../../platform/stores/modeStore";
import { useRoiDrawingStoreApi } from "../../features/annotations/roiDrawingStore";

/**
 * Decides, at every left press on the canvas, whether it moves the view or
 * goes to the tool (`navigationBindings.leftPressOwner`) — and tells both
 * sides before either sees the press.
 *
 * Window CAPTURE phase, so it runs before the controls' pointerdown on the
 * canvas and before R3F's handlers: the controls get the button map that
 * matches (assigned directly — the per-press answer cannot wait for a React
 * commit, and the next press re-assigns it anyway), and the tools read the
 * answer from `modeStore.leftPress`. Lives in the shell because the rule
 * reads both the platform's mode and the annotate feature's tool state.
 */
export const LeftPressArbiter = () => {
  const controls = useThree((s) => s.controls);
  const gl = useThree((s) => s.gl);
  const modeApi = useModeStoreApi();
  const roiDrawingApi = useRoiDrawingStoreApi();
  const countPress = useMemo(() => createPressCounter(), []);

  useEffect(() => {
    const element = gl.domElement;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest("canvas") !== element) return;
      const detail = countPress({ at: event.timeStamp, x: event.clientX, y: event.clientY });
      const mode = modeApi.getState();
      const drawing = roiDrawingApi.getState();
      const owner = leftPressOwner({
        interactionMode: mode.interactionMode,
        designArmed: mode.designTool !== null,
        handHeld: mode.handHeld,
        annotate: {
          armed: drawing.activeTool !== null,
          marquee: drawing.activeTool === "SELECT",
          inProgress: drawing.shapeInProgress || drawing.primitiveSessionActive,
        },
        detail,
      });
      mode.setLeftPress(owner);
      if (controls && typeof controls === "object" && "mouseButtons" in controls) {
        (controls as { mouseButtons: unknown }).mouseButtons = cameraButtonsFor({
          displayMode: mode.displayMode,
          leftIsHand: owner === "camera",
        });
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [controls, gl, modeApi, roiDrawingApi, countPress]);

  return null;
};
