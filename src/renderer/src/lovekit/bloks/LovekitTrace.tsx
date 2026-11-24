import * as React from "react";
import type { Room } from "livekit-client";

import { asStructure } from "@arkitektio/bsx/renderer/bloks/shared/index";
import { useBlok, useValue, type BlokRenderArgs } from "@arkitektio/bsx/renderer/runtime/index";
import { plotMap } from "@/core/blok/mount/frame";
import { usePlotMounts, usePlotNotice, usePlotRow, type PlotMounts } from "@/core/blok/plot/plotMounts";
import { PackedLine } from "@/core/data/plot/lines/PackedLine";
import { packPoints } from "@/core/data/plot/lines/pointPacking";
import type { PackedChannel } from "@/core/data/plot/lines/tracePacking";
import { StreamKind, useGetStreamQuery, type DataFormatFragment } from "@/lovekit/api/graphql";
import { agentIdentity, useAgentRoom, watchData } from "@/lovekit/agentRoom";
import { useConnector } from "@/lovekit/components/StreamView";
import { decodeFrame } from "@/lovekit/streams/frame";

import { lovekitTraceSchema } from "./index";

const DEFAULT_COLOR = "#7dd3fc";

/**
 * Where each value of a frame sits on the plot's axis: its calibration
 * (`offset + scale · index`), then the mount's map into the plot's unit. In
 * ascending order with the values to match, as packing wants them.
 */
const positionsOf = (format: DataFormatFragment, map: { scale: number; offset: number }) => {
  const count = format.shape[0] ?? 0;
  const calibration = format.calibration.find((candidate) => candidate.axis === format.axes[0]?.name);
  const step = calibration?.scale ?? 1;
  const first = calibration?.offset ?? 0;
  const xs = new Float64Array(count);
  for (let index = 0; index < count; index++) xs[index] = map.scale * (first + step * index) + map.offset;
  const descending = count > 1 && xs[count - 1] < xs[0];
  if (descending) xs.reverse();
  return { xs, descending };
};

/** The newest frame of the stream, packed into the plot's window and drawn in the mount's row. */
const LiveLine = ({
  id,
  room,
  stream,
  format,
  xs,
  descending,
  mounts,
  color,
}: {
  id: string;
  room: Room;
  stream: { key: string; agent: { id: string } };
  format: DataFormatFragment;
  xs: Float64Array;
  descending: boolean;
  mounts: PlotMounts;
  color: string;
}) => {
  const [packed, setPacked] = React.useState<PackedChannel | null>(null);

  React.useEffect(() => {
    let newest: Float32Array | null = null;
    let sentAt = -1;
    let drawnAt = -2;
    let drawnWindow = "";
    let animation = 0;
    // The value range grows at once and shrinks slowly: a row that rescales every frame cannot be read.
    const range = { low: NaN, high: NaN };

    const tick = () => {
      animation = requestAnimationFrame(tick);
      const values = newest;
      if (!values) return;
      const window = mounts.range.getState().liveRange;
      const widthPx = mounts.viewer.getState().viewportPx.width;
      const windowKey = `${window.start}:${window.end}:${widthPx}`;
      if (sentAt === drawnAt && windowKey === drawnWindow) return;
      drawnAt = sentAt;
      drawnWindow = windowKey;

      const ys = new Float32Array(xs.length);
      for (let index = 0; index < ys.length; index++) ys[index] = values[descending ? values.length - 1 - index : index] ?? NaN;
      const line = packPoints(xs, ys, mounts.plot.getState().timeOrigin, { window, widthPx: Math.max(1, widthPx) });

      let low = Infinity;
      let high = -Infinity;
      for (const value of ys) {
        if (!Number.isFinite(value)) continue;
        if (value < low) low = value;
        if (value > high) high = value;
      }
      if (low !== Infinity) {
        range.low = Number.isFinite(range.low) ? Math.min(low, range.low + (low - range.low) * 0.05) : low;
        range.high = Number.isFinite(range.high) ? Math.max(high, range.high + (high - range.high) * 0.05) : high;
        const hi = range.high > range.low ? range.high : range.low + 1;
        // Written when it moved by a percent of the row: every frame would relayout the axis for nothing.
        const current = mounts.viewer.getState().clims[id];
        const tolerance = (hi - range.low) * 0.01;
        if (!current || Math.abs(current.lo - range.low) > tolerance || Math.abs(current.hi - hi) > tolerance) {
          mounts.viewer.getState().setClim(id, { lo: range.low, hi });
        }
      }
      setPacked(line);
    };
    animation = requestAnimationFrame(tick);

    const stop = watchData(room, stream.key, agentIdentity(stream.agent.id), (payload) => {
      const frame = decodeFrame(payload, format.dtype);
      // A frame sent again for late viewers changes nothing.
      if (!frame || frame.sentAt <= sentAt) return;
      sentAt = frame.sentAt;
      newest = Float32Array.from(frame.values);
    });
    return () => {
      stop();
      cancelAnimationFrame(animation);
    };
  }, [id, room, stream.key, stream.agent.id, format, xs, descending, mounts]);

  return packed ? <PackedLine layerId={id} channel={0} color={color} lineWidth={1.5} packed={packed} /> : null;
};

