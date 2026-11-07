import { Hand, Maximize2, Redo2, Scaling, SquarePen, Undo2, type LucideIcon } from "lucide-react";
import { Button } from "@/core/ui/button";
import { ButtonGroup } from "@/core/ui/button-group";
import { cn } from "@/core/util/utils";
import { useRangeStore, useRangeStoreApi } from "../stores/rangeStore";
import {
  interactionModeOptions,
  type InteractionModeOption,
  useViewerStore,
  useViewerStoreApi,
  type InteractionMode,
  type LayoutMode,
} from "../stores/viewerStore";
import { DisplaySettings } from "./DisplaySettings";
import { LayoutModeToggle } from "./LayoutModeToggle";

/**
 * The renderer-owned HUD, bottom-right, above the time axis.
 *
 * Self-positioning and NOT host-composable — the same class mikro gives
 * `SceneModeControls`: where it sits is not a host's layout decision.
 *
 * Left to right: what a drag does (explore / annotate — the scene's own icons, Hand
 * and SquarePen, so the two viewers read alike), how rows share a scale (stacked /
 * shared), autoscale, fit, undo / redo, and the reading aids (axis labels, grid),
 * which are folded into one popover rather than spending two more slots on
 * switches most viewers leave alone. Every control subscribes to one scalar.
 */

/** Same icons as mikro's `SceneModeControls`, for the same meanings. */
const INTERACTION_ICONS: Record<InteractionMode, LucideIcon> = {
  EXPLORE: Hand,
  ANNOTATE: SquarePen,
};

export const PlotModeControls = ({
  annotatable,
  onAutoscale,
  fitTitle,
  modeOptions = interactionModeOptions,
  onLayoutModeChange,
}: {
  /** Whether there is anything to draw marks on. A lone mode is not offered. */
  annotatable: boolean;
  /** Rescale every row to what is on screen (and, where the module can, keep it). */
  onAutoscale: () => void;
  fitTitle: string;
  /** The module's own wording for what each mode does. */
  modeOptions?: readonly InteractionModeOption[];
  /** Where a layout choice goes: a session choice unless the module keeps it. */
  onLayoutModeChange?: (mode: LayoutMode) => void;
}) => {
  const mode = useViewerStore((s) => s.interactionMode);
  const canUndo = useRangeStore((s) => s.history.length > 0);
  const canRedo = useRangeStore((s) => s.future.length > 0);
  const viewerApi = useViewerStoreApi();
  const rangeApi = useRangeStoreApi();
  // An option that would do nothing is not offered.
  const modes = annotatable ? modeOptions : modeOptions.filter((m) => m.value === "EXPLORE");

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

      {/* How rows are laid out: one per layer, same units overlaid on one
          scale, or every trace in one plot on its own scale. */}
      <LayoutModeToggle onChange={onLayoutModeChange} />

      <ButtonGroup>
        <Button
          size="icon-sm"
          variant="outline"
          title="Autoscale every row to what is on screen, and keep those scales"
          onClick={onAutoscale}
        >
          <Scaling />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          title={fitTitle}
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

      <DisplaySettings />
    </div>
  );
};
