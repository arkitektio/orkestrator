import { useMemo } from "react";
import { PackedLine } from "@/core/data/plot/lines/PackedLine";
import { markerDots } from "@/core/data/plot/lines/pointPacking";
import type { PackedChannel } from "@/core/data/plot/lines/tracePacking";
import { useTraceStore } from "@/core/data/plot/lines/traceSlice";
import { drawsLine, drawsMarkers } from "../model/chartLayerModel";
import { useChartLayer } from "../stores/chartStore";
import { chartChannelColors } from "./channelColors";

const NO_CHANNELS: PackedChannel[] = [];

/**
 * Draws what a layer's driver published — a trace's tiles or a series' rows,
 * both packed lines in the one slice — in the layer's `mark`.
 *
 * A mark is a LOOK, never a read: the line and the markers are both drawn from
 * the same packed points, so switching between them refetches nothing. Markers
 * are the plot engine's fat line again, given a dot per point and the marker
 * size as its width (`markerDots`); steps are packed by the driver.
 *
 * Subscribes to its OWN entry of the slice, which changes when data lands or
 * the committed window moves (UI cadence); the row binds imperatively.
 */
export const ChartLines = ({ layerId }: { layerId: string }) => {
  const layer = useChartLayer(layerId);
  const channels = useTraceStore((s) => s.packed[layerId]?.channels ?? NO_CHANNELS);
  // One colour per line where a trace draws several (its `seriesAxis`).
  const colors = useMemo(
    () => chartChannelColors(layer?.color ?? "#fff", channels.length),
    [layer?.color, channels.length],
  );
  if (!layer) return null;
  return (
    <>
      {channels.map((packed, channel) => (
        <ChartLine
          key={channel}
          layerId={layerId}
          channel={channel}
          color={colors[channel] ?? layer.color}
          packed={packed}
          line={drawsLine(layer.mark) ? layer.lineWidth : null}
          markers={drawsMarkers(layer.mark) ? layer.markerSize : null}
        />
      ))}
    </>
  );
};

const ChartLine = ({
  layerId,
  channel,
  color,
  packed,
  line,
  markers,
}: {
  layerId: string;
  channel: number;
  color: string;
  packed: PackedChannel;
  /** The line's width in pixels, or null when the mark draws none. */
  line: number | null;
  /** The markers' size in pixels, or null when the mark draws none. */
  markers: number | null;
}) => {
  // A per-pixel envelope's points are column extremes, not samples: a dot on
  // each would mark values the data does not hold at those positions.
  const dots = useMemo(
    () => (markers != null && !packed.decimated ? markerDots(packed) : null),
    [markers, packed],
  );
  return (
    <>
      {/* A markers-only layer too dense to mark still has to be visible. */}
      {(line != null || (markers != null && !dots)) && (
        <PackedLine layerId={layerId} channel={channel} color={color} lineWidth={line ?? 1} packed={packed} />
      )}
      {dots && markers != null && (
        <PackedLine layerId={layerId} channel={channel} color={color} lineWidth={markers} packed={dots} />
      )}
    </>
  );
};