export const LovekitTraceRender = ({ component }: BlokRenderArgs) => {
  const blok = useBlok(component, lovekitTraceSchema);
  const value = asStructure(useValue(blok.value));
  const transform = useValue(blok.transform);
  const output = useValue(blok.output);
  const color = useValue(blok.color) ?? DEFAULT_COLOR;
  const mounts = usePlotMounts();
  const { data, error } = useGetStreamQuery({ variables: { id: String(value?.object ?? "") }, skip: !value });
  const stream = data?.stream;
  const format = stream?.format ?? null;

  const first = format?.axes[0];
  const calibrationUnit = format?.calibration.find((candidate) => candidate.axis === first?.name)?.unit ?? null;
  const placementKey = JSON.stringify([transform ?? null, output ?? null]);
  const map = React.useMemo(
    () =>
      plotMap(
        { name: first?.name ?? "x", type: first?.type ?? "SPECTRUM", unit: calibrationUnit },
        { name: mounts?.axis.name ?? "", unit: mounts?.axis.unit ?? null },
        transform,
        output,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [first?.name, first?.type, calibrationUnit, mounts, placementKey],
  );
  const placed = React.useMemo(() => (format && format.shape.length === 1 ? positionsOf(format, map) : null), [format, map]);

  usePlotRow(mounts, component.id, stream?.title ?? "Stream", color, format?.unit ?? null);
  React.useEffect(() => {
    if (!mounts || !placed || placed.xs.length === 0) return;
    const { xs } = placed;
    mounts.reportSpan(component.id, { start: xs[0], end: xs[xs.length - 1] });
    return () => mounts.reportSpan(component.id, null);
  }, [mounts, placed, component.id]);

  const problem = !value
    ? null
    : error
      ? `The stream could not be loaded: ${error.message}`
      : stream && stream.kind !== StreamKind.Data
        ? `${stream.title} is no data stream.`
        : format && format.shape.length !== 1
          ? `${stream?.title}: only a one-axis frame is drawn as a line (this one has ${format.shape.length}).`
          : map.error && stream
            ? `${stream.title}: ${map.error}`
            : null;
  usePlotNotice(mounts, component.id, problem);

  const connector = useConnector();
  const room = useAgentRoom(stream?.agent.id, stream ? connector : undefined);

  if (!mounts || !stream || !format || !placed || !room?.room) return null;
  return (
    <LiveLine
      id={component.id}
      room={room.room}
      stream={stream}
      format={format}
      xs={placed.xs}
      descending={placed.descending}
      mounts={mounts}
      color={color}
    />
  );
};
