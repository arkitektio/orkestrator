import type { ReactNode } from "react";
import { TraceSparklineOverlay } from "@/core/data/plot/chrome/TraceSparklineOverlay";
import { MikroArrayDataset } from "@/mikro/linkers";
import type { PlanRowsState } from "@/mikro/lib/attributes/attributeTypes";
import { formatCell } from "./AttributeRowsSection";
import {
  comparedPointName,
  profileComparison,
  tableComparison,
  type ComparedEntry,
  type ComparedHop,
  type ComparedPoint,
  type ComparedRow,
} from "./attributeComparison";

/**
 * The views of `attributeComparison.ts`: one block per source, the points
 * side by side in it — a grid with a column per point for a table or a
 * matrix, one box with a line per point for an array. Presentational; the
 * host supplies the settled blocks per point.
 */

const PointDot = ({ point }: { point: ComparedPoint }) => (
  <span className="inline-flex items-center justify-end gap-1 font-medium text-white/70">
    <span className="size-1.5 rounded-full" style={{ backgroundColor: point.color }} />
    {comparedPointName(point)}
  </span>
);

/**
 * A label column and one right-aligned column per point. The grid scrolls
 * sideways inside its block rather than squeezing many points unreadable.
 */
export const ComparisonGrid = ({
  points,
  rows,
}: {
  points: readonly ComparedPoint[];
  rows: readonly { key: string; label: ReactNode; cells: readonly ReactNode[] }[];
}) => (
  <div className="overflow-x-auto">
    <div
      className="grid items-baseline gap-x-3 gap-y-0.5 text-[10px]"
      style={{ gridTemplateColumns: `minmax(0, auto) repeat(${points.length}, auto)` }}
    >
      <span />
      {points.map((point) => (
        <span key={point.id} className="text-right">
          <PointDot point={point} />
        </span>
      ))}
      {rows.map((row) => (
        <div key={row.key} className="contents">
          <span className="truncate text-white/50">{row.label}</span>
          {row.cells.map((cell, column) => (
            <span key={points[column].id} className="text-right font-mono text-white/90">
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** What a point's column says when it has no rows to show. */
const statusNote = (state: PlanRowsState, empty: string): string | null => {
  if (state.status === "pending") return "…";
  if (state.status === "background") return "background";
  if (state.status === "error") return state.error ?? "failed";
  if (state.status === "rows" && state.rows.length === 0 && !state.series) return empty;
  return null;
};

const valueRows = (rows: readonly ComparedRow[]) =>
  rows.map((row) => ({
    key: row.key,
    label: row.label,
    cells: row.cells.map((cell) => (cell === undefined ? "" : formatCell(cell))),
  }));

/** The row every grid opens with: which object each point landed on. */
const objectRow = (entries: readonly ComparedEntry[], empty: string) => ({
  key: "\u0000object",
  label: "object",
  cells: entries.map((entry) => {
    const note = statusNote(entry.state, empty);
    if (note) return <span className="font-sans text-white/40">{note}</span>;
    const id = entry.state.sampledValue;
    return id === undefined || id === null ? "" : `#${String(id)}`;
  }),
});

const ComparedBody = ({ hop }: { hop: ComparedHop }) => {
  const points = hop.entries.map((entry) => entry.point);

  if (hop.meta.kind === "ARRAY") {
    const lines = hop.entries.flatMap((entry) =>
      entry.state.series
        ? [
            {
              key: entry.point.id,
              values: entry.state.series.values,
              color: entry.point.color,
              marker: entry.state.series.marker,
            },
          ]
        : [],
    );
    const axis = hop.entries.find((entry) => entry.state.series)?.state.series?.axis;
    return (
      <>
        <ComparisonGrid points={points} rows={[objectRow(hop.entries, "no line")]} />
        {lines.length > 0 && (
          <div className="text-white/80">
            <TraceSparklineOverlay lines={lines} />
            {axis && <span className="block text-[9px] text-white/35">along {axis}</span>}
          </div>
        )}
      </>
    );
  }

  if (hop.meta.kind === "SPARSE") {
    const capped = hop.entries.some((entry) => entry.state.truncated);
    return (
      <>
        <ComparisonGrid
          points={points}
          rows={[objectRow(hop.entries, "no entries"), ...valueRows(profileComparison(hop))]}
        />
        {capped && (
          <span className="block text-right text-[9px] text-white/35">
            each point’s strongest entries; blank is not zero
          </span>
        )}
      </>
    );
  }

  const table = tableComparison(hop);
  const more = hop.entries.filter((_, column) => table.extraRows[column] > 0);
  return (
    <>
      <ComparisonGrid
        points={points}
        rows={[objectRow(hop.entries, "no row"), ...valueRows(table.rows)]}
      />
      {more.length > 0 && (
        <span className="block text-right text-[9px] text-white/35">
          first row shown for {more.map((entry) => comparedPointName(entry.point)).join(", ")}
        </span>
      )}
    </>
  );
};

export const ComparedHopBlock = ({ hop }: { hop: ComparedHop }) => {
  const { meta } = hop;
  return (
    <div className="space-y-1 rounded border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1">
        {meta.kind === "ARRAY" && meta.sourceId ? (
          <MikroArrayDataset.DetailLink
            object={{ id: meta.sourceId }}
            className="pointer-events-auto truncate text-[10px] font-medium text-white/60 hover:text-white"
          >
            {meta.name}
          </MikroArrayDataset.DetailLink>
        ) : (
          <span className="truncate text-[10px] font-medium text-white/60">{meta.name}</span>
        )}
        {meta.via && <span className="truncate text-[9px] text-white/35">{meta.via}</span>}
        {meta.kind === "SPARSE" && (
          <span className="rounded bg-sky-500/20 px-1 text-[9px] font-medium text-sky-200/80">
            matrix
          </span>
        )}
        {meta.kind === "ARRAY" && (
          <span className="rounded bg-amber-500/20 px-1 text-[9px] font-medium text-amber-200/80">
            array
          </span>
        )}
      </div>
      <ComparedBody hop={hop} />
    </div>
  );
};
