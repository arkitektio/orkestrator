import type { StackableLayer } from "@/core/data/plot/layout/stackLayout";
import { isLayerHidden } from "@/core/data/plot/stores/plotStore";
import type { ChartLayerState } from "../platform/model/chartLayerModel";

/**
 * Traces and series take rows; annotations span the whole stack instead. A
 * layer whose data cannot be read has nothing to put in a row.
 */
export const rowOf = (layer: ChartLayerState): StackableLayer | null => {
  if (!layer.placeability.drawable || isLayerHidden(layer)) return null;
  if (layer.kind === "trace" ? layer.source == null : layer.kind !== "series" || layer.series == null) {
    return null;
  }
  return {
    id: layer.id,
    label: layer.label,
    color: layer.color,
    valueUnit: layer.valueUnit,
    // What may share a row is decided by the fold (`rowGroup`): a series by its
    // unit, a trace by its dataset. Never guessed from a name.
    valueDimension: layer.rowGroup,
    // Every line of a trace along its `seriesAxis` needs a band of its own, or
    // it is not drawn. They are one quantity, so they keep the layer's one scale.
    channelCount: layer.channelCount,
    channelLabels: layer.channelLabels,
    overlayable: true,
  };
};
