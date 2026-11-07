import { Scaling } from "lucide-react";
import { useMemo, useState } from "react";
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
import { BindingRow, BindingSection } from "../../platform/edits/ColumnBinding";
import { useChartLayerRetune } from "../../platform/edits/useChartLayerRetune";
import { isNumericColumn, isValueColumn } from "@/mikro/lib/tables/columnKinds";
import { useRawChartLayer } from "../../platform/stores/chartStore";
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
  const raw = useRawChartLayer(layer.id, "SeriesChartLayer");
  const retune = useChartLayerRetune();
  const [busy, setBusy] = useState(false);
  // A measurement, not the coordinate the table is laid along: what the server accepts as a value.
  const valueColumns = useMemo(
    () =>
      (raw?.tableDataset.columns ?? [])
        .filter((c) => !c.axisType && isValueColumn(c) && isNumericColumn(c))
        .map((c) => ({ name: c.name, unit: c.unit ?? null })),
    [raw],
  );

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
      <BindingSection>
        <BindingRow
          label="Value"
          value={raw?.valueColumn ?? null}
          columns={valueColumns}
          disabled={busy}
          onCommit={async (valueColumn) => {
            if (!valueColumn) return;
            setBusy(true);
            await retune.series(layer.label, { id: layer.id, valueColumn });
            setBusy(false);
          }}
        />
      </BindingSection>
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
