import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import {
  cameraButtonsFor,
  leftPressOwner,
  restingLeftIsHand,
} from "../../platform/input/navigationBindings";
import { useCameraInteraction, usePressLedger } from "../../platform/input/sceneInput";
import { perfMonitor } from "../../platform/perf/perfMonitor";
import { useModeStoreApi } from "../../platform/stores/modeStore";
import { useRoiDrawingStoreApi } from "../../features/annotations/roiDrawingStore";
import { useRoiSelectionStoreApi } from "../../features/annotations/roiSelectionStore";

/**
 * Feeds the scene's press ledger (`platform/input/pressLedger.ts`) from the
 * DOM — the ONE place the scene listens for a press beginning and ending.
 *
 * At every press on the canvas it decides whether a left press moves the view
 * or goes to the tool (`navigationBindings.leftPressOwner`) and tells both
 * sides before either sees it: the controls get the button map that matches
 * (assigned directly — the per-press answer cannot wait for a React commit),
 * and the tools read the answer off the ledger.
 *
 * And it guarantees the press an end. A release is heard on the window, so it
 * counts wherever it lands (outside the canvas, over a panel); a cancelled
 * pointer, a window that lost focus, a tab that went hidden and this
 * component unmounting all end the press as cancelled. Whatever ended it:
 *  - the controls go back to the map they rest on, so a press's map never
 *    outlives the press (the "left drag no longer moves the view" state);
 *  - the camera stops counting as driven, for the releases the controls never
 *    heard.
 *
 * Window CAPTURE phase for the press and its release, so the ledger has
 * answered before the controls' listeners and R3F's handlers run. The END is
 * told from the BUBBLE phase instead (`settle`): by then every object handler
 * has had its chance at the release, and what is still open belongs to nobody.
 * A timer backs it up, because a capture-phase `stopPropagation` (the crop
 * gesture swallows its own presses) means the bubble never comes.
 *
 * Lives in the shell because the owner rule reads both the platform's mode
 * and the annotate feature's tool state.
 */
export const PressLedgerDriver = () => {
  const controls = useThree((s) => s.controls);
  const gl = useThree((s) => s.gl);
  const ledger = usePressLedger();
  const cameraInteraction = useCameraInteraction();
  const modeApi = useModeStoreApi();
  const roiDrawingApi = useRoiDrawingStoreApi();
  const roiSelectionApi = useRoiSelectionStoreApi();

  useEffect(() => {
    const element = gl.domElement;
    const buttonControls =
      controls && typeof controls === "object" && "mouseButtons" in controls
        ? (controls as { mouseButtons: unknown })
        : null;

    // How long the event waited for the main thread (`timeStamp` is when the
    // input happened): the number that says whether a load is starving input.
    // A no-op unless a perf recording is armed.
    const markDelay = (event: PointerEvent) =>
      perfMonitor.markEvent("input:delay", { ms: Math.max(0, performance.now() - event.timeStamp) });

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest("canvas") !== element) return;
      markDelay(event);
      const mode = modeApi.getState();
      const drawing = roiDrawingApi.getState();
      const annotate = {
        armed: drawing.activeTool !== null,
        marquee: drawing.activeTool === "SELECT",
        inProgress: drawing.shapeInProgress || drawing.primitiveSessionActive,
      };
      const press = ledger.down(
        {
          pointerId: event.pointerId,
          button: event.button,
          x: event.clientX,
          y: event.clientY,
          at: event.timeStamp,
          shift: event.shiftKey,
        },
        (count) =>
          leftPressOwner({
            interactionMode: mode.interactionMode,
            designArmed: mode.designTool !== null,
            handHeld: mode.handHeld,
            annotate,
            detail: count,
          }),
      );
      if (press.button !== 0) return;
      // The press that STARTS a shape (a double-click's second, under a shape
      // tool). Its first click was the camera's and landed on whatever shape
      // was under it, whose pick is still waiting out the double-click window;
      // a double-click means "draw here", so that pick never happens.
      if (
        press.owner === "tool" &&
        mode.interactionMode === "ANNOTATE" &&
        annotate.armed &&
        !annotate.marquee &&
        !annotate.inProgress
      ) {
        roiSelectionApi.getState().cancelPendingPick();
      }
      if (buttonControls) {
        buttonControls.mouseButtons = cameraButtonsFor({
          displayMode: mode.displayMode,
          leftIsHand: press.owner === "camera",
        });
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!ledger.current()) return;
      ledger.move({ pointerId: event.pointerId, x: event.clientX, y: event.clientY });
    };

    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const settle = () => {
      if (settleTimer !== null) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
      ledger.settle();
    };
    const onPointerUp = (event: PointerEvent) => {
      const end = ledger.up({ pointerId: event.pointerId, x: event.clientX, y: event.clientY });
      if (end) markDelay(event);
      if (end && settleTimer === null) settleTimer = setTimeout(settle, 0);
    };
    const cancel = () => {
      settle();
      ledger.cancel();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") cancel();
    };

    const stopListening = ledger.onEnd(() => {
      const mode = modeApi.getState();
      if (buttonControls) {
        buttonControls.mouseButtons = cameraButtonsFor({
          displayMode: mode.displayMode,
          leftIsHand: restingLeftIsHand({
            interactionMode: mode.interactionMode,
            designArmed: mode.designTool !== null,
            handHeld: mode.handHeld,
          }),
        });
      }
      cameraInteraction.end();
    });

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointerup", settle);
    window.addEventListener("pointercancel", cancel, true);
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointerup", settle);
      window.removeEventListener("pointercancel", cancel, true);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", onVisibility);
      // The canvas (or its controls) is going: a press in flight ends with it,
      // while the listener that puts the controls back is still attached.
      cancel();
      stopListening();
    };
  }, [controls, gl, ledger, cameraInteraction, modeApi, roiDrawingApi, roiSelectionApi]);

  return null;
};
