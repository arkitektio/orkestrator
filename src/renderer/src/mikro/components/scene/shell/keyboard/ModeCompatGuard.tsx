import { useEffect } from "react";
import { useModeStore } from "../../platform/stores/modeStore";
import { useRoiDrawingStore } from "../../features/annotations/roiDrawingStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { coerceModeState, hasProbeableLayer } from "../../features/annotations/modeCompat";

/**
 * Keeps the active mode and tool valid for the current view.
 *
 * The pickers hide options that would be inert, but the *active* selection can
 * still go stale underneath the user — flipping 2D→3D with the Select tool
 * armed, or hiding the last probeable layer while in PROBE. Without this the
 * store would keep reporting a mode that nothing implements, and the toolbar
 * would highlight it.
 *
 * Headless, and mounted outside the Canvas next to `KeyboardModeController`.
 * `coerceModeState` returns the same values when nothing needs changing, so the
 * identity comparison below is what stops a set → render → set loop.
 */
export const ModeCompatGuard = () => {
  const displayMode = useModeStore((s) => s.displayMode);
  const interactionMode = useModeStore((s) => s.interactionMode);
  const setInteractionMode = useModeStore((s) => s.setInteractionMode);
  const activeTool = useRoiDrawingStore((s) => s.activeTool);
  const setActiveTool = useRoiDrawingStore((s) => s.setActiveTool);
  // A SCALAR subscription (P9c/P17): only the boolean matters here, and the
  // `layers` array changes identity on every per-tick layer edit.
  const probeable = useSceneStore((s) => hasProbeableLayer(s.layers));

  useEffect(() => {
    const next = coerceModeState(
      { interactionMode, activeTool },
      { displayMode, hasProbeableLayer: probeable },
    );
    if (next.interactionMode !== interactionMode) {
      setInteractionMode(next.interactionMode);
    }
    if (next.activeTool !== activeTool) setActiveTool(next.activeTool);
  }, [
    displayMode,
    interactionMode,
    activeTool,
    probeable,
    setInteractionMode,
    setActiveTool,
  ]);

  return null;
};
