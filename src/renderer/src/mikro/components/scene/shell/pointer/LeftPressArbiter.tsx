import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";

import {
  cameraButtonsFor,
  createPressCounter,
  leftPressOwner,
} from "../../platform/input/navigationBindings";
import { useModeStoreApi } from "../../platform/stores/modeStore";
import { useRoiDrawingStoreApi } from "../../features/annotations/roiDrawingStore";
import { useRoiSelectionStoreApi } from "../../features/annotations/roiSelectionStore";

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
  const roiSelectionApi = useRoiSelectionStoreApi();
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
      const annotate = {
        armed: drawing.activeTool !== null,
        marquee: drawing.activeTool === "SELECT",
        inProgress: drawing.shapeInProgress || drawing.primitiveSessionActive,
      };
      const owner = leftPressOwner({
        interactionMode: mode.interactionMode,
        designArmed: mode.designTool !== null,
        handHeld: mode.handHeld,
        annotate,
        detail,
      });
      mode.setLeftPress(owner);
      // The press that STARTS a shape (a double-click's second, under a shape
      // tool). Its first click was the camera's and landed on whatever shape
      // was under it, whose pick is still waiting out the double-click window;
      // a double-click means "draw here", so that pick never happens.
      if (
        owner === "tool" &&
        mode.interactionMode === "ANNOTATE" &&
        annotate.armed &&
        !annotate.marquee &&
        !annotate.inProgress
      ) {
        roiSelectionApi.getState().cancelPendingPick();
      }
      if (controls && typeof controls === "object" && "mouseButtons" in controls) {
        (controls as { mouseButtons: unknown }).mouseButtons = cameraButtonsFor({
          displayMode: mode.displayMode,
          leftIsHand: owner === "camera",
        });
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [controls, gl, modeApi, roiDrawingApi, roiSelectionApi, countPress]);

  return null;
};
