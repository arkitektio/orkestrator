import { Axis3d } from "lucide-react";
import * as React from "react";

import { HoverRow, HoverSectionLabel } from "@/components/hover/HoverShell";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { describeColumnStatsError, type ColumnStatsFailure } from "@/lib/parquet/columnStats";
import { HistogramSparkline } from "@/lib/scene/metadata/MetadataChrome";
import { cn } from "@/lib/utils";
import { MikroTableDataset } from "@/linkers";
import {
  ColumnControl,
  ColumnRole,
  type TableDatasetColumnFragment,
  type TableDatasetFragment,
} from "@/mikro/api/graphql";
import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";

import {
  readColumnValueStatsCached,
  type ColumnValueStats,
} from "./columnInfoStats";
import {
  AXIS_TYPE_NOTES,
  COLUMN_ROLE_NOTES,
  axisTypeLabel,
  columnRoleLabel,
} from "./columnNotes";

/**
 * Everything about one column, behind a click on its name.
 *
 * The header and the rail used to say the same three things about every
 * column at once — role badge, dtype, unit — which made a wide table a wall
 * of badges and still left out what the schema actually knows: the column's
 * description, what its role MEANS, which table it references, and what the
 * values look like. All of that lives here now, read on open, so the surfaces
 * that list columns can be one quiet line each.
 *
 * One content, two triggers: the table header and the Info rail both wrap
 * their own name element in `ColumnInfoPopover`, so a column reads the same
 * wherever it is opened from. Only the header passes `actions` — sorting and
 * hiding are things the grid does, not the column.
 */

type Column = TableDatasetColumnFragment;
type Store = TableDatasetFragment["store"];

export type SortDirection = false | "asc" | "desc";

export type ColumnInfoActions = {
  sortDirection: SortDirection;
  onSort: (direction: SortDirection) => void;
  onHide: () => void;
};

/** The one glyph a COORDINATE column keeps outside the popover, so the axes
 * of the table stay tellable from its measurements at a glance. */
export const ColumnAxisGlyph = ({ column }: { column: Pick<Column, "role"> }) =>
  column.role === ColumnRole.Coordinate ? (
    <Axis3d
      className="h-3 w-3 shrink-0 text-muted-foreground"
      aria-label="coordinate axis"
    />
  ) : null;

const statFormat = new Intl.NumberFormat(undefined, {
  maximumSignificantDigits: 6,
});

const formatStat = (value: number) => statFormat.format(value);

type ValuesState =
  | { status: "loading" }
  | { status: "ready"; stats: ColumnValueStats }
  | { status: "error"; failure: ColumnStatsFailure };

