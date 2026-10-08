import { CardShell, type LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { ChartLayerMenu } from "../../platform/edits/ChartLayerMenu";
import { ChartLayerPlacement } from "../../platform/edits/ChartLayerPlacement";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";

/**
 * The card for an annotation layer: one layer per collection. Per-mark styling
 * lives on the annotations themselves, so the layer has nothing to restyle —
 * only to show, hide, reorder and remove.
 */
export const AnnotationChartLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<ChartLayerState>) => (
  <CardShell
    surface="chart"
    color={layer.color}
    title={layer.label}
    subtitle="drawn marks"
    hidden={hidden}
    onToggle={() => onToggleHidden(layer.id, !hidden)}
    aside={<ChartLayerMenu layerId={layer.id} label={layer.label} />}
  >
    <ChartLayerPlacement layer={layer} />
  </CardShell>
);
