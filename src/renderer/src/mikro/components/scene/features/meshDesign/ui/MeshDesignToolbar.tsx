import { useEffect } from "react";
import { Ellipsis } from "lucide-react";

import { Button } from "@/core/ui/button";
import { ButtonGroup } from "@/core/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { isTypingTarget } from "../../../platform/input/keyboardTarget";
import { DESIGN_TOOL_GESTURES, useModeStore } from "../../../platform/stores/modeStore";
import { useBrushSkeletonStoreApi } from "../brush";
import { ParamRow } from "../../annotations/enhancers/shared/ParamRow";
import { DESIGN_TOOLS, designToolById } from "../tools/registry";
import {
  useMeshDesignStore,
  useMeshDesignStoreApi,
  type SculptVariant,
  type StampShape,
} from "../store/meshDesignStore";
import { ReconstructPanel } from "./ReconstructPanel";
import { RadiusRow } from "./reconstructPanels";

/**
 * The designer's in-viewport toolbar — ANNOTATE's `RoiToolbar` idiom: a row
 * of tool buttons, the selected tool's panel stacked above it, a one-line
 * hint between. Everything a gesture needs sits next to where the pointer is.
 *
 * SELECTING a tool (a click here, or its key) only says whose panel shows.
 * A tool ACTS while its key is held — the scene navigates otherwise — so the
 * button of the tool being held lights up fully and the hint says which key.
 *
 * The MANAGEMENT surface — the staged mesh list, rename/simplify/visibility,
 * commit — lives in the sidebar's layer panel as the `DesignStagingCard`:
 * the session behaves like a layer, so it is managed where layers are.
 */

const PRIMARY_TOOLS = DESIGN_TOOLS.filter((tool) => tool.group === "primary");
const MORE_TOOLS = DESIGN_TOOLS.filter((tool) => tool.group === "more");

const panelClass =
  "pointer-events-auto flex flex-col gap-1 rounded-md bg-background/80 px-2 py-1.5 shadow-md backdrop-blur-sm";

