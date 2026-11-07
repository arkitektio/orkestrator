import { useLayoutEffect } from "react";
import type { ViewerStoreApi } from "@/core/data/plot/stores/viewerStore";
import type { ChartStoreApi } from "../platform/stores/chartStore";

/**
 * Puts the chart's own layout on screen: the viewer's `layoutMode` follows the
 * layout the SERVER holds (`ChartStoreState.layout`).
 *
 * Once when the scope is built — in a layout effect, so the first paint is
 * already in the chart's layout rather than flashing the engine's default —
 * and then only when the server's value CHANGES. A refetch that carries the
 * same layout (any layer edit refetches the chart) is no change, so it never
 * undoes a toggle whose write is still in flight. The toggle itself writes
 * through `useChartLayoutWrite`.
 *
 * Headless; mounted beside the system host, where both stores exist.
 */
export const ChartLayoutSync = ({ chart, viewer }: { chart: ChartStoreApi; viewer: ViewerStoreApi }) => {
  useLayoutEffect(() => {
    viewer.getState().setLayoutMode(chart.getState().layout);
    return chart.subscribe((state, previous) => {
      if (state.layout !== previous.layout) viewer.getState().setLayoutMode(state.layout);
    });
  }, [chart, viewer]);
  return null;
};
