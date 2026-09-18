import {
  Hand,
  Layers,
  Maximize2,
  Redo2,
  Rows3,
  Scaling,
  SquarePen,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoscale } from "../../platform/edits/useAutoscale";
import { ButtonGroup } from "@/components/ui/button-group";
import { cn } from "@/lib/utils";
import { useExperimentStore } from "../../platform/stores/experimentStore";
import { useRangeStore, useRangeStoreApi } from "../../platform/stores/rangeStore";
import {
  interactionModeOptions,
  useViewerStore,
  useViewerStoreApi,
  type InteractionMode,
} from "../../platform/stores/viewerStore";

/**
 * The renderer-owned HUD, bottom-right, above the time axis.
 *
 * Self-positioning and NOT host-composable — the same class mikro gives
 * `SceneModeControls`: where it sits is not a host's layout decision.
 *
 * Left to right: what a drag does (explore / annotate — the scene's own icons, Hand
 * and SquarePen, so the two viewers read alike), how rows share a scale (stacked /
 * shared), autoscale, fit, undo / redo. Every control subscribes to one scalar.
 */

/** Same icons as mikro's `SceneModeControls`, for the same meanings. */
const INTERACTION_ICONS: Record<InteractionMode, LucideIcon> = {
  EXPLORE: Hand,
  ANNOTATE: SquarePen,
};

export const ExperimentModeControls = () => {
  const mode = useViewerStore((s) => s.interactionMode);
  const layoutMode = useViewerStore((s) => s.layoutMode);
  const canUndo = useRangeStore((s) => s.history.length > 0);
  const canRedo = useRangeStore((s) => s.future.length > 0);
  const viewerApi = useViewerStoreApi();
  const autoscale = useAutoscale();
  const rangeApi = useRangeStoreApi();
  // An option that would do nothing is not offered: a synthesized run or segment
  // scene has no experiment to draw marks on.
  const annotatable = useExperimentStore((s) => s.annotatable);
  const modes = annotatable
    ? interactionModeOptions
    : interactionModeOptions.filter((m) => m.value === "EXPLORE");

  return (
    <div className="pointer-events-auto absolute bottom-14 right-2 z-30 flex items-center gap-2 rounded-lg border border-black/10 bg-black/40 p-1 backdrop-blur-md">
      {/* Interaction modes — iconified switches, as in the scene. A lone mode is
          not a choice, so it is not shown. */}
      {modes.length > 1 && (
        <ButtonGroup>
          {modes.map((option) => {
            const Icon = INTERACTION_ICONS[option.value];
            const active = mode === option.value;
            return (
              <Button
                key={option.value}
                variant={active ? "default" : "outline"}
                size="xs"
                className={active ? "h-7 w-8 p-0" : "h-7 w-8 bg-black p-0"}
                title={`${option.label} — ${option.description}`}
                aria-pressed={active}
                onClick={() => viewerApi.getState().setInteractionMode(option.value)}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            );
          })}
        </ButtonGroup>
      )}

      <ButtonGroup>
        <Button
          size="icon-sm"
          variant="outline"
          title={
            layoutMode === "STACKED"
              ? "Stacked: one row per view, each on its own scale. Click to overlay same-unit views."
              : "Shared: same-unit views overlaid on one scale. Click to stack."
          }
          onClick={() =>
            viewerApi
              .getState()
              .setLayoutMode(layoutMode === "STACKED" ? "SHARED" : "STACKED")
          }
        >
          {layoutMode === "STACKED" ? <Rows3 /> : <Layers />}
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          title="Autoscale every row to what is on screen, and keep those scales"
          onClick={() => autoscale()}
        >
          <Scaling />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          title="Fit the whole experiment (double-click the plot)"
          onClick={() => rangeApi.getState().fit()}
        >
          <Maximize2 />
        </Button>
      </ButtonGroup>

      <ButtonGroup>
        <Button
          size="icon-sm"
          variant="outline"
          title="Back to the previous zoom"
          disabled={!canUndo}
          onClick={() => rangeApi.getState().undo()}
        >
          <Undo2 />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          title="Forward"
          disabled={!canRedo}
          onClick={() => rangeApi.getState().redo()}
          className={cn(!canRedo && "opacity-50")}
        >
          <Redo2 />
        </Button>
      </ButtonGroup>
    </div>
  );
};
