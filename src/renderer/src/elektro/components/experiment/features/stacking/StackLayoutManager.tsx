import { StackLayoutManager as PlotStackLayoutManager } from "@/core/data/plot/layout/StackLayoutManager";
import type { StackableLayer } from "@/core/data/plot/layout/stackLayout";
import type { LayerState } from "../../platform/model/layerModel";
import { isLayerHidden } from "../../platform/stores/experimentStore";

/**
 * Traces, spike rasters and event tables take rows. Annotations span the whole
 * stack instead, and a trace without a pyramid has nothing to put in a row.
 */
const rowOf = (layer: LayerState): StackableLayer | null => {
  if (layer.kind === "annotation" || !layer.placeability.drawable || isLayerHidden(layer)) return null;
  if (layer.kind === "trace" && layer.source == null) return null;
  return {
    id: layer.id,
    label: layer.label,
    color: layer.color,
    valueUnit: layer.valueUnit,
    valueDimension: layer.valueDimension,
    channelCount: layer.channelCount,
    channelLabels: layer.channelLabels,
    overlayable: layer.kind === "trace",
  };
};

/** Keeps the row layout in step with what is drawn (the plot engine's manager). */
export const StackLayoutManager = () => <PlotStackLayoutManager<LayerState> rowOf={rowOf} />;
