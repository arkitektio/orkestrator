import { makeViewerSliceHooks, type ViewerSliceOf } from "@/core/data/plot/stores/viewerStore";
import type { ChartTool } from "../chartTools";

/**
 * The annotation feature's slice of the chart's viewer store: which tool is
 * armed. A scalar, at UI cadence. The shape being drawn is NOT here: it moves
 * at pointer rate, and the drawer keeps it to itself and writes its preview
 * imperatively.
 */
export type ChartAnnotationSlice = {
  annotateTool: ChartTool;
  setAnnotateTool: (tool: ChartTool) => void;
};

export const createChartAnnotationSlice: ViewerSliceOf<ChartAnnotationSlice> = (set, get) => ({
  annotateTool: "POINT",
  setAnnotateTool: (annotateTool) => {
    if (get().annotateTool !== annotateTool) set({ annotateTool });
  },
});

const hooks = makeViewerSliceHooks<ChartAnnotationSlice>();
export const useChartAnnotationStore = hooks.useSliceStore;
export const useChartAnnotationStoreApi = hooks.useSliceStoreApi;
