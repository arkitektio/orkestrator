import { ROW_PADDING } from "../../features/stacking/stackLayout";
import { formatValue } from "../../platform/probe/formatValue";
import { useViewerStore } from "../../platform/stores/viewerStore";

/**
 * Row labels down the left edge: which layer each row is, in its colour, with its
 * unit and current scale — and, for a multi-channel trace, what each sub-band's
 * channel is called (from its anchors).
 *
 * Rows are laid out in equal fractions of the viewport height (see `stackLayout`),
 * so this is plain percentage positioning — no camera math, and it re-renders only
 * when the layout or a clim changes, which is UI cadence.
 */
export const RowLabels = () => {
  const rows = useViewerStore((s) => s.rows);
  const rowCount = useViewerStore((s) => s.rowCount);
  const clims = useViewerStore((s) => s.clims);

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
      {rows.map((row) => {
        const clim = row.layerIds.length === 1 ? clims[row.layerIds[0]] : undefined;
        return (
          <div
            key={row.index}
            className="absolute left-2 flex max-w-[40%] items-center gap-1.5"
            style={{ top: `calc(${(row.index / rowCount) * 100}% + 4px)` }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="truncate text-[11px] font-medium text-foreground/90 drop-shadow">
              {row.label}
            </span>
            {row.unit && (
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {clim
                  ? `${formatValue(clim.lo)}…${formatValue(clim.hi)} ${row.unit}`
                  : row.unit}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
