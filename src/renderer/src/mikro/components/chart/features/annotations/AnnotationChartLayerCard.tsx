import type { LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { ChartFact, ChartFacts, ChartLayerCardShell } from "../../platform/edits/ChartLayerCardShell";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";

/**
 * The card for an annotation layer: one layer per collection. Per-mark styling
 * lives on the annotations themselves, so the layer has nothing to restyle —
 * only to show, hide, reorder and remove.
 */
export const AnnotationChartLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<ChartLayerState>) => (
  <ChartLayerCardShell layer={layer} hidden={hidden} onToggleHidden={onToggleHidden}>
    <ChartFacts>
      <ChartFact label="Along" value={layer.alongAxis} />
    </ChartFacts>
  </ChartLayerCardShell>
);
