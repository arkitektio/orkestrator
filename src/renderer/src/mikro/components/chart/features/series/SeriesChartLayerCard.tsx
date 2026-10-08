import { Scaling } from "lucide-react";
import { CardFact, CardShell, type LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { formatValue } from "@/core/data/plot/probe/formatValue";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { Button } from "@/core/ui/button";
import { ChartLayerMenu } from "../../platform/edits/ChartLayerMenu";
import { ChartLayerPlacement } from "../../platform/edits/ChartLayerPlacement";
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
    <CardShell
      surface="chart"
      color={layer.color}
      title={layer.label}
      subtitle={[layer.reads, layer.valueUnit].filter(Boolean).join(" · ")}
      hidden={hidden}
      onToggle={() => onToggleHidden(layer.id, !hidden)}
      aside={
        <>
          {layer.series && (
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
      {layer.series && !hidden && (
        <div className="flex flex-col gap-0.5">
          <ChartLayerStyle layer={layer} />
          <CardFact label="Against" value={layer.series.coordinateColumn} />
          <CardFact label="Rows" value={rows ? `${rows}${readout?.loading ? " …" : ""}` : null} />
          <CardFact
            label="Scale"
            value={clim ? `${formatValue(clim.lo)} … ${formatValue(clim.hi)}` : null}
          />
          {readout?.note && <div className="text-[11px] text-muted-foreground">{readout.note}</div>}
          {readout?.error && (
            <div className="truncate text-[11px] text-destructive" title={readout.error}>
              {readout.error}
            </div>
          )}
        </div>
      )}
    </CardShell>
  );
};
