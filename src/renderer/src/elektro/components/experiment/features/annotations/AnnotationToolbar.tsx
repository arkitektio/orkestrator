import {
  Flag,
  GalleryVertical,
  Minus,
  MousePointer2,
  Pencil,
  Pentagon,
  SquareDashed,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/core/ui/button";
import { ButtonGroup } from "@/core/ui/button-group";
import { useExperimentStore } from "../../platform/stores/experimentStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { ANNOTATE_TOOLS, toolSpec, type AnnotateTool } from "./annotationTools";
import { useAnnotationStore, useAnnotationStoreApi } from "./store/annotationSlice";

/**
 * The annotate tool palette — mikro's `RoiToolbar`, on a timeline: Select first,
 * then the time tools, then the row tools. Shown in ANNOTATE mode only, centred
 * above the time axis, with the active tool's hint above it.
 *
 * Row tools need a trace row to draw over; with no visible trace they are shown
 * disabled, and say why, rather than hidden.
 */

const ICONS: Record<AnnotateTool, LucideIcon> = {
  SELECT: MousePointer2,
  EVENT: Flag,
  EVENTS: GalleryVertical,
  EPOCH: SquareDashed,
  LINE: Minus,
  PATH: Pencil,
  POLYGON: Pentagon,
};

export const AnnotationToolbar = () => {
  const mode = useViewerStore((s) => s.interactionMode);
  const annotatable = useExperimentStore((s) => s.annotatable);
  const hasTraceRow = useExperimentStore((s) => s.layers.some((l) => l.kind === "trace" && l.visible));
  const active = useAnnotationStore((s) => s.annotateTool);
  const api = useAnnotationStoreApi();

  if (mode !== "ANNOTATE" || !annotatable) return null;

  return (
    <div className="pointer-events-auto absolute bottom-14 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1">
      <span className="text-[10px] text-white/50">{toolSpec(active).hint}</span>
      <ButtonGroup>
        {ANNOTATE_TOOLS.map(({ tool, label, shortcut, scope }) => {
          const Icon = ICONS[tool];
          const disabled = scope === "row" && !hasTraceRow;
          return (
            <Button
              key={tool}
              variant={active === tool ? "default" : "outline"}
              size="xs"
              className={active === tool ? undefined : "bg-black"}
              disabled={disabled}
              aria-pressed={active === tool}
              title={
                disabled
                  ? `${label} — draws over a trace row; show a trace first`
                  : `${label} (${shortcut.toUpperCase()})`
              }
              onClick={() => api.getState().setAnnotateTool(tool)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[10px]">{label}</span>
            </Button>
          );
        })}
      </ButtonGroup>
    </div>
  );
};