const ColumnValues = ({ column, store }: { column: Column; store: Store }) => {
  const service = useAttributeServiceOrNull();
  const [state, setState] = React.useState<ValuesState>({ status: "loading" });

  useEffectOnColumn(service, store, column, setState);

  if (!service) {
    return (
      <p className="text-muted-foreground">
        Values are unavailable until the data layer is reachable.
      </p>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p className="text-muted-foreground" title={state.failure.detail}>
        Could not read the values: {state.failure.summary}.
      </p>
    );
  }

  const { stats } = state;
  const nulls = stats.summary ? stats.summary.rows - stats.summary.nonNull : null;

  return (
    <div className="flex flex-col gap-1">
      {stats.summary && (
        <HoverRow label="Rows" value={formatStat(stats.summary.rows)} />
      )}
      {nulls !== null && nulls > 0 && (
        <HoverRow label="Empty" value={formatStat(nulls)} />
      )}
      {stats.control === ColumnControl.Measure ? (
        stats.domain ? (
          <>
            <HoverRow label="Min" value={formatStat(stats.domain.min)} />
            <HoverRow label="Max" value={formatStat(stats.domain.max)} />
            {stats.histogram && (
              <HistogramSparkline histogram={stats.histogram} tone="surface" />
            )}
          </>
        ) : (
          <p className="text-muted-foreground">No numeric values.</p>
        )
      ) : (
        <>
          {stats.summary && (
            <HoverRow label="Distinct" value={formatStat(stats.summary.distinct)} />
          )}
          {stats.distinct && stats.distinct.values.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {stats.distinct.values.map((value) => (
                <span
                  key={value}
                  className="max-w-full truncate rounded bg-muted/60 px-1 py-px font-mono text-[10px]"
                >
                  {value}
                </span>
              ))}
              {stats.distinct.truncated && (
                <span className="text-[10px] text-muted-foreground">
                  {stats.summary
                    ? `+${formatStat(stats.summary.distinct - stats.distinct.values.length)} more`
                    : "and more"}
                </span>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No values.</p>
          )}
        </>
      )}
    </div>
  );
};

// The read is keyed on the store and the column's name and role — the three
// things that decide which statements run — rather than on the fragment
// object, whose identity changes on every refetch.
function useEffectOnColumn(
  service: ReturnType<typeof useAttributeServiceOrNull>,
  store: Store,
  column: Column,
  setState: React.Dispatch<React.SetStateAction<ValuesState>>,
) {
  const { name, role } = column;
  React.useEffect(() => {
    if (!service) return;
    let cancelled = false;
    setState({ status: "loading" });
    readColumnValueStatsCached(service.engine, store, { name, role })
      .then((stats) => {
        if (!cancelled) setState({ status: "ready", stats });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const failure = describeColumnStatsError(error, store);
        console.warn("[table] could not read the column's values:", failure.detail);
        setState({ status: "error", failure });
      });
    return () => {
      cancelled = true;
    };
  }, [service, store, name, role, setState]);
}

export const ColumnInfoContent = ({
  column,
  store,
  actions,
  onClose,
}: {
  column: Column;
  store: Store;
  actions?: ColumnInfoActions;
  onClose?: () => void;
}) => {
  const title = column.longName ?? column.name;

  // Close first, then act: hiding unmounts the header cell the popover is
  // anchored to, and Radix wants to hand focus back to a trigger that exists.
  const run = (action: () => void) => {
    onClose?.();
    action();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <ColumnAxisGlyph column={column} />
          <span className="min-w-0 break-all text-sm font-semibold leading-tight">
            {title}
          </span>
        </div>
        {column.longName && column.longName !== column.name && (
          <span className="break-all font-mono text-[10px] text-muted-foreground">
            {column.name}
          </span>
        )}
      </div>

      {column.description && (
        <p className="text-muted-foreground">{column.description}</p>
      )}

      <div className="flex flex-col gap-1">
        <HoverRow label="Role" value={columnRoleLabel(column.role)} />
        <p className="text-[10px] leading-snug text-muted-foreground">
          {COLUMN_ROLE_NOTES[column.role]}
        </p>
        <HoverRow
          label="Type"
          value={<span className="font-mono">{column.dtype}</span>}
        />
        {column.unit != null && (
          <HoverRow
            label="Unit"
            value={<span className="font-mono">{String(column.unit)}</span>}
          />
        )}
        {column.axisType && (
          <>
            <HoverRow label="Axis" value={axisTypeLabel(column.axisType)} />
            <p className="text-[10px] leading-snug text-muted-foreground">
              {AXIS_TYPE_NOTES[column.axisType]}
            </p>
          </>
        )}
        {column.references && (
          <HoverRow
            label="References"
            value={
              <MikroTableDataset.DetailLink
                object={column.references}
                className="underline-offset-2 hover:underline"
              >
                {column.references.name}
              </MikroTableDataset.DetailLink>
            }
          />
        )}
        {column.nodeReferences && (
          <HoverRow
            label="Node ids of"
            value={
              <span className="font-mono">
                collection {column.nodeReferences.id}
              </span>
            }
          />
        )}
      </div>

      <HoverSectionLabel>Values</HoverSectionLabel>
      <ColumnValues column={column} store={store} />

      {actions && (
        <div className="mt-1 flex flex-wrap gap-1 border-t border-border/60 pt-1.5">
          <SortButton
            active={actions.sortDirection === "asc"}
            onClick={() => run(() => actions.onSort("asc"))}
          >
            Sort ascending
          </SortButton>
          <SortButton
            active={actions.sortDirection === "desc"}
            onClick={() => run(() => actions.onSort("desc"))}
          >
            Sort descending
          </SortButton>
          {actions.sortDirection && (
            <SortButton onClick={() => run(() => actions.onSort(false))}>
              Clear sort
            </SortButton>
          )}
          <SortButton
            className="ml-auto"
            onClick={() => run(actions.onHide)}
          >
            Hide column
          </SortButton>
        </div>
      )}
    </div>
  );
};

const SortButton = ({
  active,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { active?: boolean }) => (
  <Button
    variant={active ? "secondary" : "ghost"}
    size="sm"
    className={cn("h-6 px-2 text-xs", className)}
    {...props}
  />
);

export const ColumnInfoPopover = ({
  column,
  store,
  actions,
  side,
  children,
}: {
  column: Column;
  store: Store;
  actions?: ColumnInfoActions;
  side?: React.ComponentProps<typeof PopoverContent>["side"];
  children: React.ReactNode;
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" side={side} className="w-80">
        <ColumnInfoContent
          column={column}
          store={store}
          actions={actions}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
};
