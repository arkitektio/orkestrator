import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useModeStore } from "../../platform/stores/modeStore";
import {
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
} from "lucide-react";
import { applicableEnhancers } from "./enhancers/registry";

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
  // The smooth blob lives in DESIGN mode: a grown surface is a mesh, not an
  // annotation (`features/meshDesign/ui/MeshDesignToolbar`).
];

export const RoiToolbar = () => {
  const interactionMode = useModeStore((s) => s.interactionMode);
  const displayMode = useModeStore((s) => s.displayMode);
  const activeTool = useRoiDrawingStore((s) => s.activeTool);
  const setActiveTool = useRoiDrawingStore((s) => s.setActiveTool);
  const vectorEnhance = useRoiDrawingStore(
    (s) => s.enhancersOn["vector-trace"] ?? false,
  );
  const enhancerMessage = useRoiDrawingStore((s) => s.enhancerMessage);

  if (interactionMode !== "ANNOTATE") return null;

  const tools = TOOLS.filter(({ tool }) =>
    isAnnotateToolAvailable(tool, { displayMode }),
  );
  const enhancers = applicableEnhancers({ tool: activeTool, displayMode });

  return (
    <div className="absolute bottom-12 left-1/2 z-30 -translate-x-1/2 flex flex-col items-center gap-1">
      {/* Shapes land in the scene's own coordinate system, so there is nothing
          to arm and no per-layer constraint to describe. */}
      {enhancers.map(({ id, ParamsPanel }) => (
        <ParamsPanel key={id} />
      ))}
      {/* The 3D line is not decoration: the gesture genuinely differs — each
          click places the point the volume probed, so a click off the data
          places nothing. A fallen-back enhanced edge speaks here too: a
          straight edge where a traced one was asked for has to say why, or the
          enhancer reads as broken. (The brush panel carries its own status
          line, so its messages are not repeated here.) */}
      <span className="text-[10px] text-white/50">
        {enhancerMessage && isEnhanceableTool(activeTool) ? (
          <span className="text-amber-300/90">{enhancerMessage}</span>
        ) : isEnhanceableTool(activeTool) && vectorEnhance ? (
          "Click points — each edge follows the data. Double-click to finish"
        ) : activeTool === "SELECT" ? (
          "Drag to select annotations"
        ) : activeTool === "BRUSH" ? (
          "Drag over the volume to paint a stroke along the structure"
        ) : activeTool === "BLOB" ? (
          "Click a bright structure — a surface grows around it"
        ) : displayMode === "3D" ? (
          "Click the volume to place each point — probed onto the data"
        ) : (
          "Drawing annotations on the scene"
        )}
      </span>
      <ButtonGroup>
        {tools.map(({ tool, label, icon: Icon }) => (
          <Button
            key={tool}
            variant={activeTool === tool ? "default" : "outline"}
            size="xs"
            onClick={() => setActiveTool(tool)}
            title={label}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-[10px]">{label}</span>
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
};
