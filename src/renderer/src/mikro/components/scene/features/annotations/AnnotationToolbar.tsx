import { Button } from "@/core/ui/button";
import { ButtonGroup } from "@/core/ui/button-group";
import { useModeStore } from "../../platform/stores/modeStore";
import {
  activeTraceOn,
  isEnhanceableTool,
  useRoiDrawingStore,
  type AnnotateTool,
} from "./roiDrawingStore";
import { isAnnotateToolAvailable } from "./modeCompat";
import {
  Square,
  Circle,
  CircleDot,
  Box,
  Brush,
  Crosshair,
  Minus,
  MousePointer2,
  Pentagon,
  Pencil,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { BarTooltip } from "../../platform/layerui/BarTooltip";
import {
  applicableEnhancers,
  type AnnotationEnhancer,
} from "./enhancers/registry";

/**
 * Select sits first because it is the non-destructive tool — and because it is
 * where the old SELECT interaction mode went. It is hidden in 3D, where the
 * marquee has nothing to draw against.
 */
const TOOLS: {
  tool: AnnotateTool;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { tool: "SELECT", label: "Select", icon: MousePointer2 },
  { tool: "RECTANGLE", label: "Rect", icon: Square },
  { tool: "ELLIPSE", label: "Ellipse", icon: Circle },
  { tool: "POLYGON", label: "Polygon", icon: Pentagon },
  // Volumetric (3D-only): a probe click anchors the center, a second click
  // sets the radius.
  { tool: "SPHERE", label: "Sphere", icon: CircleDot },
  { tool: "CUBE", label: "Cube", icon: Box },
  { tool: "POINT", label: "Point", icon: Crosshair },
  { tool: "LINE", label: "Line", icon: Minus },
  { tool: "PATH", label: "Path", icon: Pencil },
  // The skeleton brush (3D-only): paint a stroke over a bright structure,
  // the extracted centerline becomes a PATH annotation.
  { tool: "BRUSH", label: "Brush", icon: Brush },
  // Surfaces live in DESIGN mode: a reconstructed surface is a mesh, not an
  // annotation (`features/meshDesign/ui/MeshDesignToolbar`).
];

type Indicator = { on: boolean; attention: boolean };

/**
 * Reads one enhancer's indicator hook and reports it up: each enhancer reads
 * its own store, so its hook lives in a component of its own and the button
 * stays free of a hook-per-enhancer loop.
 */
const IndicatorProbe = ({
  enhancer,
  report,
}: {
  enhancer: AnnotationEnhancer;
  report: (id: string, indicator: Indicator) => void;
}) => {
  const { on, attention } = enhancer.useIndicator();
  useEffect(() => report(enhancer.id, { on, attention }), [enhancer.id, on, attention, report]);
  return null;
};

/**
 * The one Enhancers button: its popover lists the applicable enhancers' choices
 * flat, each with a picture of what it does. Lit while one is on; held open
 * while one waits on a verdict (the brush's Save / Discard). Focus stays on the
 * scene so Esc / Backspace keep reaching the drawing session.
 */
const EnhancersButton = ({ enhancers }: { enhancers: AnnotationEnhancer[] }) => {
  const [open, setOpen] = useState(false);
  const [indicators, setIndicators] = useState<Record<string, Indicator>>({});
  const [report] = useState(
    () => (id: string, indicator: Indicator) =>
      setIndicators((prev) => ({ ...prev, [id]: indicator })),
  );
  const current = enhancers.map((e) => indicators[e.id]);
  const on = current.some((i) => i?.on);
  const attention = current.some((i) => i?.attention);

  return (
    <Popover open={open || attention} onOpenChange={setOpen}>
      {enhancers.map((enhancer) => (
        <IndicatorProbe key={enhancer.id} enhancer={enhancer} report={report} />
      ))}
      <BarTooltip label="Enhancers — make a stroke follow the data">
        <PopoverTrigger asChild>
          <Button
            variant={on ? "default" : "outline"}
            size="xs"
            className={on ? "h-7 w-8 p-0" : "h-7 w-8 bg-black p-0"}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
      </BarTooltip>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-auto gap-3"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {enhancers.map(({ id, ParamsPanel }) => (
          <ParamsPanel key={id} />
        ))}
      </PopoverContent>
    </Popover>
  );
};

