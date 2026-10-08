import {
  phaseMessageWith,
  PlotScopeGuard,
  usePlotScopeStatus,
} from "@/core/data/plot/scope/plotScope";
import { ChartAnnotationsPanel } from "./features/annotations/ChartAnnotationsPanel";
import { ChartProvider } from "./shell/ChartProvider";
import { CHART_PHASE_WORDING, ChartViewport } from "./shell/ChartViewport";
import { ChartLayerPanel } from "./shell/layerPanel/ChartLayerPanel";

/**
 * The chart renderer's PUBLIC API — what a host renders.
 *
 * The only module that may import `shell/`. A host wraps its page in
 * `Chart.Provider` (so the stores reach the sidebar too), puts
 * `Chart.Viewport` in the content area and the sidebars in the rail.
 */

const SidebarFallback = () => {
  const status = usePlotScopeStatus();
  return (
    <div className="p-4 text-xs text-muted-foreground">
      {phaseMessageWith(status, CHART_PHASE_WORDING)}
    </div>
  );
};

/** The layers tab; says why instead when the scope is not ready. */
const LayersSidebar = () => (
  <PlotScopeGuard fallback={<SidebarFallback />}>
    <ChartLayerPanel />
  </PlotScopeGuard>
);

/** Every drawn mark, by layer. */
const AnnotationsSidebar = () => (
  <PlotScopeGuard fallback={<SidebarFallback />}>
    <ChartAnnotationsPanel />
  </PlotScopeGuard>
);

/** Whether the chart draws any annotation collection — the Annotations tab is shown only then. */
const hasAnnotationLayer = (chart: { layers: readonly { __typename?: string }[] }): boolean =>
  chart.layers.some((layer) => layer.__typename === "AnnotationChartLayer");

export const Chart = {
  Provider: ChartProvider,
  Viewport: ChartViewport,
  LayersSidebar,
  AnnotationsSidebar,
  hasAnnotationLayer,
};
