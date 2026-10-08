import { useCallback } from "react";
import { useViewerStoreApi } from "@/core/data/plot/stores/viewerStore";

/**
 * Rescale one layer (or every layer) to the range currently drawn.
 *
 * Session-only: a chart layer persists no value range (the schema has none), so
 * the scale holds until the page is left. The one autoscale — a card's button
 * and the toolbar's both call it, so they cannot drift.
 */
export const useChartAutoscale = () => {
  const viewerApi = useViewerStoreApi();
  return useCallback((layerId?: string) => void viewerApi.getState().autoscale(layerId), [viewerApi]);
};
