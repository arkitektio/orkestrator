import { useEffect } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useModeStore } from "../../../platform/stores/modeStore";
import { useRoiDrawingStore, type AnnotateTool } from "../../annotations/roiDrawingStore";
import { applicableEnhancers } from "../../annotations/enhancers/registry";
import { designToolById } from "../tools/registry";
import {
  useMeshDesignStore,
  useMeshDesignStoreApi,
  type SculptVariant,
  type StampShape,
} from "../store/meshDesignStore";

/**
 * The designer's in-viewport HUD — the GESTURE surface only: what the held
 * key does, the enhancer panels the active tool needs, and the held-tool
 * pickers (stamp shape, sculpt variant), all next to where the pointer is.
 *
 * The MANAGEMENT surface — the staged mesh list, rename/simplify/visibility,
 * commit, the Loft/Tube actions — lives in the sidebar's layer panel as the
 * `DesignStagingCard`: the session behaves like a layer, so it is managed
 * where layers are managed, and the HUD stays out of the scene's way.
 */

const isDesignTool = (tool: AnnotateTool | null): boolean => tool === "BRUSH" || tool === "BLOB";

export const MeshDesignToolbar = () => {
  const interactionMode = useModeStore((s) => s.interactionMode);
  const displayMode = useModeStore((s) => s.displayMode);
  const heldTool = useModeStore((s) => s.designTool);
  const activeTool = useRoiDrawingStore((s) => s.activeTool);
  const setActiveTool = useRoiDrawingStore((s) => s.setActiveTool);
  const meshes = useMeshDesignStore((s) => s.meshes);
  const selectedId = useMeshDesignStore((s) => s.selectedId);
  const message = useMeshDesignStore((s) => s.message);
  const stampShape = useMeshDesignStore((s) => s.stampShape);
  const setStampShape = useMeshDesignStore((s) => s.setStampShape);
  const sculptVariant = useMeshDesignStore((s) => s.sculptVariant);
  const setSculptVariant = useMeshDesignStore((s) => s.setSculptVariant);
  const designApi = useMeshDesignStoreApi();

  const inDesign = interactionMode === "DESIGN";

  // Undo/redo over the sculpt history — DESIGN only, and never from an input.
  // Lives here (always mounted with the viewport) rather than in the sidebar
  // card, which the user may have closed.
  useEffect(() => {
    if (!inDesign) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target as { tagName?: string; isContentEditable?: boolean } | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      event.preventDefault();
      if (event.shiftKey) designApi.getState().redo();
      else designApi.getState().undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inDesign, designApi]);

  // Entering DESIGN lands on a design tool; the annotator's shapes are inert here.
  useEffect(() => {
    if (inDesign && !isDesignTool(activeTool)) setActiveTool("BRUSH");
  }, [inDesign, activeTool, setActiveTool]);

  if (!inDesign) return null;

  const enhancers = applicableEnhancers({ tool: activeTool, displayMode });
  const active = selectedId ? meshes.find((m) => m.id === selectedId) : undefined;

  return (
    <div className="absolute bottom-12 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1">
      {enhancers.map(({ id, ParamsPanel }) => (
        <ParamsPanel key={id} />
      ))}
      {(heldTool === "stamp" || heldTool === "sculpt") && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-md bg-background/80 px-2 py-1 shadow-md backdrop-blur-sm">
          {heldTool === "stamp" ? (
            <ToggleGroup type="single" size="sm" value={stampShape} onValueChange={(v) => v && setStampShape(v as StampShape)}>
              {(["sphere", "box", "ellipsoid"] as const).map((shape) => (
                <ToggleGroupItem key={shape} value={shape} className="h-5 px-2 text-[10px]">
                  {shape}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : (
            <ToggleGroup type="single" size="sm" value={sculptVariant} onValueChange={(v) => v && setSculptVariant(v as SculptVariant)}>
              {(["inflate", "deflate", "smooth"] as const).map((variant) => (
                <ToggleGroupItem key={variant} value={variant} className="h-5 px-2 text-[10px]">
                  {variant}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </div>
      )}
      <span className="text-[10px] text-white/50">
        {message ? (
          <span className="text-amber-300/90">{message}</span>
        ) : heldTool ? (
          <span className={heldTool === "carve" ? "text-rose-300/90" : "text-emerald-300/90"}>
            {designToolById(heldTool)?.hint ?? heldTool}
          </span>
        ) : active ? (
          `Brushing into ${active.name} (${(active.current.indices.length / 3).toLocaleString()} tri) · staging in the Layers sidebar`
        ) : (
          "Navigate freely · hold C to brush · V blob · X carve · S stamp · B sculpt · ? for all"
        )}
      </span>
    </div>
  );
};
