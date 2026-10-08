import { useDialog } from "@/core/dialogs/registry";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { useMemo, useState, type ReactNode } from "react";
import {
  useChartAddLayerCandidatesQuery,
  useCreateAnnotationChartLayerMutation,
  useCreateSeriesChartLayerMutation,
  useCreateTraceChartLayerMutation,
} from "../api/graphql";
import { chartAxisLabel } from "../chartAxis";
import { lensLabel } from "../lenses";
import {
  chartCandidates,
  type CandidatesInput,
  type TableCandidate,
} from "./addChartLayer/candidates";

const REFETCH = ["GetChart", "ChartAddLayerCandidates"];

const Section = ({ title, hint, children }: { title: string; hint: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-baseline gap-2">
      <span className="text-xs font-medium">{title}</span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </div>
    <div className="flex flex-col">{children}</div>
  </div>
);

const Row = ({
  title,
  detail,
  note,
  action,
}: {
  title: string;
  detail?: string | null;
  note?: string | null;
  action: ReactNode;
}) => (
  <div className="flex items-center gap-2 border-t border-border/40 py-1.5 first:border-t-0">
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-sm">{title}</span>
      {detail && <span className="truncate font-mono text-[11px] text-muted-foreground">{detail}</span>}
      {note && <span className="text-[11px] text-amber-500">{note}</span>}
    </div>
    {action}
  </div>
);

/** A table's value column is the one thing a series must be told. */
const TableRow = ({
  table,
  initial,
  disabled,
  onAdd,
}: {
  table: TableCandidate;
  initial?: string | null;
  disabled: boolean;
  onAdd: (valueColumn: string) => void;
}) => {
  const open = table.valueColumns.filter((c) => !table.drawnColumns.includes(c.name));
  const [column, setColumn] = useState<string | null>(
    (initial && open.some((c) => c.name === initial) ? initial : open[0]?.name) ?? null,
  );
  return (
    <Row
      title={table.name}
      note={
        table.valueColumns.length === 0
          ? "no numeric column to read as the value"
          : open.length === 0
            ? "every value column is already drawn"
            : null
      }
      action={
        open.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Select value={column ?? undefined} onValueChange={setColumn}>
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue placeholder="Value column" />
              </SelectTrigger>
              <SelectContent align="end">
                {open.map((c) => (
                  <SelectItem key={c.name} value={c.name} className="text-xs">
                    {c.unit ? `${c.name} (${c.unit})` : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={disabled || !column} onClick={() => column && onAdd(column)}>
              Add
            </Button>
          </div>
        )
      }
    />
  );
};

/**
 * Add a layer to a chart: an array as a trace, a table column as a series, or
 * an annotation collection's drawn marks.
 *
 * What is offered is what is ALREADY laid in the chart's space, or in a space
 * registered into it — adding a layer writes no registration. Something that is
 * not listed is not placed along this chart's axis yet; that is fixed where
 * registrations are made, not here.
 *
 * `table` preselects one (the "drop a table on a chart" action lands here, so
 * its value column is chosen rather than guessed).
 */
export const AddChartLayerForm = (props: { chart: string; table?: string; valueColumn?: string }) => {
  const { closeDialog } = useDialog();
  const { data, error, loading, refetch } = useChartAddLayerCandidatesQuery({
    variables: { chart: props.chart },
    fetchPolicy: "cache-and-network",
  });
  const [addTrace, trace] = useCreateTraceChartLayerMutation({ refetchQueries: REFETCH });
  const [addSeries, series] = useCreateSeriesChartLayerMutation({ refetchQueries: REFETCH });
  const [addAnnotations, annotations] = useCreateAnnotationChartLayerMutation({ refetchQueries: REFETCH });
  const busy = trace.loading || series.loading || annotations.loading;

  const candidates = useMemo(
    () => (data ? chartCandidates(data.chart as unknown as CandidatesInput) : null),
    [data],
  );

  /** Run one create; the dialog closes on success and says why on a refusal. */
  const add = (what: string, run: () => Promise<unknown>) =>
    void run()
      .then(() => {
        toast.success(`${what} added to the chart`);
        closeDialog();
      })
      .catch((e: unknown) =>
        toast.error(`Could not add ${what.toLowerCase()}: ${e instanceof Error ? e.message : String(e)}`),
      );

  if (error && !data) return <QueryError error={error} onRetry={() => refetch()} />;

  const chart = props.chart;
  const tables = candidates?.tables ?? [];
  // The preselected table first.
  const orderedTables = props.table
    ? [...tables].sort((a, b) => Number(b.id === props.table) - Number(a.id === props.table))
    : tables;

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Add a layer</DialogTitle>
        <DialogDescription>
          {data
            ? `What is laid along ${chartAxisLabel(data.chart.axis)} can be drawn in ${data.chart.name}.`
            : "Looking for what is laid along this chart's axis…"}
        </DialogDescription>
      </DialogHeader>

      {candidates && (
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          {candidates.lenses.length > 0 && (
            <Section title="Arrays" hint="read along the axis, as a trace">
              {candidates.lenses.map((lens) => (
                <Row
                  key={lens.id}
                  title={lens.datasetName}
                  detail={lensLabel(lens)}
                  note={lens.drawn ? "already drawn" : lens.reason}
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || lens.drawn || lens.reason != null}
                      onClick={() =>
                        add("Trace", () => addTrace({ variables: { input: { chart, lens: lens.id } } }))
                      }
                    >
                      Add
                    </Button>
                  }
                />
              ))}
            </Section>
          )}

          {orderedTables.length > 0 && (
            <Section title="Tables" hint="one column against the axis, as a series">
              {orderedTables.map((table) => (
                <TableRow
                  key={table.id}
                  table={table}
                  initial={table.id === props.table ? props.valueColumn : null}
                  disabled={busy}
                  onAdd={(valueColumn) =>
                    add("Series", () =>
                      addSeries({ variables: { input: { chart, tableDataset: table.id, valueColumn } } }),
                    )
                  }
                />
              ))}
            </Section>
          )}

          <Section title="Annotations" hint="marks drawn along the axis">
            {candidates.collections.map((collection) => (
              <Row
                key={collection.id}
                title={collection.name}
                note={collection.drawn ? "already drawn" : null}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || collection.drawn}
                    onClick={() =>
                      add("Annotations", () =>
                        addAnnotations({
                          variables: { input: { chart, annotationCollection: collection.id } },
                        }),
                      )
                    }
                  >
                    Add
                  </Button>
                }
              />
            ))}
            <Row
              title="New drawing layer"
              detail="an empty surface over this chart, to draw marks on"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    add("Drawing layer", () => addAnnotations({ variables: { input: { chart } } }))
                  }
                >
                  Add
                </Button>
              }
            />
          </Section>

          {candidates.lenses.length === 0 && orderedTables.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No array or table is registered into this chart's space yet. Register one along its
              axis and it will be offered here.
            </p>
          )}
        </div>
      )}
      {loading && !data && <div className="h-24 animate-pulse rounded-md bg-muted/40" />}
    </div>
  );
};
