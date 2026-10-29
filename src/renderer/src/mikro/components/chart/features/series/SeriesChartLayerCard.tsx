import { Scaling } from "lucide-react";
import type { LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { formatValue } from "@/core/data/plot/probe/formatValue";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { Badge } from "@/core/data/scene/layerui/cardControls";
import { Button } from "@/core/ui/button";
import {
  CHART_CARD_BUTTON,
  ChartFact,
  ChartFacts,
  ChartLayerCardShell,
} from "../../platform/edits/ChartLayerCardShell";
import { ChartLayerStyle } from "../../platform/edits/ChartLayerStyle";
import { useChartAutoscale } from "../../platform/edits/useChartAutoscale";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";

/**
 * The card for a series layer: which column of which table, against which
 * coordinate, how it is drawn, and how much of the table is on screen.
 */
export const SeriesChartLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<ChartLayerState>) => {
  const readout = useViewerStore((s) => s.readouts[layer.id]);
  const clim = useViewerStore((s) => s.clims[layer.id]);
  const autoscale = useChartAutoscale();

  const rows =
    readout?.total != null
      ? readout.density
        ? `${readout.total.toLocaleString()} · drawn as an envelope`
        : readout.total.toLocaleString()
      : null;

  return (
    <ChartLayerCardShell
      layer={layer}
      hidden={hidden}
      onToggleHidden={onToggleHidden}
      badges={layer.valueUnit && <Badge>{layer.valueUnit}</Badge>}
      actions={
        layer.series && (
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
      {layer.series && (
        <>
          <ChartLayerStyle layer={layer} />
          <ChartFacts error={readout?.error}>
            <ChartFact label="Against" value={layer.series.coordinateColumn} />
            <ChartFact label="Rows" value={rows ? `${rows}${readout?.loading ? " …" : ""}` : null} />
            <ChartFact
              label="Scale"
              value={clim ? `${formatValue(clim.lo)} … ${formatValue(clim.hi)}` : null}
            />
            {readout?.note && <div className="text-[10px] text-foreground/40">{readout.note}</div>}
          </ChartFacts>
        </>
      )}
    </ChartLayerCardShell>
  );
};
