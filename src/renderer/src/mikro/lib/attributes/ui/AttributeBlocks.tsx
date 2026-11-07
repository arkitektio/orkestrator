import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { TraceSparkline } from "@/core/data/plot/chrome/TraceSparkline";
import { TraceSparklineOverlay } from "@/core/data/plot/chrome/TraceSparklineOverlay";
import { MikroArrayDataset } from "@/mikro/linkers";
import type {
  AttributeColumnLike,
  AttributeRow,
  HopMeta,
  PlanLine,
  PlanRowsState,
  PlanSeries,
} from "../attributeTypes";
import { profileLabelsFor, type HopBlock } from "./attributeComparison";

export { profileLabelsFor, type HopBlock };

/**
 * The blocks an attribute plan's (or a row plan's) results render as — one per
 * HOP that ran, its 0..n rows (plural is the plan contract), and a lazy
 * `references` follow-up per referencing column. Presentational and
 * host-agnostic: the scene's probe and ROI panels feed it, and so does a
 * chart's probe.
 *
 * A SPARSE block is one object's profile — `position → value`, strongest
 * first, capped — labelled off the names hop that follows it when that hop
 * ran. An ARRAY block is one object's line through a dense array, drawn small
 * — or several objects' lines (a cluster's members), drawn over each other. A
 * host with room draws them its own way (`lineView`: a chart's Probe tab plots
 * them, with what can be done with them).
 */

/** What an ARRAY hop read: one line, or one per id. */
export type HopLines = { series: PlanSeries | null; lines: readonly PlanLine[] | null };

/** A host's drawing of an ARRAY hop's lines, in place of the sparkline. */
export type LineView = (read: HopLines) => ReactNode;

/** Follow a `references` column to the row it names; null where nobody can (no follow-up offered). */
export type FollowReference = (
  column: AttributeColumnLike,
  value: number | bigint,
) => Promise<readonly AttributeRow[] | null>;

/** Who follows a reference here: the scene's store, a chart's attribute service. */
export const FollowReferenceContext = createContext<FollowReference | null>(null);
FollowReferenceContext.displayName = "FollowReferenceContext";

export const formatCell = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return String(Number(value.toPrecision(5)));
  }
  return String(value);
};

const StatusBadge = ({ state }: { state: PlanRowsState }) => {
  if (state.status === "pending") {
    return (
      <span className="rounded bg-foreground/10 px-1 text-[9px] font-medium text-foreground/40">…</span>
    );
  }
  if (state.status === "rows") {
    return state.sampleSource === "exact" ? (
      <span className="rounded bg-emerald-500/20 px-1 text-[9px] font-medium text-emerald-700 dark:text-emerald-300">
        exact
      </span>
    ) : (
      <span className="rounded bg-foreground/10 px-1 text-[9px] font-medium text-foreground/50">~LOD</span>
    );
  }
  return null;
};

const ReferenceFollowUp = ({
  column,
  value,
}: {
  column: AttributeColumnLike;
  value: number | bigint;
}) => {
  const follow = useContext(FollowReferenceContext);
  const [state, setState] = useState<
    | { phase: "collapsed" }
    | { phase: "loading" }
    | { phase: "rows"; rows: readonly AttributeRow[] }
    | { phase: "error" }
  >({ phase: "collapsed" });

  if (!column.references || !follow) return null;

  const expand = async () => {
    setState({ phase: "loading" });
    try {
      const rows = await follow(column, value);
      setState(rows ? { phase: "rows", rows } : { phase: "error" });
    } catch {
      setState({ phase: "error" });
    }
  };

  if (state.phase === "collapsed") {
    return (
      <button
        className="pointer-events-auto rounded border border-foreground/10 bg-foreground/5 px-1 text-[9px] text-foreground/60 hover:bg-foreground/15 hover:text-foreground"
        title={`Look up in ${column.references.name}`}
        onClick={() => void expand()}
      >
        → {column.references.name}
      </button>
    );
  }
  if (state.phase === "loading") {
    return <span className="text-[9px] text-foreground/40">…</span>;
  }
  if (state.phase === "error") {
    return <span className="text-[9px] text-red-700/70 dark:text-red-300/70">lookup failed</span>;
  }
  return (
    <div className="col-span-2 ml-2 space-y-0.5 border-l border-foreground/10 pl-2">
      {state.rows.length === 0 && (
        <span className="text-[10px] text-foreground/40">no matching row</span>
      )}
      {state.rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[auto_1fr] gap-x-2">
          {Object.entries(row).map(([name, cell]) => (
            <RowCellPair key={name} name={name} value={cell} />
          ))}
        </div>
      ))}
    </div>
  );
};

const RowCellPair = ({ name, value }: { name: string; value: unknown }) => (
  <>
    <span className="truncate text-[10px] text-foreground/50">{name}</span>
    <span className="text-right font-mono text-[10px] text-foreground/90">{formatCell(value)}</span>
  </>
);

