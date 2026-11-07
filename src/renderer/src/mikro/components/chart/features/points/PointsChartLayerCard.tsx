import type { LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { Badge } from "@/core/data/scene/layerui/cardControls";
import { useUpdatePointsChartLayerMutation, type UpdatePointsChartLayerInput } from "@/mikro/api/graphql";
import { CardRow } from "../../platform/edits/cardRows";
import { ChartFact, ChartFacts, ChartLayerCardShell } from "../../platform/edits/ChartLayerCardShell";
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
import type { ChartLayerState } from "../../platform/model/chartLayerModel";
import { useRawChartLayer } from "../../platform/stores/chartStore";

/**
 * What a scatter reads, editable: another table whose rows live in the chart's
 * world, its x and y, and an optional colour column. x, y and colour are
 * three different columns: each picker leaves out the other two.
 */
const PointsReads = ({ layer }: { layer: ChartLayerState }) => {
  const raw = useRawChartLayer(layer.id, "PointsChartLayer");
  const [update, { loading }] = useUpdatePointsChartLayerMutation(RETUNE);
  const retune = useChartLayerRetune(layer.label);
  const lensOf = useTableLens();
  if (!raw) return null;
  const { numeric } = tableColumns(raw.tableDataset.columns);
  const { xColumn: x, yColumn: y, zColumn: z } = raw;
  const save = (input: Omit<UpdatePointsChartLayerInput, "id">) =>
    void retune(() => update({ variables: { input: { ...input, id: layer.id } } }));

  return (
    <ChartReads pending={loading}>
      <CardRow label="Table">
        <TablePick
          current={raw.tableDataset}
          disabled={loading}
          refuses={(t) => (t.numericColumns.length < 2 ? "fewer than two numeric columns" : null)}
          onPick={(table) =>
            void retune(async () => {
              // Keep each column the new table also has; fill the rest in order.
              const nextX = keepOr(x, table.numericColumns);
              const nextY = keepOr(y, table.numericColumns.filter((c) => c.name !== nextX));
              const nextZ =
                z && z !== nextX && z !== nextY && table.numericColumns.some((c) => c.name === z) ? z : null;
              return update({
                variables: {
                  input: {
                    id: layer.id,
                    lens: await lensOf(table),
                    xColumn: nextX,
                    yColumn: nextY,
                    zColumn: nextZ,
                    clearZColumn: z != null && nextZ == null,
                  },
                },
              });
            })
          }
        />
      </CardRow>
      <CardRow label="x">
        <ColumnPick
          value={x}
          columns={numeric.filter((c) => c.name !== y && c.name !== z)}
          disabled={loading}
          title="The column drawn across"
          onChange={(xColumn) => xColumn && save({ xColumn })}
        />
      </CardRow>
      <CardRow label="y">
        <ColumnPick
          value={y}
          columns={numeric.filter((c) => c.name !== x && c.name !== z)}
          disabled={loading}
          title="The column drawn up"
          onChange={(yColumn) => yColumn && save({ yColumn })}
        />
      </CardRow>
      <CardRow label="Colour">
        <ColumnPick
          value={z ?? null}
          columns={numeric.filter((c) => c.name !== x && c.name !== y)}
          none="none"
          disabled={loading}
          title="A third column, drawn as each point's colour"
          onChange={(zColumn) => save(zColumn ? { zColumn } : { clearZColumn: true })}
        />
      </CardRow>
    </ChartReads>
  );
};

/** The card for a points layer: which columns are x, y and colour, how it is drawn, how many rows. */
export const PointsChartLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<ChartLayerState>) => {
  const readout = useViewerStore((s) => s.readouts[layer.id]);
  const values = layer.values?.kind === "points" ? layer.values : null;
  const rows =
    readout?.total != null
      ? readout.count != null && readout.count < readout.total
        ? `${readout.count.toLocaleString()} of ${readout.total.toLocaleString()}`
        : readout.total.toLocaleString()
      : null;
  return (
    <ChartLayerCardShell
      layer={layer}
      hidden={hidden}
      onToggleHidden={onToggleHidden}
      badges={values?.filters.length ? <Badge>{values.filters.length} filter{values.filters.length === 1 ? "" : "s"}</Badge> : null}
    >
      <PointsReads layer={layer} />
      {values && (
        <>
          <ChartLayerStyle layer={layer} />
          <ChartFacts error={readout?.error}>
            <ChartFact label="Rows" value={rows ? `${rows}${readout?.loading ? " …" : ""}` : readout?.loading ? "…" : null} />
            {readout?.note && <div className="text-[10px] text-foreground/40">{readout.note}</div>}
            {layer.sourceFailure && <div className="text-[10px] text-amber-300/70">{layer.sourceFailure}</div>}
          </ChartFacts>
        </>
      )}
    </ChartLayerCardShell>
  );
};
