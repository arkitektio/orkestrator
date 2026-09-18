import { useMemo } from "react";
import {
  drawnLayersKey,
  isLayerHidden,
  useExperimentStore,
  useExperimentStoreApi,
} from "../platform/stores/experimentStore";
import { LAYER_RENDERERS, isLayerTypename } from "./layerRegistry";

/**
 * Dispatches every drawn layer to its component — and is the ONE place placement
 * is gated (R1). A layer that is not drawable never mounts, so no layer kind has
 * to re-check.
 *
 * Textbook two-plane: it subscribes to one SCALAR key (`drawnLayersKey`) and reads
 * the array through `getState()` in a memo keyed on it — the idiom mikro's
 * `LayerRenderer` uses. Subscribing to `layers` itself would re-render this on
 * every reconcile, including ones that change nothing it draws.
 */
export const LayerRenderer = () => {
  const key = useExperimentStore(drawnLayersKey);
  const api = useExperimentStoreApi();

  const drawn = useMemo(() => {
    const state = api.getState();
    return state.layers.filter((layer) => layer.placeability.drawable && !isLayerHidden(layer));
    // The key STANDS FOR the array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, api]);

  return (
    <group>
      {drawn.map((layer) => {
        if (!isLayerTypename(layer.typename)) return null;
        const Layer = LAYER_RENDERERS[layer.typename].Layer;
        return Layer ? <Layer key={layer.id} layerId={layer.id} /> : null;
      })}
    </group>
  );
};
