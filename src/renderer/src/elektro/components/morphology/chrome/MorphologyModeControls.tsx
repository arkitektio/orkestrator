import { Button } from "@/components/ui/button";
import { Maximize } from "lucide-react";
import { useMorphologyStore } from "../stores/morphologyStore";
import { MorphologySettings } from "./MorphologySettings";

/**
 * The bottom-right HUD strip, in the scene's place and style
 * (`SceneModeControls`, `ExperimentModeControls`): the display switch —
 * "3D" / "Tree" here where the scene has "2D" / "3D" — framing, and the gear.
 *
 * `showDisplaySwitch` is off where there is no tree to switch to (the editor,
 * the embedded previews).
 */
export const MorphologyModeControls = ({
  showDisplaySwitch = true,
}: {
  showDisplaySwitch?: boolean;
}) => {
  const displayMode = useMorphologyStore((s) => s.displayMode);
  const setDisplayMode = useMorphologyStore((s) => s.setDisplayMode);
  const requestFit = useMorphologyStore((s) => s.requestFit);
  const next = displayMode === "3D" ? "Tree" : "3D";

  return (
    <div className="pointer-events-auto absolute bottom-2 right-2 z-30 flex items-center gap-2 rounded-lg border border-black/10 bg-black/40 p-1 backdrop-blur-md">
      {displayMode === "3D" && (
        <>
          <Button
            variant="outline"
            size="xs"
            className="h-7 w-8 bg-black p-0"
            onClick={requestFit}
            title="Frame the whole model (F)"
          >
            <Maximize className="h-3.5 w-3.5" />
          </Button>
          <MorphologySettings />
        </>
      )}
      {showDisplaySwitch && (
        <Button
          variant="outline"
          size="xs"
          className="h-7 w-12 bg-black tabular-nums"
          onClick={() => setDisplayMode(next)}
          title={`Switch to ${next} view`}
        >
          <span className="text-xs font-bold">{displayMode}</span>
        </Button>
      )}
    </div>
  );
};
