import { formatValue } from "@/core/data/plot/probe/formatValue";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { cn } from "@/core/util/utils";
import { useChartLayer } from "../../platform/stores/chartStore";

/**
 * What each row of the chart is: a legend down the left edge, one entry per
 * layer in the row, each in its colour with its unit and current scale. The
 * lines of a layer that draws several are named on the lines themselves
 * (`ChartLineLabels`).
 *
 * Rows are laid out in equal fractions of the viewport height (`stackLayout`),
 * so this is plain percentage positioning — no camera math, and it re-renders
 * only when the layout or a scale changes, which is UI cadence.
 *
 * With the value axis on, the column steps aside to clear the gutter and a
 * lone layer's scale shrinks to its unit — the gutter states the range tick by
 * tick, and stating it twice is the clutter the gutter was for.
 */
export const ChartRowLabels = () => {
  // `rows` is replaced only by a relayout; each entry's scale is its own
  // per-key subscription below, so a clim change re-renders one label.
  const rows = useViewerStore((s) => s.rows);
  const rowCount = useViewerStore((s) => s.rowCount);
  const showValueAxis = useViewerStore((s) => s.showValueAxis);

  if (rowCount === 0) return null;
  return (
    <div className="pointer-events-none absolute top-0 bottom-12 left-0 w-full">
      {rows.map((row) => (
        <div
          key={row.layerIds.join("|")}
          className={cn("absolute flex max-w-[40%] flex-col gap-0.5", showValueAxis ? "left-16" : "left-2")}
          style={{ top: `calc(${(row.index / rowCount) * 100}% + 4px)` }}
        >
          {row.layerIds.map((id, i) => (
            // In a shared row every layer is on ONE scale, the gutter's; in an
            // overlay only the leading layer's is.
            <LegendEntry key={id} layerId={id} unitOnly={showValueAxis && (!row.overlay || i === 0)} />
          ))}
        </div>
      ))}
    </div>
  );
};

const LegendEntry = ({ layerId, unitOnly }: { layerId: string; unitOnly: boolean }) => {
  const layer = useChartLayer(layerId);
  const lo = useViewerStore((s) => s.clims[layerId]?.lo);
  const hi = useViewerStore((s) => s.clims[layerId]?.hi);
  if (!layer) return null;
  const range = !unitOnly && lo != null && hi != null ? `${formatValue(lo)}…${formatValue(hi)}` : null;
  const scale = [range, layer.valueUnit].filter(Boolean).join(" ");
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: layer.color }} />
      <span className="truncate text-[11px] font-medium text-foreground/90 drop-shadow">{layer.label}</span>
      {scale && <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{scale}</span>}
    </div>
  );
};
