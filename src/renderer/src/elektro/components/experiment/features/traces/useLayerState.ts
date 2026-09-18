import { useExperimentStore } from "../../platform/stores/experimentStore";
import type { LayerState } from "../../platform/model/layerModel";

/**
 * One layer's normalized state, by id.
 *
 * `LayerState` objects are re-created on a fold or an edit, and the provider
 * preserves a layer's `source` across folds that did not move its structure, so
 * a consumer keyed on `source` (the tile pipeline) survives content edits.
 */
export const useLayerState = (layerId: string): LayerState | undefined =>
  useExperimentStore((s) => s.layers.find((l) => l.id === layerId));
