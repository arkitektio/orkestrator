import { memo, type FC } from "react";
import type { LayerRendererProps, LayerRenderers } from "@/core/data/plot/layers/PlotLayerRenderer";
import { SeriesChartLayer } from "../features/series/SeriesChartLayer";
import { TraceChartLayer } from "../features/traces/TraceChartLayer";

/**
 * Which component draws which layer kind. REGISTRY 1 of 3.
 *
 * An exhaustive `Record` over the layer typenames, so a fourth kind is a compile
 * error until it is registered here. `memo()` is applied HERE, once: props are
 * exactly `{ layerId }`, stable for a layer's lifetime, so each layer re-renders
 * only from its own subscriptions (the two-plane contract).
 */

export type ChartLayerTypename = "TraceChartLayer" | "SeriesChartLayer" | "AnnotationChartLayer";

const memoized = (component: FC<LayerRendererProps>) => memo(component) as FC<LayerRendererProps>;

export const LAYER_RENDERERS: Record<ChartLayerTypename, LayerRenderers> = {
  TraceChartLayer: { Layer: memoized(TraceChartLayer) },
  SeriesChartLayer: { Layer: memoized(SeriesChartLayer) },
  // Drawn marks are SVG, laid over the canvas by the viewport
  // (`ChartAnnotationOverlay`) — not a GPU layer.
  AnnotationChartLayer: { Layer: null },
};
