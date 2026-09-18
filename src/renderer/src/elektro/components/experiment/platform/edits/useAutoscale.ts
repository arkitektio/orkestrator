import { useCallback } from "react";
import { useViewerStoreApi } from "../stores/viewerStore";
import { useLayerWrite } from "./useLayerWrite";

/**
 * Rescale one layer (or every layer) to what is on screen, and KEEP that scale:
 * the clims are written back optimistically, so the next visit opens at the
 * same gain. The one autoscale — the card's button and the toolbar's both call
 * it, so they cannot drift.
 */
export const useAutoscale = () => {
  const viewerApi = useViewerStoreApi();
  const write = useLayerWrite();
  return useCallback(
    (layerId?: string) => {
      const changed = viewerApi.getState().autoscale(layerId);
      for (const [id, clim] of Object.entries(changed)) {
        void write(id, { climMin: clim.lo, climMax: clim.hi });
      }
    },
    [viewerApi, write],
  );
};
