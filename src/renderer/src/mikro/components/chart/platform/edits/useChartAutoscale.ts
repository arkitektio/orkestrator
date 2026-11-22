import { useCallback, useEffect } from "react";
import { useViewerStoreApi } from "@/core/data/plot/stores/viewerStore";
import { useChartStoreApi } from "../stores/chartStore";
import { useChartLayerWrite } from "./useChartLayerWrite";

/**
 * Rescale one layer (or every layer) to the range currently drawn, and store
 * it (`valueMin` / `valueMax`), so the scale survives a reload. The one
 * autoscale: a card's button and the toolbar's both call it, so they cannot drift.
 */
export const useChartAutoscale = () => {
  const viewerApi = useViewerStoreApi();
  const write = useChartLayerWrite();
  return useCallback(
    (layerId?: string) => {
      const changed = viewerApi.getState().autoscale(layerId);
      for (const [id, clim] of Object.entries(changed)) {
        void write(id, { valueMin: clim.lo, valueMax: clim.hi });
      }
    },
    [viewerApi, write],
  );
};

/**
 * Draw each layer over the value range stored for it, where one is: it wins
 * over the range its first data would seed. Mounted once per chart.
 */
export const useStoredChartRanges = () => {
  const chartApi = useChartStoreApi();
  const viewerApi = useViewerStoreApi();
  useEffect(() => {
    const apply = () => {
      const viewer = viewerApi.getState();
      for (const layer of chartApi.getState().layerIndex.values()) {
        const { valueMin, valueMax } = layer.persisted;
        if (valueMin == null || valueMax == null) continue;
        const current = viewer.clims[layer.id];
        if (current && current.lo === valueMin && current.hi === valueMax) continue;
        viewer.setClim(layer.id, { lo: valueMin, hi: valueMax });
      }
    };
    apply();
    return chartApi.subscribe((state, previous) => {
      if (state.layerIndex !== previous.layerIndex) apply();
    });
  }, [chartApi, viewerApi]);
};
