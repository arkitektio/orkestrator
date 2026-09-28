import { memo } from "react";
import { Collapsible, CollapsibleContent } from "@/core/ui/collapsible";

import { perfMonitor } from "../../platform/perf/perfMonitor";
import type { LayerState } from "../../platform/stores/sceneStore";
import { useRenderGraphEditor } from "../../features/volume/rendergraph/RenderNodeEditor";
import { LayerGraphFlyout } from "./LayerGraphFlyout";
import { layerCardShellClasses } from "@/core/data/scene/layerui/cardControls";
import { LayerRow } from "./LayerRow";
import { UnplannableNotice } from "./UnplannableNotice";
import { type LayerCardProps } from "./cardShell";

/**
 * The card for a layer whose rendering IS a render graph — an `ImageLayer`.
 *
 * Extracted verbatim from `LayerControlPanel`, where it was the inline
 * `LayerCard`, when the panel's five hard-coded per-`__typename` arrays became
 * `cardRegistry.tsx`. What makes it image-specific is the one thing the
 * fixed-shape kinds have nothing to say to: it mounts the render-graph editor.
 */
export const ImageLayerCard = memo(function ImageLayerCard({
  layer,
  expanded,
  unplannable,
  onSelect,
  onUpdate,
  onFocus,
  onRemove,
  onClose,
}: LayerCardProps<LayerState>) {
  perfMonitor.countRender("ImageLayerCard"); // no-op unless a perf recording is armed
  const editor = useRenderGraphEditor(layer);
  // Adapt the stable id-parameterized panel handlers to the zero-arg forms the
  // children expect. Created inside the memoized card, so they only churn when
  // the card actually re-renders.
  const handleSelect = () => onSelect(layer.id, expanded);
  const handleRemove = () => onRemove(layer.id);
  return (
    <Collapsible
      open={expanded}
      className={layerCardShellClasses(expanded, layer.visible === false)}
    >
      <LayerRow
        embedded
        layer={layer}
        isSelected={expanded}
        graphDirty={editor.dirty}
        savingGraph={editor.loading}
        onSaveGraph={editor.save}
        onSelect={handleSelect}
        onUpdate={onUpdate}
        onFocus={onFocus}
        onRemove={handleRemove}
      />
      {unplannable && <UnplannableNotice layer={layer} info={unplannable} />}
      {/* NO open/close animation: the collapsible height animation forced
          layout + paint of the whole editor subtree on every toggle and kept
          animating during store-driven re-renders — the cards snap instead. */}
      <CollapsibleContent className="overflow-hidden">
        <div className="border-t border-white/10">
          <LayerGraphFlyout
            inline
            editor={editor}
            layer={layer}
            onUpdate={onUpdate}
            onClose={onClose}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