const AttributeRowBlock = ({
  row,
  columns,
}: {
  row: AttributeRow;
  /** Pre-indexed by name: the linear `attributes.find` this replaces ran once
   * per CELL, so a wide table cost rows x columns scans per render. */
  columns: ReadonlyMap<string, AttributeColumnLike>;
}) => (
  <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
    {Object.entries(row).map(([name, cell]) => {
      const column = columns.get(name);
      const referenceValue =
        typeof cell === "number" || typeof cell === "bigint" ? cell : null;
      return (
        <div key={name} className="contents">
          <RowCellPair name={column?.longName ?? name} value={cell} />
          {column?.references && referenceValue !== null && (
            <div className="col-span-2 text-right">
              <ReferenceFollowUp column={column} value={referenceValue} />
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const ProfileRows = ({
  state,
  valueAxes,
  labels,
}: {
  state: PlanRowsState;
  valueAxes: readonly string[];
  labels: ReadonlyMap<number, string> | null;
}) => (
  <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
    {state.rows.map((row, index) => {
      const position = Number(row.position);
      const coords = valueAxes.length > 1 ? valueAxes.map((axis) => String(row[axis])).join(",") : null;
      const name = labels?.get(position) ?? (coords ?? `#${position}`);
      return <RowCellPair key={index} name={name} value={row.value} />;
    })}
  </div>
);

/** Several lines in one small box, on one scale. */
const OverlaidLines = ({ lines }: { lines: readonly PlanLine[] }) => {
  const drawn = useMemo(
    () => lines.map((line) => ({ key: String(line.id), values: line.values, color: "currentColor", marker: line.marker })),
    [lines],
  );
  return (
    <div className="text-foreground/60">
      <TraceSparklineOverlay lines={drawn} />
      <span className="block text-[9px] text-foreground/35">
        {lines.length} lines along {lines[0]?.axis ?? ""}
      </span>
    </div>
  );
};

const SeriesLine = ({ series }: { series: PlanSeries }) => (
  <div className="text-foreground/80">
    <TraceSparkline values={series.values} marker={series.marker} />
    <span className="block text-[9px] text-foreground/35">
      {series.values.length * series.stride} samples along {series.axis}
      {series.stride > 1 ? `, every ${series.stride}th shown` : ""}
    </span>
  </div>
);

/**
 * One hop's result block — presentational, host-agnostic. The probe section
 * feeds it from `probedAttributes`; the selected-ROI section feeds it from
 * `useAttributesAt` results (same `PlanRowsState` contract).
 */
export const AttributePlanBlock = ({
  meta,
  state,
  labels = null,
  lineView,
}: {
  meta: Pick<HopMeta, "name" | "kind" | "attributes" | "via" | "valueAxes"> &
    Partial<Pick<HopMeta, "sourceId">>;
  state: PlanRowsState;
  /** (SPARSE) Position → label, when the names hop ran. */
  labels?: ReadonlyMap<number, string> | null;
  /** (ARRAY) Draws the lines instead of the sparkline. */
  lineView?: LineView;
}) => {
  const columns = useMemo(
    () => new Map(meta.attributes.map((column) => [column.name, column])),
    [meta.attributes],
  );
  const sparse = meta.kind === "SPARSE";
  const array = meta.kind === "ARRAY";

  return (
    <div className="space-y-0.5 rounded border border-foreground/10 bg-foreground/5 px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1">
          {array && meta.sourceId ? (
            <MikroArrayDataset.DetailLink
              object={{ id: meta.sourceId }}
              className="pointer-events-auto truncate text-[10px] font-medium text-foreground/60 hover:text-foreground"
            >
              {meta.name}
            </MikroArrayDataset.DetailLink>
          ) : (
            <span className="truncate text-[10px] font-medium text-foreground/60">{meta.name}</span>
          )}
          {meta.via && (
            <span className="truncate text-[9px] text-foreground/35">{meta.via}</span>
          )}
          {sparse && (
            <span className="rounded bg-sky-500/20 px-1 text-[9px] font-medium text-sky-700/80 dark:text-sky-200/80">
              matrix
            </span>
          )}
          {array && (
            <span className="rounded bg-amber-500/20 px-1 text-[9px] font-medium text-amber-700/80 dark:text-amber-200/80">
              array
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          {state.sampledValue !== undefined && state.sampledValue !== null && (
            <span className="font-mono text-[10px] text-foreground/70">
              #{String(state.sampledValue)}
            </span>
          )}
          <StatusBadge state={state} />
        </span>
      </div>
      {state.status === "background" && (
        <span className="text-[10px] text-foreground/40">background</span>
      )}
      {state.status === "error" && (
        <span className="text-[10px] text-red-700/70 dark:text-red-300/70">{state.error ?? "failed"}</span>
      )}
      {state.status === "rows" && state.rows.length === 0 && !state.series && !state.lines?.length && (
        <span className="text-[10px] text-foreground/40">
          {array
            ? "no line for this object"
            : sparse
              ? "no entries for this object"
              : "no row for this object (never measured)"}
        </span>
      )}
      {state.status === "rows" && (state.series || state.lines?.length) ? (
        lineView ? (
          lineView({ series: state.series ?? null, lines: state.lines?.length ? state.lines : null })
        ) : state.series ? (
          <SeriesLine series={state.series} />
        ) : (
          <OverlaidLines lines={state.lines ?? []} />
        )
      ) : null}
      {state.status === "rows" && sparse && state.rows.length > 0 && (
        <ProfileRows state={state} valueAxes={meta.valueAxes} labels={labels} />
      )}
      {state.status === "rows" &&
        !sparse &&
        state.rows.map((row, index) => (
          <AttributeRowBlock key={index} row={row} columns={columns} />
        ))}
      {state.truncated && (
        <span className="block text-right text-[9px] text-foreground/35">
          {array ? "first" : "top"} {state.truncated.shown} of {state.truncated.total} {array ? "lines" : "entries"}
        </span>
      )}
    </div>
  );
};

/** The blocks of a point, in chain order, hiding honest absences. */
export const HopBlocks = ({ blocks }: { blocks: readonly HopBlock[] }) => (
  <>
    {blocks.map((block) => {
      // Unreachable hops are honest absences, not errors — hide them.
      if (block.state.status === "unreachable") return null;
      return (
        <AttributePlanBlock
          key={block.meta.hopKey}
          meta={block.meta}
          state={block.state}
          labels={profileLabelsFor(block.meta, blocks)}
        />
      );
    })}
  </>
);

