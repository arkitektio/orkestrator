import { useEffect, useMemo, useRef } from "react";
import { pixelAtTime } from "@/core/data/plot/camera/rangeToCamera";
import { formatSiValue } from "@/core/data/plot/coords/siFormat";
import { sampleAt } from "@/core/data/plot/probe/sampleAt";
import { drawnLayersKey, isLayerHidden } from "@/core/data/plot/stores/plotStore";
import { useRangeStoreApi } from "@/core/data/plot/stores/rangeStore";
import { useViewerStore, useViewerStoreApi } from "@/core/data/plot/stores/viewerStore";
import { bindFields } from "@/core/data/scene/stores/bindStore";
import { useChartStore, useChartStoreApi } from "../../platform/stores/chartStore";
import { formatUnit } from "@/core/util/units";

/**
 * The hover readout of an axis chart: a cursor line across the plot, and each
 * drawn layer's value at the hovered position, in its colour and unit.
 *
 * The line moves on the render plane (one `transform` per hover or pan); the
 * text re-renders only when the hovered position or what is drawn changes
 * (`probeVersion`, `drawnLayersKey` -- scalars, P17). Values are read back from
 * what is DRAWN, so the readout agrees with the line under the cursor; a value
 * read off a min/max envelope or a coarser level says so (`~`).
 */
export const ChartProbeReadout = ({ axisName, unit }: { axisName: string; unit: string | null }) => {
  const lineRef = useRef<HTMLDivElement | null>(null);
  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();

  useEffect(() => {
    const line = lineRef.current;
    if (!line) return;
    const place = () => {
      const { hoverTime, viewportPx } = viewerApi.getState();
      if (hoverTime == null) {
        line.style.display = "none";
        return;
      }
      line.style.display = "";
      line.style.transform = `translateX(${pixelAtTime(hoverTime, viewportPx.width, rangeApi.getState().liveRange)}px)`;
    };
    const unbindHover = bindFields(viewerApi, [(s) => s.hoverTime, (s) => s.viewportPx.width], place);
    const unbindRange = bindFields(rangeApi, [(s) => s.liveRange.start, (s) => s.liveRange.end], place);
    return () => {
      unbindHover();
      unbindRange();
    };
  }, [rangeApi, viewerApi]);

  return (
    <>
      <div ref={lineRef} className="pointer-events-none absolute top-0 bottom-12 left-0 w-px bg-white/35" style={{ display: "none" }} />
      <Readout axisName={axisName} unit={unit} />
    </>
  );
};

const Readout = ({ axisName, unit }: { axisName: string; unit: string | null }) => {
  const hoverTime = useViewerStore((s) => s.hoverTime);
  const probeVersion = useViewerStore((s) => s.probeVersion);
  const viewerApi = useViewerStoreApi();
  const chartApi = useChartStoreApi();
  const drawnKey = useChartStore(drawnLayersKey);
  const timeOrigin = useChartStore((s) => s.timeOrigin);

  const rows = useMemo(() => {
    if (hoverTime == null) return [];
    const { probeSources } = viewerApi.getState();
    const x = hoverTime - timeOrigin;
    return chartApi
      .getState()
      .layers.filter((l) => (l.kind === "trace" || l.kind === "series") && !isLayerHidden(l))
      .map((layer) => {
        const channels = probeSources.get(layer.id) ?? [];
        // Join across at most a few drawn points: wider is a gap, where the line breaks too.
        const values = channels.map((c) => {
          const n = c.xs.length;
          const spacing = n > 1 ? Math.abs(c.xs[n - 1] - c.xs[0]) / (n - 1) : Infinity;
          return sampleAt(c.xs, c.ys, x, spacing * 3 + 1e-12);
        });
        return {
          id: layer.id,
          label: layer.label,
          color: layer.solidColor,
          unit: layer.valueUnit,
          values,
          approximate: channels.some((c) => c.decimated),
        };
      })
      .filter((row) => row.values.some((v) => v != null));
    // The version and key stand for the records.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverTime, probeVersion, drawnKey, timeOrigin, viewerApi, chartApi]);

  if (hoverTime == null || rows.length === 0) return null;
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-20 w-fit min-w-40 max-w-xs rounded-md border border-white/10 bg-zinc-950/85 px-2 py-1.5 text-[11px] shadow-lg backdrop-blur">
      <div className="mb-1 font-mono tabular-nums text-foreground/55">
        {axisName || "at"} = {formatSiValue(hoverTime)}
        {unit ? ` ${unit}` : ""}
      </div>
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
          <span className="truncate text-foreground/80">{row.label}</span>
          <span className="ml-auto pl-3 font-mono tabular-nums text-foreground/95">
            {row.values.map((v) => (v == null ? "–" : formatSiValue(v.value))).join(" / ")}
            {formatUnit(row.unit) ? ` ${formatUnit(row.unit)}` : ""}
          </span>
          {row.approximate && (
            <span className="text-[10px] text-amber-400" title="Read off the drawn envelope, not the raw samples">
              ~
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
