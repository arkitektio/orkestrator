import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { LayerMetadata } from "../../features/metadata/LayerMetadata";
import { ROW_PADDING } from "../../features/stacking/stackLayout";
import { formatValue } from "../../platform/probe/formatValue";
import { useExperimentStore } from "../../platform/stores/experimentStore";
import type { RowInfo } from "../../platform/stores/viewer/layoutSlice";
import { useViewerStore } from "../../platform/stores/viewerStore";

/**
 * Row labels down the left edge: which layer each row is, in its colour, with its
 * unit and current scale — and, for a multi-channel trace, what each sub-band's
 * channel is called (from its anchors). A trace row's label unfolds into that
 * layer's metadata and provenance (`RowLabel`).
 *
 * Rows are laid out in equal fractions of the viewport height (see `stackLayout`),
 * so this is plain percentage positioning — no camera math, and it re-renders only
 * when the layout or a clim changes, which is UI cadence.
 */
export const RowLabels = () => {
  // `rows` is replaced only by a relayout (UI cadence); each row's scale is its
  // own per-key subscription below, so a clim change re-renders one label.
  const rows = useViewerStore((s) => s.rows);
  const rowCount = useViewerStore((s) => s.rowCount);

  if (rowCount === 0) return null;
  return (
    <div className="pointer-events-none absolute top-0 bottom-12 left-0 w-full">
      {rows.flatMap((row) => {
        const labels = row.channelLabels ?? [];
        if (!labels.some(Boolean)) return [];
        const slot = (1 - 2 * ROW_PADDING) / labels.length;
        return labels.map((label, c) =>
          label ? (
            <span
              key={`${row.index}:${c}`}
              className="absolute right-2 font-mono text-[10px] text-muted-foreground drop-shadow"
              style={{ top: `calc(${((row.index + ROW_PADDING + c * slot) / rowCount) * 100}% + 2px)` }}
            >
              {label}
            </span>
          ) : null,
        );
      })}
      {rows.map((row) => (
        // Keyed by WHAT the row is, not where: a relayout must not hand one
        // row's unfolded state to another.
        <RowLabel key={row.layerIds.join("|")} row={row} rowCount={rowCount} />
      ))}
    </div>
  );
};

/**
 * One row's name, in its colour. A row with trace layers unfolds on click into
 * their metadata (`LayerMetadata`) right underneath — what was recorded about
 * the line next to the line, rather than in a corner. The query behind it
 * mounts only while unfolded.
 */
const RowLabel = ({ row, rowCount }: { row: RowInfo; rowCount: number }) => {
  const [expanded, setExpanded] = useState(false);
  // A scalar key (P17): which of the row's layers are traces — the only kind
  // with a lens, and so the only kind with anything to unfold.
  const traceKey = useExperimentStore((s) =>
    row.layerIds.filter((id) => s.layerIndex.get(id)?.kind === "trace").join("|"),
  );
  const traceIds = useMemo(() => (traceKey === "" ? [] : traceKey.split("|")), [traceKey]);
  const unfoldable = traceIds.length > 0;
  const open = expanded && unfoldable;
  const Chevron = open ? ChevronDown : ChevronRight;

  const name = (
    <>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
      <span className="truncate text-[11px] font-medium text-foreground/90 drop-shadow">
        {row.label}
      </span>
    </>
  );

  return (
    <div
      className={cn("absolute left-2 flex flex-col items-start gap-1", open && "z-20")}
      style={{ top: `calc(${(row.index / rowCount) * 100}% + 4px)` }}
    >
      <div className="flex max-w-[40vw] items-center gap-1.5">
        {unfoldable ? (
          <button
            type="button"
            className="pointer-events-auto flex min-w-0 items-center gap-1.5 rounded px-0.5 hover:bg-white/10"
            title={open ? "Hide metadata" : "Show metadata"}
            aria-expanded={open}
            onClick={() => setExpanded(!open)}
          >
            {name}
            <Chevron className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        ) : (
          name
        )}
        {row.unit && (
          <RowScale layerId={row.layerIds.length === 1 ? row.layerIds[0] : null} unit={row.unit} />
        )}
      </div>
      {open && (
        <div className="pointer-events-auto flex max-h-[min(60vh,24rem)] w-72 flex-col gap-3 overflow-y-auto rounded-lg border border-black/10 bg-black/60 p-1.5 text-white/85 backdrop-blur-md">
          {traceIds.map((id) => (
            <LayerMetadata key={id} layerId={id} showHeader={traceIds.length > 1} />
          ))}
        </div>
      )}
    </div>
  );
};

/** A row's unit and current scale — subscribed per layer, so only its label re-renders. */
const RowScale = ({ layerId, unit }: { layerId: string | null; unit: string }) => {
  const lo = useViewerStore((s) => (layerId ? s.clims[layerId]?.lo : undefined));
  const hi = useViewerStore((s) => (layerId ? s.clims[layerId]?.hi : undefined));
  return (
    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
      {lo != null && hi != null ? `${formatValue(lo)}…${formatValue(hi)} ${unit}` : unit}
    </span>
  );
};
