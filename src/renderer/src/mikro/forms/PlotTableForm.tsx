import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { MikroChart } from "@/core/linkers";
import { DialogBody, DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { ChartLayerKind, ChartMark, GetChartsDocument, useCreateTablePlotMutation, useGetTableDatasetQuery } from "../api/graphql";
import { isGroupColumn, isNumericColumn } from "./addChartLayer/candidates";
import { PlotColumnsPicker, type PlotSpec } from "./plotColumns/PlotColumnsPicker";

/**
 * Plot a table: a new chart of values over the table's own space, with one
 * layer of its columns -- a scatter, or a distribution per group -- made in one
 * call. `lens` plots a window of the table (a gate) instead of all of it.
 */
export const PlotTableForm = (props: { table: string; lens?: string }) => {
  const navigate = useNavigate();
  const { data, error, refetch } = useGetTableDatasetQuery({ variables: { id: props.table } });
  const [plot, { loading }] = useCreateTablePlotMutation({ refetchQueries: [GetChartsDocument, "GetTableDataset"] });
  const { submit } = useDialogSubmit(
    async (spec: PlotSpec) => {
      const result = await plot({
        variables: {
          input:
            spec.kind === "POINTS"
              ? { table: props.table, lens: props.lens ?? null, kind: ChartLayerKind.Points, xColumn: spec.x, yColumn: spec.y, zColumn: spec.z, mark: spec.mark as ChartMark }
              : {
                  table: props.table,
                  lens: props.lens ?? null,
                  kind: ChartLayerKind.Distribution,
                  xColumn: spec.value,
                  groupColumn: spec.group,
                  bins: spec.bins,
                  mark: spec.mark as ChartMark,
                },
        },
      });
      const chart = result.data?.createTablePlot;
      if (chart) navigate(MikroChart.linkBuilder(chart.id));
    },
    { errorTitle: "Couldn't plot the table" },
  );

  const columns = useMemo(() => data?.tableDataset.columns ?? [], [data]);
  const numeric = useMemo(
    // Coordinates are values here too: a localization table's x against y is a scatter.
    () => columns.filter(isNumericColumn).map((c) => ({ name: c.name, unit: c.unit ?? null })),
    [columns],
  );
  const groups = useMemo(() => columns.filter(isGroupColumn).map((c) => ({ name: c.name, unit: c.unit ?? null })), [columns]);

  if (error && !data) return <QueryError error={error} onRetry={() => refetch()} />;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Plot {data?.tableDataset.name ?? "table"}</DialogTitle>
        <DialogDescription>
          A chart of values: each row drawn at the values of its columns. Its rows stay the table’s; nothing is copied.
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        {data ? (
          <PlotColumnsPicker numeric={numeric} groups={groups} busy={loading} submitLabel="Plot" onSubmit={(spec) => void submit(spec)} />
        ) : (
          <div className="text-xs text-muted-foreground">Reading the table’s columns…</div>
        )}
      </DialogBody>
    </div>
  );
};
