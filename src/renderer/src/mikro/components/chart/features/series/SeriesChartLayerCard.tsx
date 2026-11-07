import { Scaling } from "lucide-react";
import type { LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { formatValue } from "@/core/data/plot/probe/formatValue";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { Badge } from "@/core/data/scene/layerui/cardControls";
import { Button } from "@/core/ui/button";
import { useUpdateSeriesChartLayerMutation } from "@/mikro/api/graphql";
import { CardRow } from "../../platform/edits/cardRows";
import {
  CHART_CARD_BUTTON,
  ChartFact,
  ChartFacts,
  ChartLayerCardShell,
} from "../../platform/edits/ChartLayerCardShell";
import {
  ChartReads,
  ColumnPick,
  keepOr,
  RETUNE,
  TablePick,
  tableColumns,
  useChartLayerRetune,
  useTableLens,
} from "../../platform/edits/ChartLayerReads";
import { ChartLayerStyle } from "../../platform/edits/ChartLayerStyle";
import { useChartAutoscale } from "../../platform/edits/useChartAutoscale";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";
import { useRawChartLayer } from "../../platform/stores/chartStore";
import { formatUnit } from "@/core/util/units";

/**
 * What a series reads, editable: another table laid along the axis, or another
 * of its value columns. Shown whether or not the layer is drawn — an undrawn
 * layer is exactly the one you may want to point elsewhere.
 */
const SeriesReads = ({ layer }: { layer: ChartLayerState }) => {
  const raw = useRawChartLayer(layer.id, "SeriesChartLayer");
  const [update, { loading }] = useUpdateSeriesChartLayerMutation(RETUNE);
  const retune = useChartLayerRetune(layer.label);
  const lensOf = useTableLens();
  if (!raw) return null;
  const columns = tableColumns(raw.tableDataset.columns);
  return (
    <ChartReads pending={loading}>
      <CardRow label="Table">
        <TablePick
          current={raw.tableDataset}
          disabled={loading}
          refuses={(t) => (t.valueColumns.length === 0 ? "no numeric column to read as the value" : null)}
          onPick={(table) =>
            void retune(async () =>
              update({
                variables: {
                  input: {
                    id: layer.id,
                    lens: await lensOf(table),
                    // The same column when the new table has one by that name.
                    valueColumn: keepOr(raw.valueColumn, table.valueColumns),
                  },
                },
              }),
            )
          }
        />
      </CardRow>
      <CardRow label="Value">
        <ColumnPick
          value={raw.valueColumn}
          columns={columns.value}
          disabled={loading}
          title="The column read as the value"
          onChange={(valueColumn) =>
            valueColumn && void retune(() => update({ variables: { input: { id: layer.id, valueColumn } } }))
          }
        />
      </CardRow>
    </ChartReads>
  );
};

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
      badges={formatUnit(layer.valueUnit) && <Badge>{formatUnit(layer.valueUnit)}</Badge>}
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
      <SeriesReads layer={layer} />
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
