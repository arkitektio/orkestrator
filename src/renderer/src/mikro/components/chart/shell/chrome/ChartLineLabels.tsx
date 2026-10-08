import { useMemo } from "react";
import { valueToY } from "@/core/data/plot/coords/rowMap";
import type { PackedChannel } from "@/core/data/plot/lines/tracePacking";
import { useTraceStore } from "@/core/data/plot/lines/traceSlice";
import { useRangeStore } from "@/core/data/plot/stores/rangeStore";
import { bandKey, effectiveClim, useViewerStore, useViewerStoreApi } from "@/core/data/plot/stores/viewerStore";
import { cn } from "@/core/util/utils";
import { chartChannelColors } from "../../platform/lines/channelColors";
import { placeLineLabels, valueAtLeft } from "../../platform/lines/lineLabels";
import { useChartLayer, useChartStore } from "../../platform/stores/chartStore";

const NO_CHANNELS: PackedChannel[] = [];

/**
 * Which line is which, written ON the lines: where a trace draws several, each
 * one's name sits at the left edge of the plot, level with the line there and
 * in its colour.
 *
 * A legend listed beside the plot makes the reader match colours; a name at
 * the line's own start does not. Positions follow the COMMITTED window, the
 * resident points, the layout and the scale — all UI cadence — so the names
 * hold still during a drag and settle with it.
 */
export const ChartLineLabels = () => {
  const rows = useViewerStore((s) => s.rows);
  const showValueAxis = useViewerStore((s) => s.showValueAxis);
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-0 bottom-12 right-0 overflow-hidden",
        // Clear of the value axis' gutter when it is on.
        showValueAxis ? "left-16" : "left-2",
      )}
    >
      {rows.flatMap((row) => row.layerIds.map((id) => <LayerLineLabels key={id} layerId={id} />))}
    </div>
  );
};

const LayerLineLabels = ({ layerId }: { layerId: string }) => {
  const layer = useChartLayer(layerId);
  const channels = useTraceStore((s) => s.packed[layerId]?.channels ?? NO_CHANNELS);
  const left = useRangeStore((s) => s.committedRange.start);
  const origin = useChartStore((s) => s.timeOrigin);
  // The versions STAND FOR the `bands` and `clims` records, read through
  // `getState()` below.
  const layoutVersion = useViewerStore((s) => s.layoutVersion);
  const climVersion = useViewerStore((s) => s.climVersion);
  const height = useViewerStore((s) => s.viewportPx.height);
  const viewerApi = useViewerStoreApi();

  const labels = layer?.channelLabels;
  const color = layer?.color;

  const placed = useMemo(() => {
    if (!labels || labels.length <= 1 || !color || !(height > 0)) return [];
    const { bands, clims, rowCount } = viewerApi.getState();
    if (rowCount === 0) return [];
    const px = (y: number) => (-y / rowCount) * height;
    let box: { top: number; bottom: number } | null = null;
    const centres = labels.map((_, line) => {
      const band = bands[bandKey(layerId, line)];
      const clim = band ? effectiveClim(clims, band) : null;
      const packed = channels[line];
      if (!band || !clim || !packed) return null;
      const value = valueAtLeft(packed.xs, packed.ys, left - origin);
      if (value == null) return null;
      const top = px(band.top);
      const bottom = px(band.bottom);
      // The names share the stretch the layer's lines do: one band where they
      // overlay, the whole row where each has a sub-band of its own.
      box = box ? { top: Math.min(box.top, top), bottom: Math.max(box.bottom, bottom) } : { top, bottom };
      const { scale, offset } = valueToY(band, clim);
      // A line that leaves its band is named at the band's edge.
      return Math.min(bottom, Math.max(top, px(scale * value + offset)));
    });
    if (!box) return [];
    const colors = chartChannelColors(color, labels.length);
    return placeLineLabels(centres, box).map(({ line, topPx }) => ({
      line,
      topPx,
      label: labels[line],
      color: colors[line] ?? color,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerApi, layerId, labels, color, channels, left, origin, layoutVersion, climVersion, height]);

  return (
    <>
      {placed.map(({ line, topPx, label, color: lineColor }) => (
        <span
          key={line}
          className="absolute left-0 max-w-[30%] truncate text-[10px] leading-3 font-medium [text-shadow:0_0_3px_#000,0_0_3px_#000]"
          style={{ top: topPx, color: lineColor }}
        >
          {label}
        </span>
      ))}
    </>
  );
};
