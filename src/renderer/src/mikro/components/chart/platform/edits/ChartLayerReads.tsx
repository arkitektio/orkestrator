import { Loader2 } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CardSection } from "@/core/data/scene/layerui/cardControls";
import { reportError } from "@/core/notify";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { useChartAddLayerCandidatesQuery } from "@/mikro/api/graphql";
import {
  chartCandidates,
  isGroupColumn,
  isNumericColumn,
  isValueColumn,
  type CandidatesInput,
  type LensCandidate,
  type TableCandidate,
} from "@/mikro/forms/addChartLayer/candidates";
import { lensLabel } from "@/mikro/lenses";
import { useLensRegistry } from "@/mikro/lib/lenses/useLensRegistry";
import { useChartStore } from "../stores/chartStore";
import { ColumnCombobox } from "@/mikro/components/columns/ColumnCombobox";
import { CARD_SELECT } from "./cardRows";

/**
 * What a layer READS, edited on its card: its lens (another array, another
 * table) and, for a table, the columns, the grouping and the bins.
 *
 * The scene cards' dialect — a section of small selects that save on change,
 * no "save" button — over the per-kind updates (`updateTraceChartLayer`,
 * `updateSeriesChartLayer`, `updatePointsChartLayer`,
 * `updateDistributionChartLayer`).
 *
 * Unlike a restyle (`useChartLayerWrite`) this is NOT optimistic: every one of
 * these moves the layer's structural key (`chartStructure.layerStructureKey`),
 * so the layer rereads either way, and a new lens is a new placement that only
 * the server can compute. The write refetches `GetChart` and the section shows
 * a spinner until the chart has the answer.
 *
 * What is offered is what the add-layer dialog would offer (the same
 * `candidates.ts` rules); the server still decides, and refuses in its own
 * words.
 */

/** The mutation options every retune shares: reread the chart, then settle. */
export const RETUNE = {
  refetchQueries: ["GetChart", "ChartAddLayerCandidates"],
  awaitRefetchQueries: true,
};

/**
 * Run one retune; a refusal is reported (the card has no footer to show it
 * in) and the selects stay on what the server still holds.
 */
export const useChartLayerRetune = (label: string) =>
  useCallback(
    async (run: () => Promise<unknown>) => {
      try {
        await run();
      } catch (error) {
        reportError(error, `Couldn't change what ${label} reads`);
      }
    },
    [label],
  );

/** A table's whole lens: what a layer over all of it reads through. */
export const useTableLens = () => {
  const registry = useLensRegistry();
  return useCallback(
    async (table: TableCandidate): Promise<string> =>
      table.wholeLens ?? (await registry.ensureWholeLens({ tableDataset: table.id })),
    [registry],
  );
};

// --- columns -----------------------------------------------------------------

export type TableColumnLike = {
  name: string;
  unit?: string | null;
  dtype?: string | null;
  role?: string | null;
  axisType?: string | null;
};

export type PickColumn = { name: string; unit: string | null };

const columnsWhere = (
  columns: readonly TableColumnLike[],
  test: (column: TableColumnLike) => boolean,
): PickColumn[] => columns.filter(test).map((c) => ({ name: c.name, unit: c.unit ?? null }));

/** A layer's table, sorted by what each column may be: the dialog's rules. */
export const tableColumns = (columns: readonly TableColumnLike[] | null | undefined) => {
  const all = columns ?? [];
  return {
    value: columnsWhere(all, isValueColumn),
    numeric: columnsWhere(all, isNumericColumn),
    group: columnsWhere(all, isGroupColumn),
  };
};

/** `name` when `list` has it — a column kept across a table switch — else the `index`th. */
export const keepOr = (
  name: string | null | undefined,
  list: readonly PickColumn[],
  index = 0,
): string | null => (name && list.some((c) => c.name === name) ? name : (list[index]?.name ?? null));

/**
 * One column, picked from `columns` — the shared column combobox, in a card's
 * compact size. With `none` it may also be unset (the text says what unset
 * means: "every row", "none").
 */
export const ColumnPick = ({
  value,
  columns,
  onChange,
  none,
  disabled,
  title,
}: {
  value: string | null;
  columns: readonly PickColumn[];
  onChange: (value: string | null) => void;
  none?: string;
  disabled?: boolean;
  title?: string;
}) => (
  <ColumnCombobox
    value={value}
    columns={columns}
    onChange={onChange}
    none={none}
    disabled={disabled}
    title={title}
    size="card"
  />
);

