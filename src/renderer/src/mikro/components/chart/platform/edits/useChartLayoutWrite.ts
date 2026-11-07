import { useCallback } from "react";
import { useViewerStoreApi, type LayoutMode } from "@/core/data/plot/stores/viewerStore";
import { reportError } from "@/core/notify";
import { ChartLayout, useUpdateChartMutation } from "@/mikro/api/graphql";
import { useChartStoreApi } from "../stores/chartStore";

const TO_SERVER: Record<LayoutMode, ChartLayout> = {
  STACKED: ChartLayout.Stacked,
  SHARED: ChartLayout.Shared,
  OVERLAY: ChartLayout.Overlay,
};

/**
 * Change how the chart's layers share the screen — and remember it with the
 * chart, so the next person (and the next window) opens it the same way.
 *
 * Optimistic: the mode changes on the click. The answer updates the chart in
 * Apollo's cache, the fold notes the server's layout, and `ChartLayoutSync`
 * finds it equal to what is already on screen. A refusal puts the previous
 * mode back and says why.
 */
export const useChartLayoutWrite = () => {
  const chart = useChartStoreApi();
  const viewer = useViewerStoreApi();
  const [update] = useUpdateChartMutation();

  return useCallback(
    async (layout: LayoutMode) => {
      const previous = viewer.getState().layoutMode;
      if (previous === layout) return;
      viewer.getState().setLayoutMode(layout);
      try {
        await update({ variables: { input: { id: chart.getState().chartId, layout: TO_SERVER[layout] } } });
      } catch (error) {
        viewer.getState().setLayoutMode(previous);
        reportError(error, "Couldn't save the chart's layout");
      }
    },
    [chart, viewer, update],
  );
};
