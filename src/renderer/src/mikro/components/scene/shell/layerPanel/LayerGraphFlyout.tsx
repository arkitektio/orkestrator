import { Button } from "@/core/ui/button";
import { X } from "lucide-react";
import { LayerState } from "../../platform/stores/sceneStore";
import { layerDisplayLabel } from "../../platform/layerui/layerIdentity";
import {
  RenderGraphEditor,
  RenderGraphSection,
} from "../../features/volume/rendergraph/RenderNodeEditor";

/**
 * The editing surface for a single layer: the render graph (channels, contrast,
 * colormap, projection — the single rendering truth). Rendered inline inside
 * the layer card, or as a standalone flyout beside the Layers panel.
 *
 * The acquisition metadata anchored to what the layer is showing is NOT here:
 * it is the viewport's bottom-left overlay (`features/annotations/
 * MetadataOverlay.tsx`), which describes the active layer next to the picture
 * instead of folding a copy into every card.
 */
export const LayerGraphFlyout = ({
  layer,
  editor,
  onUpdate: _onUpdate,
  onClose,
  inline = false,
}: {
  layer: LayerState;
  /** Lifted render-graph editing state (shared with the card header's Save). */
  editor: RenderGraphEditor;
  onUpdate: (updated: LayerState) => void;
  onClose: () => void;
  /**
   * When true, render only the editing body (no floating panel chrome or
   * header) so the parent LayerRow can expand in place to reveal it, instead
   * of popping a separate window.
   */
  inline?: boolean;
}) => {
  const label = layerDisplayLabel(layer);

  // The render graph. `min-w-0` so a long colormap or dimension name truncates
  // instead of widening the card.
  const body = (
    <div
      className={
        inline
          ? "flex min-w-0 flex-col gap-2 overflow-y-auto px-2 py-2 text-[10px] text-white/85"
          : "flex min-w-0 flex-col gap-2 overflow-y-auto px-3 py-2 text-[10px] text-white/85"
      }
    >
      <RenderGraphSection editor={editor} layer={layer} />
    </div>
  );

  // Inline mode: just the editing body, so the LayerRow can expand to reveal it.
  if (inline) return body;

  return (
    <div className="flex w-72 max-h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/70 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/90">
          {label}
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="h-6 w-6 p-0 text-white/60 hover:text-white"
          title="Close"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {body}
    </div>
  );
};
