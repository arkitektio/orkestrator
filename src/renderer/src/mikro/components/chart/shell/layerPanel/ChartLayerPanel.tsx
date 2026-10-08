import { LayerControlPanel } from "@/core/data/plot/layerui/LayerControlPanel";
import { useDialog } from "@/core/dialogs/registry";
import { useChartLayerWrite } from "../../platform/edits/useChartLayerWrite";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";
import { useChartStore } from "../../platform/stores/chartStore";
import { LAYER_CARDS } from "./cardRegistry";

/**
 * Every layer of the chart, as cards, in draw order: the plot engine's panel
 * (ordering, the visibility toggle) over the chart's card registry, its
 * optimistic persisted write, and its add-layer dialog.
 */
export const ChartLayerPanel = () => {
  const chartId = useChartStore((s) => s.chartId);
  const write = useChartLayerWrite();
  const { openDialog } = useDialog();
  return (
    <LayerControlPanel<ChartLayerState>
      cards={LAYER_CARDS}
      write={write}
      onAddLayer={() => openDialog("addchartlayer", { chart: chartId }, { size: "medium" })}
      emptyText="This chart has no layers."
      addTitle="Draw an array, a table column or annotations"
    />
  );
};
