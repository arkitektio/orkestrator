import { useMemo } from "react";
import { valueToY } from "../../platform/coords/rowMap";
import { valueTicks } from "../../platform/coords/valueTicks";
import {
  bandKey,
  effectiveClim,
  valueSpacingFor,
  useViewerStore,
  useViewerStoreApi,
} from "../../platform/stores/viewerStore";

/**
 * The value axis — a gutter of tick labels down the left edge — and the
 * horizontal half of the grid.
 *
 * One component for both because they are the SAME tick set: a grid line without
 * a label to read it against is decoration, and a label without a line to follow
 * is hard to line up with a trace. The two switches only choose which parts of it
 * are drawn.
 *
 * PER ROW, in that row's own units. Rows have independent scales (a millivolt row
 * above a picoamp row), so there is no single axis to put on the side; one shared
 * axis would simply be wrong for every row but one.
 *
 * Positioning is pure percentages, no camera math: world y is in ROW UNITS,
 * top-down, and the camera frames `top = 0, bottom = -rowCount` — so a world y is
 * at `(-y / rowCount) * 100` percent down the canvas box, the same formula
 * `MarkLabelsOverlay` uses. Nothing here follows the live window, so this renders
 * at UI cadence (a relayout, a clim change, a resize) rather than binding
 * imperatively as `TimeAxis` and `TimeGrid` must.
 *
 * Two rules keep it from crowding:
 *  - a band shorter than `MIN_BAND_PX` gets no ticks at all (`valueTicks`) — a
 *    sixteen-channel trace labels nothing rather than stacking numbers on top of
 *    each other;
 *  - an OVERLAY row holds several layers on one plot, each on its OWN scale, so
 *    there is no axis true for all of them. The gutter still appears — a switch
 *    that silently does nothing in one layout mode is worse than an axis that
 *    says whose it is — showing the row's LEADING layer's scale, tinted that
 *    layer's colour. The legend keeps the other layers' ranges in full.
 *
 * The gutter carries NUMBERS only. Each row's unit is already next to its name in
 * `RowLabels` — which drops its `lo…hi` while this is on, because the gutter now
 * says the scale and saying it twice is the clutter this is meant to avoid.
 */

type TickMark = { key: string; topPct: number; label: string };
type RowTicks = {
  key: string;
  /** Set only on an OVERLAY row: whose scale these numbers are. */
  color: string | null;
  ticks: TickMark[];
};

export const ValueAxis = () => {
  const showValueAxis = useViewerStore((s) => s.showValueAxis);
  const showGrid = useViewerStore((s) => s.showGrid);
  const gridSpacingPx = useViewerStore((s) => s.gridSpacingPx);
  // Scalars (P17): the versions STAND FOR the `bands` and `clims` records, which
  // are read through `getState()` below.
  const layoutVersion = useViewerStore((s) => s.layoutVersion);
  const climVersion = useViewerStore((s) => s.climVersion);
  const rowCount = useViewerStore((s) => s.rowCount);
  const height = useViewerStore((s) => s.viewportPx.height);
  const viewerApi = useViewerStoreApi();

  const rows = useMemo<RowTicks[]>(() => {
    const state = viewerApi.getState();
    const { bands, clims, rowCount: count } = state;
    if (count === 0 || !(height > 0)) return [];
    const spacing = valueSpacingFor(gridSpacingPx);

    return state.rows.flatMap((row) => {
      const out: RowTicks[] = [];
      for (const layerId of row.layerIds) {
        // Every band of the row: STACKED splits a multi-channel row into one band
        // per channel, and each is its own stretch of screen to label.
        for (let channel = 0; channel < 1024; channel++) {
          const band = bands[bandKey(layerId, channel)];
          if (!band) break;
          const clim = effectiveClim(clims, band);
          if (!clim) continue;
          const bandPx = ((band.top - band.bottom) / count) * height;
          const ticks = valueTicks(clim, bandPx, spacing);
          if (ticks.length === 0) continue;
          const { scale, offset } = valueToY(band, clim);
          out.push({
            key: bandKey(layerId, channel),
            color: row.overlay ? row.color : null,
            ticks: ticks.map((tick) => ({
              key: tick.label,
              topPct: (-(scale * tick.value + offset) / count) * 100,
              label: tick.label,
            })),
          });
        }
        // SHARED overlays the row's layers on ONE band under a SHARED clim, so
        // the first layer's bands already carry the whole row's scale. OVERLAY
        // also puts them on one band, but each keeps its OWN clim — N tick sets
        // at N different heights would be unreadable, so the axis is the row's
        // leading layer (`row.color`) and is tinted to say so.
        if (row.layerIds.length > 1) break;
      }
      return out;
    });
    // The versions STAND FOR the records.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerApi, layoutVersion, climVersion, rowCount, height, gridSpacingPx]);

  if (rows.length === 0 || (!showValueAxis && !showGrid)) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-12 overflow-hidden">
      {showGrid &&
        rows.map((row) =>
          row.ticks.map((tick) => (
            <div
              key={`grid:${row.key}:${tick.key}`}
              className="absolute inset-x-0 h-px bg-foreground/10"
              style={{ top: `${tick.topPct}%` }}
            />
          )),
        )}
      {showValueAxis && (
        <div className="absolute inset-y-0 left-0 w-14 border-r border-border/30 bg-background/30 backdrop-blur-sm">
          {rows.map((row) => (
            <div key={`axis:${row.key}`}>
              {row.ticks.map((tick) => (
                <div
                  key={tick.key}
                  className="absolute right-0 flex -translate-y-1/2 items-center gap-1"
                  style={{ top: `${tick.topPct}%` }}
                >
                  <span
                    className="font-mono text-[10px] tabular-nums text-muted-foreground"
                    style={row.color ? { color: row.color } : undefined}
                  >
                    {tick.label}
                  </span>
                  <span
                    className="h-px w-1.5 bg-muted-foreground/60"
                    style={row.color ? { backgroundColor: row.color } : undefined}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
