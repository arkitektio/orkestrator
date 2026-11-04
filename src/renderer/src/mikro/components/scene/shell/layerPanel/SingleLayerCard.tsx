import { useState } from "react";

import { useBrickStore } from "../../features/bricks/store/brickSlice";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { LayerCardHeaderActionsContext, type LayerCardSlotProps } from "../../platform/layerui/layerCardSlot";
import { LAYER_CARDS, renderLayerCard } from "./cardRegistry";

/**
 * One layer's ordinary card, outside the layer panel: the card the panel
 * would draw for it (`LAYER_CARDS`, from the store list its entry reads), with
 * its open state its own rather than the panel's selection.
 *
 * What a float draws for a layer it staged (`platform/layerui/layerCardSlot`):
 * features may not import the shell, so the viewport hands this in.
 */
export const SingleLayerCard = ({ layerId, onRemove, defaultExpanded = true, headerActions }: LayerCardSlotProps) => {
  const sceneLayer = useSceneStore((s) => s.sceneLayers.find((layer) => layer.id === layerId));
  const layerState = useSceneStore((s) => s.layers.find((layer) => layer.id === layerId));
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const fitToLayer = useViewerStore((s) => s.fitToLayer);
  const unplannable = useBrickStore((s) => s.unplannableLayers[layerId]);
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!sceneLayer) return null;
  const entry = LAYER_CARDS[sceneLayer.__typename];
  const layer = entry.source === "layerState" ? layerState : sceneLayer;
  if (!layer) return null;

  return (
    <LayerCardHeaderActionsContext.Provider value={headerActions ?? null}>
      {renderLayerCard(entry, layer, {
        expanded,
        unplannable,
        onSelect: (_id, currentlyExpanded) => setExpanded(!currentlyExpanded),
        onUpdate: updateLayer,
        onFocus: fitToLayer,
        onRemove,
        onClose: () => setExpanded(false),
      })}
    </LayerCardHeaderActionsContext.Provider>
  );
};