/**
 * The annotate tool palette. It sits in the scene's bottom HUD row beside the
 * mode controls (`SceneViewport`), in the same pill and button size; what the
 * armed tool expects floats just above it.
 */
export const AnnotationToolbar = () => {
  const interactionMode = useModeStore((s) => s.interactionMode);
  const displayMode = useModeStore((s) => s.displayMode);
  const activeTool = useRoiDrawingStore((s) => s.activeTool);
  const setActiveTool = useRoiDrawingStore((s) => s.setActiveTool);
  const traceOn = useRoiDrawingStore(activeTraceOn);
  const enhancerMessage = useRoiDrawingStore((s) => s.enhancerMessage);
  const shapeInProgress = useRoiDrawingStore((s) => s.shapeInProgress);

  if (interactionMode !== "ANNOTATE") return null;

  const tools = TOOLS.filter(({ tool }) =>
    isAnnotateToolAvailable(tool, { displayMode }),
  );
  const enhancers = applicableEnhancers({ tool: activeTool, displayMode });

  return (
    <div className="pointer-events-auto relative flex items-center gap-2 rounded-lg border border-black/10 bg-black/40 p-1 backdrop-blur-md">
      {/* What the armed tool expects, above the bar. A fallen-back enhanced
          edge speaks here too: a straight edge where a traced one was asked
          for has to say why, or the enhancer reads as broken. (The brush
          panel carries its own status line.) The 3D line is not decoration:
          each click places the point the volume probed, so a click off the
          data places nothing. */}
      <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 w-max max-w-md rounded-md bg-black/50 px-2 py-0.5 text-right backdrop-blur-md">
        <span className="text-[10px] text-white/70">
          {enhancerMessage && isEnhanceableTool(activeTool) ? (
            <span className="text-amber-300/90">{enhancerMessage}</span>
          ) : activeTool === "BRUSH" ? (
            "Double-click and drag over the volume to paint a stroke along the structure — drag alone moves the view"
          ) : activeTool !== "SELECT" && !shapeInProgress ? (
            // Nothing under way: a press moves the view, and only a
            // double-click starts a shape (`navigationBindings.leftPressOwner`).
            activeTool === "PATH" && displayMode === "2D"
              ? "Double-click to start a path (or double-click and drag freehand) — drag moves the view"
              : "Double-click to start — drag moves the view"
          ) : isEnhanceableTool(activeTool) && traceOn ? (
            activeTool === "POLYGON" ? (
              "Click points — each edge follows the outline. Double-click to close"
            ) : displayMode === "3D" ? (
              "Click points — each edge follows the data. Double-click to finish"
            ) : activeTool === "PATH" ? (
              "Click or drag along the structure — the line follows the data. Scrub z to go on in another slice. Esc or double-click to finish, Backspace discards"
            ) : (
              "Click points — the line follows the data. Double-click to finish"
            )
          ) : activeTool === "PATH" && displayMode === "2D" ? (
            "Click points or drag freehand — scrub z to go on in another slice. Esc or double-click to finish, Backspace discards"
          ) : activeTool === "SELECT" ? (
            "Drag to select annotations"
          ) : displayMode === "3D" ? (
            "Click the volume to place each point — probed onto the data. Backspace discards"
          ) : (
            "Drawing annotations on the scene"
          )}
        </span>
      </div>
      <ButtonGroup>
        {tools.map(({ tool, label, icon: Icon }) => {
          const active = activeTool === tool;
          return (
            <BarTooltip key={tool} label={label}>
              <Button
                variant={active ? "default" : "outline"}
                size="xs"
                className={active ? "h-7 w-8 p-0" : "h-7 w-8 bg-black p-0"}
                onClick={() => setActiveTool(tool)}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            </BarTooltip>
          );
        })}
      </ButtonGroup>
      {enhancers.length > 0 && (
        <EnhancersButton
          key={enhancers.map((e) => e.id).join()}
          enhancers={enhancers}
        />
      )}
    </div>
  );
};
