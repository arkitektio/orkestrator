import type { ComponentType } from "react";
import type { LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { AnnotationChartLayerCard } from "../../features/annotations/AnnotationChartLayerCard";
import { SeriesChartLayerCard } from "../../features/series/SeriesChartLayerCard";
import { TraceChartLayerCard } from "../../features/traces/TraceChartLayerCard";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";
import type { ChartLayerTypename } from "../layerRegistry";

/**
 * Which card shows which layer kind. REGISTRY 2 of 3.
 *
 * Exhaustive over the typenames, so a new kind is a compile error here as well
 * as in `layerRegistry.ts`. Cards appear in the layers' own `order` — the draw
 * order, which the panel edits.
 */
export const LAYER_CARDS: Record<
  ChartLayerTypename,
  { Card: ComponentType<LayerCardProps<ChartLayerState>> }
> = {
  TraceChartLayer: { Card: TraceChartLayerCard },
  SeriesChartLayer: { Card: SeriesChartLayerCard },
  AnnotationChartLayer: { Card: AnnotationChartLayerCard },
};
