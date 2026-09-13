import { useMemo, useState } from "react";
import type { ProbeResult } from "../probe/probeTypes";
import { isSameProbeKey } from "../probe/probeTypes";
import type {
  AttributeColumnLike,
  AttributeRow,
  HopMeta,
  PlanRowsState,
} from "@/mikro-next/lib/attributes/attributeTypes";
import { useViewerStore } from "../stores/viewerStore";
import { perfMonitor } from "../perf/perfMonitor";

/**
 * "What is under this pixel?" — the probe HUD section rendering the active
 * probe's attribute-plan results: one block per HOP that ran (the landing
 * table or matrix, then every reference the user switched on), its 0..n rows
 * (plural is the plan contract), and a lazy `references` follow-up per
 * referencing column for the hops left off. Pure store consumer: all data
 * arrives via `probedAttributes` (written by AttributeProbeTracker), so no
 * GraphQL hook mounts here and no extra Guard is needed.
 *
 * A SPARSE block is one object's profile — `position → value`, strongest
 * first, capped — and reads its labels (gene symbols) off the names hop that
 * follows it in the chain, when that hop ran: the rows of a MANY hop carry
 * the position they answer, so the join is a map lookup here, not a query.
 */

const formatCell = (value: unknown): string => {
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
      <span className="rounded bg-white/10 px-1 text-[9px] font-medium text-white/40">…</span>
    );
  }
  if (state.status === "rows") {
    return state.sampleSource === "exact" ? (
      <span className="rounded bg-emerald-500/20 px-1 text-[9px] font-medium text-emerald-300">
        exact
      </span>
    ) : (
      <span className="rounded bg-white/10 px-1 text-[9px] font-medium text-white/50">~LOD</span>
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
  const follow = useViewerStore((s) => s.followAttributeReference);
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
        className="pointer-events-auto rounded border border-white/10 bg-white/5 px-1 text-[9px] text-white/60 hover:bg-white/15 hover:text-white"
        title={`Look up in ${column.references.name}`}
        onClick={() => void expand()}
      >
        → {column.references.name}
      </button>
    );
  }
  if (state.phase === "loading") {
    return <span className="text-[9px] text-white/40">…</span>;
  }
  if (state.phase === "error") {
    return <span className="text-[9px] text-red-300/70">lookup failed</span>;
  }
  return (
    <div className="col-span-2 ml-2 space-y-0.5 border-l border-white/10 pl-2">
      {state.rows.length === 0 && (
        <span className="text-[10px] text-white/40">no matching row</span>
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
    <span className="truncate text-[10px] text-white/50">{name}</span>
    <span className="text-right font-mono text-[10px] text-white/90">{formatCell(value)}</span>
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

/** A settled block: what the HUD and the ROI panel both render one of. */
export type HopBlock = { meta: HopMeta; state: PlanRowsState };

/**
 * `position → label` for a sparse hop, read off its names hop: the first
 * child TABLE hop that ran, keyed by the axis it binds (`along <axis>`), its
 * label the first LABEL-role column, else the first text column that is not
 * the key.
 */
export const profileLabelsFor = (
  hop: HopMeta,
  blocks: readonly HopBlock[],
): ReadonlyMap<number, string> | null => {
  if (hop.kind !== "SPARSE") return null;
  const child = blocks.find(
    (block) =>
      block.meta.parentKey === hop.hopKey &&
      block.meta.kind === "TABLE" &&
      block.state.status === "rows",
  );
  if (!child) return null;
  const axis = hop.valueAxes[0];
  if (!axis) return null;
  const labelColumn =
    child.meta.attributes.find((column) => column.role === "LABEL")?.name ??
    child.meta.attributes.find((column) => column.name !== axis && column.dtype.toUpperCase().includes("VARCHAR"))?.name ??
    null;
  if (!labelColumn) return null;
  const labels = new Map<number, string>();
  for (const row of child.state.rows) {
    const position = row[axis];
    const label = row[labelColumn];
    if ((typeof position === "number" || typeof position === "bigint") && label != null) {
      labels.set(Number(position), String(label));
    }
  }
  return labels;
};

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

/**
 * One hop's result block — presentational, host-agnostic. The probe section
 * feeds it from `probedAttributes`; the selected-ROI section feeds it from
 * `useAttributesAt` results (same `PlanRowsState` contract).
 */
export const AttributePlanBlock = ({
  meta,
  state,
  labels = null,
}: {
  meta: Pick<HopMeta, "name" | "kind" | "attributes" | "via" | "valueAxes">;
  state: PlanRowsState;
  /** (SPARSE) Position → label, when the names hop ran. */
  labels?: ReadonlyMap<number, string> | null;
}) => {
  const columns = useMemo(
    () => new Map(meta.attributes.map((column) => [column.name, column])),
    [meta.attributes],
  );
  const sparse = meta.kind === "SPARSE";

  return (
    <div className="space-y-0.5 rounded border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-[10px] font-medium text-white/60">{meta.name}</span>
          {meta.via && (
            <span className="truncate text-[9px] text-white/35">{meta.via}</span>
          )}
          {sparse && (
            <span className="rounded bg-sky-500/20 px-1 text-[9px] font-medium text-sky-200/80">
              matrix
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          {state.sampledValue !== undefined && state.sampledValue !== null && (
            <span className="font-mono text-[10px] text-white/70">
              #{String(state.sampledValue)}
            </span>
          )}
          <StatusBadge state={state} />
        </span>
      </div>
      {state.status === "background" && (
        <span className="text-[10px] text-white/40">background</span>
      )}
      {state.status === "error" && (
        <span className="text-[10px] text-red-300/70">{state.error ?? "failed"}</span>
      )}
      {state.status === "rows" && state.rows.length === 0 && (
        <span className="text-[10px] text-white/40">
          {sparse ? "no entries for this object" : "no row for this object (never measured)"}
        </span>
      )}
      {state.status === "rows" && sparse && state.rows.length > 0 && (
        <ProfileRows state={state} valueAxes={meta.valueAxes} labels={labels} />
      )}
      {state.status === "rows" &&
        !sparse &&
        state.rows.map((row, index) => (
          <AttributeRowBlock key={index} row={row} columns={columns} />
        ))}
      {state.truncated && (
        <span className="block text-right text-[9px] text-white/35">
          top {state.truncated.shown} of {state.truncated.total} entries
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

export const AttributeRowsSection = ({ probe }: { probe: ProbeResult }) => {
  perfMonitor.countRender("AttributeRowsSection"); // no-op unless a perf recording is armed
  const probedAttributes = useViewerStore((s) => s.probedAttributes);

  const blocks = useMemo<readonly HopBlock[]>(() => {
    if (!probedAttributes) return [];
    return Object.keys(probedAttributes.byPlan).flatMap((hopKey) => {
      const meta = probedAttributes.planMeta[hopKey];
      return meta ? [{ meta, state: probedAttributes.byPlan[hopKey] }] : [];
    });
  }, [probedAttributes]);

  if (!probedAttributes || !isSameProbeKey(probe, probedAttributes.key)) return null;
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-1">
      <HopBlocks blocks={blocks} />
    </div>
  );
};
