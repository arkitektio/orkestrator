import { Scaling } from "lucide-react";
import { CardFact, CardShell, type LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { formatValue } from "@/core/data/plot/probe/formatValue";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { Button } from "@/core/ui/button";
import { ChartLayerMenu } from "../../platform/edits/ChartLayerMenu";
import { ChartLayerPlacement } from "../../platform/edits/ChartLayerPlacement";
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
    <CardShell
      surface="chart"
      color={layer.color}
      title={layer.label}
      subtitle={layer.reads}
      hidden={hidden}
      onToggle={() => onToggleHidden(layer.id, !hidden)}
      aside={
        <>
          {layer.source && (
            <Button
              size="icon-xs"
              variant="ghost"
              title="Autoscale to what is on screen"
              onClick={() => autoscale(layer.id)}
            >
              <Scaling />
            </Button>
          )}
          <ChartLayerMenu layerId={layer.id} label={layer.label} />
        </>
      }
    >
      <ChartLayerPlacement layer={layer} />
      {layer.source && !hidden && (
        <div className="flex flex-col gap-0.5">
          <ChartLayerStyle layer={layer} />
          <CardFact label="Along" value={layer.alongAxis} />
          <CardFact
            label="Lines"
            value={layer.seriesAxis ? `${layer.channelCount} along ${layer.seriesAxis}` : null}
          />
          <ChannelTags color={layer.color} labels={layer.channelLabels} />
          <CardFact label="Drawn from" value={levelLine} />
          <CardFact
            label="Coverage"
            value={stats ? `${Math.round(stats.coverage * 100)}%${stats.loading ? " …" : ""}` : null}
          />
          <CardFact
            label="Scale"
            value={clim ? `${formatValue(clim.lo)} … ${formatValue(clim.hi)}` : null}
          />
          {stats?.error && (
            <div className="truncate text-[11px] text-destructive" title={stats.error}>
              {stats.error}
            </div>
          )}
        </div>
      )}
    </CardShell>
  );
};
