import { Scaling } from "lucide-react";
import type { LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { formatValue } from "@/core/data/plot/probe/formatValue";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { CardSection } from "@/core/data/scene/layerui/cardControls";
import { Button } from "@/core/ui/button";
import {
  CHART_CARD_BUTTON,
  ChartFact,
  ChartFacts,
  ChartLayerCardShell,
} from "../../platform/edits/ChartLayerCardShell";
import { ChartLayerStyle } from "../../platform/edits/ChartLayerStyle";
import { useChartAutoscale } from "../../platform/edits/useChartAutoscale";
import { ChannelTags } from "../../platform/lines/ChannelTags";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";

/**
 * The card for a trace layer: what it reads, how it is drawn, and where it is
 * in its pyramid.
 *
 * A trace through a large array can be expensive to read — one position along
 * the chart's axis may sit in a whole chunk of the others — so the card says
 * which level is drawn and how much of the window is covered. "Why is this
 * blocky?" and "why is part of it missing?" are both answered by one line here.
 */
export const TraceChartLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<ChartLayerState>) => {
  const stats = useViewerStore((s) => s.stats[layer.id]);
  const clim = useViewerStore((s) => s.clims[layer.id]);
  const autoscale = useChartAutoscale();

  const levelLine =
    stats && stats.levelIndex >= 0
      ? stats.levelIndex === 0
        ? `raw · ${stats.levelCount} level${stats.levelCount === 1 ? "" : "s"}`
        : `level ${stats.level} of ${stats.levelCount}`
      : null;

  return (
    <ChartLayerCardShell
      layer={layer}
      hidden={hidden}
      onToggleHidden={onToggleHidden}
      actions={
        layer.source && (
          <Button
            size="icon"
            variant="ghost"
            className={CHART_CARD_BUTTON}
            title="Autoscale to what is on screen"
            onClick={() => autoscale(layer.id)}
          >
            <Scaling className="h-3 w-3" />
          </Button>
        )
      }
    >
      {layer.source && (
        <>
          <ChartLayerStyle layer={layer} />
          {layer.channelLabels.length > 1 && (
            <CardSection title={layer.seriesAxis ? `lines · along ${layer.seriesAxis}` : "lines"}>
              <ChannelTags color={layer.color} labels={layer.channelLabels} />
            </CardSection>
          )}
          <ChartFacts error={stats?.error}>
            <ChartFact label="Along" value={layer.alongAxis} />
            <ChartFact
              label="Lines"
              value={layer.seriesAxis ? `${layer.channelCount} along ${layer.seriesAxis}` : null}
            />
            <ChartFact label="Drawn from" value={levelLine} />
            <ChartFact
              label="Coverage"
              value={stats ? `${Math.round(stats.coverage * 100)}%${stats.loading ? " …" : ""}` : null}
            />
            <ChartFact
              label="Scale"
              value={clim ? `${formatValue(clim.lo)} … ${formatValue(clim.hi)}` : null}
            />
          </ChartFacts>
        </>
      )}
    </ChartLayerCardShell>
  );
};
