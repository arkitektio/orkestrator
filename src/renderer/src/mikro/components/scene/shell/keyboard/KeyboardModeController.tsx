import { useEffect, useMemo, useRef } from "react";
import { InteractionMode, useModeStore, useModeStoreApi } from "../../platform/stores/modeStore";
import { designToolByKey } from "../../features/meshDesign/tools/registry";
import { isTypingTarget } from "../../platform/input/keyboardTarget";
import { layersPlanKey } from "../../platform/model/layerPlanKey";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";
import { stepSceneZ } from "@/core/data/scene/camera/sceneNavigation";
import { sceneZExtent } from "../../platform/coords/worldTransform";
import { useSettings } from "@/core/settings/store/SettingsContext";
import { useRoiDrawingStoreApi } from "../../features/annotations/roiDrawingStore";
import { holdReleaseAction } from "./holdRelease";

/** Hold-to-activate bindings. Release restores whatever was active before. */
const HOLD_MODES: Record<string, InteractionMode> = {
  a: "ANNOTATE",
  p: "PROBE",
  m: "DESIGN",
};

/**
 * Listens for key holds to temporarily override the mode.
 * e.g., holding 'P' switches to PROBE. Releasing it reverts back.
 */
export const KeyboardModeController = () => {
  const displayMode = useModeStore((s) => s.displayMode);
  const setInteractionMode = useModeStore((s) => s.setInteractionMode);
  const modeApi = useModeStoreApi();
  const heldKeyRef = useRef<string | null>(null);
  const restoreModeRef = useRef<InteractionMode | null>(null);
  const sceneStoreApi = useSceneStoreApi();
  // A SCALAR key, not the array (P9c/P17): `sceneZExtent` reads only fields
  // `layerPlanSignature` captures (zAxis, lens shape, affine), so a contrast
  // drag's per-tick layer replacement must not rebuild the listener effect.
  const layersKey = useSceneStore((s) => layersPlanKey(s.layers));
  const viewerStoreApi = useViewerStoreApi();
  const setCurrentZ = useViewerStore((s) => s.setCurrentZ);
  const roiDrawingApi = useRoiDrawingStoreApi();
  // Read at key-release time through a ref, so a settings change does not
  // tear down (and lose) a hold in flight by rebuilding the listeners.
  const { settings } = useSettings();
  const keepAnnotatingRef = useRef(settings.keepAnnotatingWhileDrawing);
  keepAnnotatingRef.current = settings.keepAnnotatingWhileDrawing;

  // `sceneZExtent` has no display-mode gate of its own — `currentZ` is only the
  // flat view's slice plane, so the gate belongs here.
  const zNavigation = useMemo(
    () =>
      displayMode === "2D" ? sceneZExtent(sceneStoreApi.getState().layers) : null,
    // The key STANDS FOR the layers array read via getState().
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayMode, layersKey, sceneStoreApi],
  );

  useEffect(() => {
    // DESIGN's tool keys, hold-to-act, straight from the registry: the key
    // selects the tool (its panel shows) AND arms it for as long as it is
    // down; released, DESIGN is back to navigating. (A stays the
    // hold-ANNOTATE key; the registry's test guards against collisions.)
    let heldToolKey: string | null = null;
    const releaseTool = () => {
      heldToolKey = null;
      const mode = modeApi.getState();
      if (mode.designToolHeld) mode.releaseDesignTool();
    };

    // Space is the hand, in every mode: the left button pans while it is
    // down (`platform/input/navigationBindings`).
    const releaseHand = () => modeApi.getState().setHandHeld(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTypingTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)
      ) {
        // Before the repeat guard: the held key's auto-repeat must not
        // scroll the page or press a focused button either.
        e.preventDefault();
        modeApi.getState().setHandHeld(true);
        return;
      }
      if (e.repeat) return; // Ignore auto-repeat when key is held
      // Without these, Cmd+A flips the scene into a tool mode and so does typing
      // "a" in any panel input.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target as { tagName?: string; isContentEditable?: boolean } | null)) {
        return;
      }

      const key = e.key.toLowerCase();

      // The crop box. Shift+S first: the key is lowercased, so below it would
      // read as DESIGN's Stamp.
      const crop = viewerStoreApi.getState();
      if (key === "s" && e.shiftKey) {
        crop.clearCrop();
        return;
      }
      if (crop.cropPhase !== "idle") {
        // `s` again leaves the mode it entered. Esc does too, but is heard by
        // the gesture itself (`CropBoxGesture`): it never bubbles this far.
        if (key === "s") {
          crop.cancelCrop();
          return;
        }
        if (key === "enter" && crop.cropPhase === "depth") {
          crop.commitCrop();
          return;
        }
      }

      if (modeApi.getState().interactionMode === "DESIGN") {
        const designKey = designToolByKey(key);
        if (designKey) {
          heldToolKey = key;
          modeApi.getState().selectDesignTool(designKey.id, true);
          return;
        }
      }

      // `s`: enter the crop mode. Nothing is drawn yet — the box starts with a
      // click, and the gesture runs on from there
      // (`features/crop/CropBoxGesture.tsx`). A one-shot, not a hold. After the DESIGN lookup above, so
      // there it stays the Stamp tool.
      if (key === "s") {
        crop.beginCrop();
        return;
      }

      const next = HOLD_MODES[key];
      if (!next || heldKeyRef.current) return;

      // Restore what the user actually had, not a hard-coded base — they may
      // have picked a mode in the toolbar before reaching for the key. A
      // restore still waiting on an unfinished shape hands over its target:
      // holding A again mid-shape must not make ANNOTATE the mode to go
      // back to.
      const waiting = deferredRestore;
      cancelDeferredRestore();
      heldKeyRef.current = key;
      restoreModeRef.current = waiting ?? modeApi.getState().interactionMode;
      setInteractionMode(next);
    };

    // A release that found a shape half-drawn: the mode to go back to, and
    // the subscription that goes back once the shape is done.
    let deferredRestore: InteractionMode | null = null;
    let stopWaiting: (() => void) | null = null;
    const cancelDeferredRestore = () => {
      stopWaiting?.();
      stopWaiting = null;
      deferredRestore = null;
    };

    const releaseHold = () => {
      const held = heldKeyRef.current;
      if (!held) return;
      heldKeyRef.current = null;
      const restore = restoreModeRef.current ?? "NAVIGATE";
      restoreModeRef.current = null;

      const action = holdReleaseAction({
        heldMode: HOLD_MODES[held],
        currentMode: modeApi.getState().interactionMode,
        shapeInProgress: roiDrawingApi.getState().shapeInProgress,
        keepAnnotatingWhileDrawing: keepAnnotatingRef.current,
      });
      if (action === "restore") setInteractionMode(restore);
      if (action !== "defer") return;

      // Stay until the shape is finished or discarded — or until the user
      // leaves ANNOTATE some other way, which ends the wait unasked.
      deferredRestore = restore;
      const unsubscribeShape = roiDrawingApi.subscribe((state) => {
        if (state.shapeInProgress) return;
        cancelDeferredRestore();
        if (modeApi.getState().interactionMode === "ANNOTATE") setInteractionMode(restore);
      });
      const unsubscribeMode = modeApi.subscribe((state) => {
        if (state.interactionMode !== "ANNOTATE") cancelDeferredRestore();
      });
      stopWaiting = () => {
        unsubscribeShape();
        unsubscribeMode();
      };
    };

    // Keyed off the armed hold rather than the event target, because focus can
    // move mid-hold.
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") releaseHand();
      const key = e.key.toLowerCase();
      if (heldToolKey === key) releaseTool();
      if (heldKeyRef.current !== key) return;
      releaseHold();
    };

    // Alt-tabbing mid-hold never fires keyup, which used to strand the scene in
    // the held mode.
    const handleBlur = () => {
      releaseHold();
      releaseTool();
      releaseHand();
    };

    const handleWheel = (e: WheelEvent) => {
      if (!e.shiftKey || !zNavigation) return;

      const target = e.target;
      if (!(target instanceof Element) || !target.closest("canvas")) return;

      // Shift+wheel is the z slider's, and only its. This listener runs in the
      // CAPTURE phase so it can stop the event before it reaches the canvas,
      // where the camera controls would otherwise dolly on the same tick —
      // `preventDefault` alone only stops the page scrolling.
      e.preventDefault();
      e.stopPropagation();

      // Some platforms turn a shifted wheel into a horizontal one (deltaY 0,
      // the motion in deltaX): read whichever axis actually moved.
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta === 0) return;

      // Same stepping as Shift+←/→ (`KeyboardSceneNavigation`), so the two ways
      // of walking the stack cannot disagree about where a slice is.
      const { currentZ } = viewerStoreApi.getState();
      const nextZ = stepSceneZ(zNavigation, currentZ, delta > 0 ? 1 : -1);

      if (nextZ !== currentZ) {
        setCurrentZ(nextZ);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });

    return () => {
      cancelDeferredRestore();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [setCurrentZ, setInteractionMode, modeApi, viewerStoreApi, roiDrawingApi, zNavigation]);

  return null; // This is a headless component, it renders nothing
};