/** The panel of an editing tool: its one or two knobs. */
const EditToolPanel = ({ tool }: { tool: "carve" | "sculpt" | "stamp" | "bridge" }) => {
  const stampShape = useMeshDesignStore((s) => s.stampShape);
  const setStampShape = useMeshDesignStore((s) => s.setStampShape);
  const sculptVariant = useMeshDesignStore((s) => s.sculptVariant);
  const setSculptVariant = useMeshDesignStore((s) => s.setSculptVariant);
  return (
    <div className={panelClass}>
      {tool === "stamp" && (
        <ParamRow label="Shape" title="The primitive a click places">
          <ToggleGroup type="single" size="sm" value={stampShape} onValueChange={(v) => v && setStampShape(v as StampShape)}>
            {(["sphere", "box", "ellipsoid"] as const).map((shape) => (
              <ToggleGroupItem key={shape} value={shape} className="h-5 px-2 text-[10px]">
                {shape}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </ParamRow>
      )}
      {tool === "sculpt" && (
        <ParamRow label="Verb" title="What a drag on the mesh does to it">
          <ToggleGroup type="single" size="sm" value={sculptVariant} onValueChange={(v) => v && setSculptVariant(v as SculptVariant)}>
            {(["inflate", "deflate", "smooth"] as const).map((variant) => (
              <ToggleGroupItem key={variant} value={variant} className="h-5 px-2 text-[10px]">
                {variant}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </ParamRow>
      )}
      <RadiusRow
        title={
          tool === "bridge"
            ? "How far from the straight line the connecting path may wander; the tube is a little under half as thick"
            : "The size of the tool"
        }
      />
    </div>
  );
};

export const MeshDesignToolbar = () => {
  const interactionMode = useModeStore((s) => s.interactionMode);
  const displayMode = useModeStore((s) => s.displayMode);
  const selectedTool = useModeStore((s) => s.selectedDesignTool);
  const selectDesignTool = useModeStore((s) => s.selectDesignTool);
  const heldTool = useModeStore((s) => s.designTool);
  const message = useMeshDesignStore((s) => s.message);
  const designApi = useMeshDesignStoreApi();
  const brushApi = useBrushSkeletonStoreApi();

  const inDesign = interactionMode === "DESIGN";

  // The designer's keys — DESIGN only, never from an input. Lives here
  // (always mounted with the viewport) rather than in the sidebar card, which
  // the user may have closed.
  useEffect(() => {
    if (!inDesign) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      const design = designApi.getState();
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) design.redo();
        else design.undo();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") {
        // A gesture in flight is the stroke session's to cancel.
        if (brushApi.getState().status !== "idle") return;
        if (design.pendingPoint) design.setPendingPoint(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inDesign, designApi, brushApi]);

  if (!inDesign) return null;

  const tool = designToolById(selectedTool);
  const moreTool = tool?.group === "more" ? tool : undefined;
  // Only the click tools reach the flat view (the plane answers their probe);
  // strokes need the volume, surface gestures the 3D overlay.
  const needs3D = tool !== undefined && displayMode !== "3D" && DESIGN_TOOL_GESTURES[tool.id] !== "volume-click";

  return (
    <div className="absolute bottom-12 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1">
      {selectedTool === "trace" && <ReconstructPanel gesture="stroke" />}
      {selectedTool === "seed" && <ReconstructPanel gesture="click" />}
      {(selectedTool === "carve" ||
        selectedTool === "sculpt" ||
        selectedTool === "stamp" ||
        selectedTool === "bridge") && <EditToolPanel tool={selectedTool} />}
      {/* The frosted pill is what keeps the bar legible over a bright image:
          it dims and blurs what is behind it, so white-on-translucent still
          reads on a white RGB frame and all but disappears on a dark one. */}
      <div className="pointer-events-auto flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-black/50 px-2 pb-1.5 pt-1 shadow-lg shadow-black/20 backdrop-blur-xl backdrop-brightness-75 backdrop-saturate-150">
        <span className="text-[10px] text-white/70">
          {message ? (
            <span className="text-amber-300/90">{message}</span>
          ) : needs3D ? (
            <span className="text-amber-300/90">{`${tool.label} works in the 3D view`}</span>
          ) : heldTool && tool ? (
            <span className="text-emerald-300/90">{tool.hint}</span>
          ) : tool ? (
            `Hold ${tool.key.toUpperCase()} — ${tool.hint.charAt(0).toLowerCase()}${tool.hint.slice(1)}`
          ) : (
            "Navigate freely — hold a tool's key to use it"
          )}
        </span>
        <ButtonGroup>
          {PRIMARY_TOOLS.map(({ id, label, key, icon: Icon, shortcut }) => (
            <Button
              key={id}
              variant={heldTool === id ? "default" : selectedTool === id ? "secondary" : "outline"}
              size="xs"
              onClick={() => selectDesignTool(id)}
              title={`${shortcut.description} — hold ${key.toUpperCase()}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[10px]">{label}</span>
              <span className="text-[9px] opacity-60">{key.toUpperCase()}</span>
            </Button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={moreTool && heldTool === moreTool.id ? "default" : moreTool ? "secondary" : "outline"}
                size="xs"
                title="More tools"
              >
                {moreTool ? <moreTool.icon className="h-3.5 w-3.5" /> : <Ellipsis className="h-3.5 w-3.5" />}
                <span className="text-[10px]">{moreTool?.label ?? "More"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end">
              {MORE_TOOLS.map(({ id, label, key, icon: Icon, shortcut }) => (
                <DropdownMenuItem key={id} onSelect={() => selectDesignTool(id)} title={shortcut.description}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  <DropdownMenuShortcut>{key.toUpperCase()}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      </div>
    </div>
  );
};