// --- sources -----------------------------------------------------------------

/**
 * What else the chart could read — asked only while a picker is open, so a
 * folded or untouched card costs no query.
 */
const useChartCandidates = (open: boolean) => {
  const chart = useChartStore((s) => s.chartId);
  const { data, loading } = useChartAddLayerCandidatesQuery({
    variables: { chart },
    skip: !open,
    fetchPolicy: "cache-and-network",
  });
  const candidates = useMemo(
    () => (data ? chartCandidates(data.chart as unknown as CandidatesInput) : null),
    [data],
  );
  return { candidates, loading };
};

type SourceOption = { value: string; label: string; detail?: string; refused?: string | null };

const SourcePick = ({
  current,
  options,
  loading,
  open,
  onOpenChange,
  onPick,
  disabled,
  title,
}: {
  current: { value: string; label: string };
  options: readonly SourceOption[];
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (value: string) => void;
  disabled?: boolean;
  title: string;
}) => (
  <Select
    open={open}
    onOpenChange={onOpenChange}
    value={current.value}
    disabled={disabled}
    onValueChange={(value) => value !== current.value && onPick(value)}
  >
    <SelectTrigger className={`${CARD_SELECT} w-40`} title={title}>
      <SelectValue>{current.label}</SelectValue>
    </SelectTrigger>
    <SelectContent align="end">
      {!options.some((o) => o.value === current.value) && (
        <SelectItem value={current.value} className="text-xs">
          {current.label}
        </SelectItem>
      )}
      {options.map((o) => {
        // What the layer reads now is never refused: it is where it stands.
        const refused = o.value === current.value ? null : (o.refused ?? null);
        return (
          <SelectItem
            key={o.value}
            value={o.value}
            disabled={refused != null}
            className="text-xs"
            title={refused ?? undefined}
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{o.label}</span>
              {refused ? (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">{refused}</span>
              ) : (
                o.detail && (
                  <span className="truncate font-mono text-[10px] text-muted-foreground">{o.detail}</span>
                )
              )}
            </span>
          </SelectItem>
        );
      })}
      {loading && options.length === 0 && (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Looking for what else is here…</div>
      )}
    </SelectContent>
  </Select>
);

/**
 * Another table for a series, points or a distribution: the tables whose rows
 * are laid in the chart's world. `refuses` says why one cannot be read by this
 * kind (null when it can); the pick hands the candidate, columns and all, so
 * the card can carry its columns over.
 */
export const TablePick = ({
  current,
  refuses,
  onPick,
  disabled,
}: {
  current: { id: string; name?: string | null };
  refuses: (table: TableCandidate) => string | null;
  onPick: (table: TableCandidate) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const { candidates, loading } = useChartCandidates(open);
  const tables = candidates?.tables ?? [];
  return (
    <SourcePick
      current={{ value: current.id, label: current.name ?? `Table ${current.id}` }}
      options={tables.map((t) => ({ value: t.id, label: t.name, refused: refuses(t) }))}
      loading={loading}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      title="Read another table's rows"
      onPick={(id) => {
        const table = tables.find((t) => t.id === id);
        if (table) onPick(table);
      }}
    />
  );
};

/** Another array lens for a trace: what is laid along the chart's axis. */
export const LensPick = ({
  current,
  onPick,
  disabled,
}: {
  current: { id: string; label: string };
  onPick: (lens: LensCandidate) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const { candidates, loading } = useChartCandidates(open);
  const lenses = candidates?.lenses ?? [];
  return (
    <SourcePick
      current={{ value: current.id, label: current.label }}
      options={lenses.map((l) => ({
        value: l.id,
        label: l.datasetName,
        detail: lensLabel(l),
        refused: l.reason ?? (l.drawn ? "already drawn in this chart" : null),
      }))}
      loading={loading}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      title="Draw another array along the axis"
      onPick={(id) => {
        const lens = lenses.find((l) => l.id === id);
        if (lens) onPick(lens);
      }}
    />
  );
};

/** The section the pickers sit in: a spinner while the chart rereads. */
export const ChartReads = ({ pending, children }: { pending: boolean; children: ReactNode }) => (
  <CardSection
    title="reads"
    action={pending ? <Loader2 className="h-3 w-3 animate-spin text-foreground/40" /> : undefined}
  >
    <div className="flex flex-col gap-1">{children}</div>
  </CardSection>
);
