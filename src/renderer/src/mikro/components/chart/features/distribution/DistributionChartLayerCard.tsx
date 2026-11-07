import type { LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { Badge } from "@/core/data/scene/layerui/cardControls";
import {
  useUpdateDistributionChartLayerMutation,
  type UpdateDistributionChartLayerInput,
} from "@/mikro/api/graphql";
import { CARD_SELECT, CardRow } from "../../platform/edits/cardRows";
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
import { formatUnit } from "@/core/util/units";

const BIN_CHOICES = [10, 20, 50, 100];
const AUTO = "auto";

/**
 * What a distribution reads, editable: another table, the column summarised,
 * what it is grouped by (or every row at once), and — for a histogram — how
 * many bins ("auto" lets the server choose).
 */
const DistributionReads = ({ layer }: { layer: ChartLayerState }) => {
  const raw = useRawChartLayer(layer.id, "DistributionChartLayer");
  const [update, { loading }] = useUpdateDistributionChartLayerMutation(RETUNE);
  const retune = useChartLayerRetune(layer.label);
  const lensOf = useTableLens();
  if (!raw) return null;
  const { numeric, group } = tableColumns(raw.tableDataset.columns);
  const bins = raw.bins ?? null;
  const save = (input: Omit<UpdateDistributionChartLayerInput, "id">) =>
    void retune(() => update({ variables: { input: { ...input, id: layer.id } } }));

  return (
    <ChartReads pending={loading}>
      <CardRow label="Table">
        <TablePick
          current={raw.tableDataset}
          disabled={loading}
          refuses={(t) => (t.numericColumns.length === 0 ? "no numeric column to summarise" : null)}
          onPick={(table) =>
            void retune(async () => {
              // The grouping survives only if the new table has that column.
              const nextGroup =
                raw.groupColumn && table.groupColumns.some((c) => c.name === raw.groupColumn)
                  ? raw.groupColumn
                  : null;
              return update({
                variables: {
                  input: {
                    id: layer.id,
                    lens: await lensOf(table),
                    valueColumn: keepOr(raw.valueColumn, table.numericColumns),
                    groupColumn: nextGroup,
                    clearGroupColumn: raw.groupColumn != null && nextGroup == null,
                  },
                },
              });
            })
          }
        />
      </CardRow>
      <CardRow label="Of">
        <ColumnPick
          value={raw.valueColumn}
          columns={numeric}
          disabled={loading}
          title="The column summarised"
          onChange={(valueColumn) => valueColumn && save({ valueColumn })}
        />
      </CardRow>
      <CardRow label="Per">
        <ColumnPick
          value={raw.groupColumn ?? null}
          columns={group}
          none="every row"
          disabled={loading}
          title="One histogram or box per value of this column"
          onChange={(groupColumn) => save(groupColumn ? { groupColumn } : { clearGroupColumn: true })}
        />
      </CardRow>
      {layer.mark === "HISTOGRAM" && (
        <CardRow label="Bins">
          <select
            title="How many bins the histogram has"
            className={`${CARD_SELECT} font-mono`}
            disabled={loading}
            value={bins == null ? AUTO : String(bins)}
            onChange={(event) => {
              const picked = event.currentTarget.value;
              save(picked === AUTO ? { clearBins: true } : { bins: Number(picked) });
            }}
          >
            <option value={AUTO}>auto</option>
            {bins != null && !BIN_CHOICES.includes(bins) && <option value={String(bins)}>{bins}</option>}
            {BIN_CHOICES.map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </CardRow>
      )}
    </ChartReads>
  );
};

/** The card for a distribution layer: the column summarised, what it is grouped by, and how. */
export const DistributionChartLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<ChartLayerState>) => {
  const readout = useViewerStore((s) => s.readouts[layer.id]);
  const values = layer.values?.kind === "distribution" ? layer.values : null;
  return (
    <ChartLayerCardShell
      layer={layer}
      hidden={hidden}
      onToggleHidden={onToggleHidden}
      badges={formatUnit(layer.valueUnit) && <Badge>{formatUnit(layer.valueUnit)}</Badge>}
    >
      <DistributionReads layer={layer} />
      {values && (
        <>
          <ChartLayerStyle layer={layer} />
          <ChartFacts error={readout?.error}>
            <ChartFact
              label="Rows"
              value={readout?.total != null ? `${readout.total.toLocaleString()}${readout.loading ? " …" : ""}` : readout?.loading ? "…" : null}
            />
            {readout?.note && <div className="text-[10px] text-foreground/40">{readout.note}</div>}
            {layer.sourceFailure && <div className="text-[10px] text-amber-300/70">{layer.sourceFailure}</div>}
          </ChartFacts>
        </>
      )}
    </ChartLayerCardShell>
  );
};
