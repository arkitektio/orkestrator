import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Hand,
  Pin,
  ScanEye,
  SquarePen,
  Target,
  Boxes,
  type LucideIcon,
} from "lucide-react";
import {
  hasProbeableLayer,
  isInteractionModeAvailable,
} from "../../features/annotations/modeCompat";
import { displayModeToPreferredView } from "../../platform/camera/preferredView";
import { useScenePreferencesEditor } from "../../features/animation/useAnimationEditor";
import { InteractionMode, useModeStore } from "../../platform/stores/modeStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { SceneSettings } from "./SceneSettings";

/** Icon per interaction mode for the compact mode control. */
const INTERACTION_ICONS: Record<InteractionMode, LucideIcon> = {
  NAVIGATE: Hand,
  ANNOTATE: SquarePen,
  PROBE: Target,
  DESIGN: Boxes,
};

/**
 * The mode controls, docked bottom-right — under the gizmo, which answers the
 * question these controls change: what kind of view you are in and what a
 * pointer gesture does. Renderer-owned HUD, so every host gets them in the
 * same place. Left to right: interaction modes, the hover-probe toggle (only
 * while in PROBE, since it modifies nothing else), the 2D/3D display toggle,
 * the pin, and the view-settings gear.
 *
 * The gear is here rather than in a panel column because it answers the same
 * question as its neighbours — what this view looks like — and a corner is a
 * cheaper place to look than a foldable card on the far side of the canvas.
 *
 * The pin travels with the display toggle because it is about exactly that:
 * which view the scene opens in for everyone. A preference, not a lock —
 * anyone can still switch once the scene is up. Saving also refreshes the
 * scene's tile from the current canvas.
 */
export const SceneModeControls = () => {
  const displayMode = useModeStore((s) => s.displayMode);
  const setDisplayMode = useModeStore((s) => s.setDisplayMode);
  const interactionModeOptions = useModeStore((s) => s.interactionModeOptions);
  const interactionMode = useModeStore((s) => s.interactionMode);
  const setInteractionMode = useModeStore((s) => s.setInteractionMode);
  const probeFollowsCursor = useModeStore((s) => s.probeFollowsCursor);
  const setProbeFollowsCursor = useModeStore((s) => s.setProbeFollowsCursor);
  // A SCALAR subscription (P9c/P17): only the boolean gates the mode options,
  // and the `layers` array changes identity on every per-tick layer edit.
  const probeable = useSceneStore((state) => hasProbeableLayer(state.layers));

  const preferredView = useSceneStore((state) => state.preferredView);
  const { savePreferredView, saving } = useScenePreferencesEditor();
  const isDefaultView = preferredView === displayModeToPreferredView(displayMode);
  const onPinView = () => savePreferredView(displayModeToPreferredView(displayMode));

  const nextDisplayMode = displayMode === "2D" ? "3D" : "2D";

  // An option that would be inert is not offered — see `features/annotations/modeCompat.ts`.
  const modeContext = {
    displayMode,
    hasProbeableLayer: probeable,
  };
  const availableModes = interactionModeOptions.filter((mode) =>
    isInteractionModeAvailable(mode.value, modeContext),
  );

  return (
    <div className="pointer-events-auto absolute bottom-2 right-2 z-30 flex items-center gap-2 rounded-lg border border-black/10 bg-black/40 p-1 backdrop-blur-md">
      {/* Interaction modes — iconified switches. */}
      <ButtonGroup>
        {availableModes.map((mode) => {
          const Icon = INTERACTION_ICONS[mode.value];
          const active = interactionMode === mode.value;
          return (
            <Button
              key={mode.value}
              variant={active ? "default" : "outline"}
              size={"xs"}
              className={active ? "h-7 w-8 p-0" : "h-7 w-8 bg-black p-0"}
              onClick={() => setInteractionMode(mode.value)}
              // The buttons are icon-only, so the tooltip carries the whole
              // explanation — the descriptions used to go unshown entirely.
              title={mode.description ? `${mode.label} — ${mode.description}` : mode.label}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          );
        })}
      </ButtonGroup>

      {/* Hover-to-probe — what used to be the separate AUTO_PROBE mode. Hover
          updates the readout only; the camera pivot still follows clicks. */}
      {interactionMode === "PROBE" && (
        <Button
          variant={probeFollowsCursor ? "default" : "outline"}
          size={"xs"}
          className={probeFollowsCursor ? "h-7 w-8 p-0" : "h-7 w-8 bg-black p-0"}
          onClick={() => setProbeFollowsCursor(!probeFollowsCursor)}
          title="Update the probe continuously as the cursor moves"
        >
          <ScanEye className="h-3.5 w-3.5" />
        </Button>
      )}

      <Button
        variant={"outline"}
        size={"xs"}
        className="h-7 w-11 bg-black tabular-nums"
        onClick={() => setDisplayMode(nextDisplayMode)}
        title={`Switch to ${nextDisplayMode} view`}
      >
        <span className="text-xs font-bold">{displayMode}</span>
      </Button>
      <Button
        variant={"outline"}
        size={"xs"}
        className={
          isDefaultView ? "h-7 bg-black text-sky-400" : "h-7 bg-black text-white/60"
        }
        onClick={onPinView}
        disabled={saving}
        title={
          isDefaultView
            ? `This scene opens in ${displayMode}`
            : `Open this scene in ${displayMode} by default (and snapshot the current view)`
        }
      >
        <Pin className="h-3.5 w-3.5" />
      </Button>

      <SceneSettings />
    </div>
  );
};
