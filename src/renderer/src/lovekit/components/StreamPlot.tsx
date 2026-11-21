import { useEffect, useRef, useState } from "react";
import type { Room } from "livekit-client";
import { Activity } from "lucide-react";

import { cn } from "@/core/util/utils";
import type { DataFormatFragment } from "../api/graphql";
import { watchData } from "../agentRoom";
import { decodeFrame, type DataFrame } from "../streams/frame";

/** A number as an axis shows it: short, whatever its size. */
const label = (value: number, unit?: string | null) => `${Number(value.toPrecision(4))}${unit ? ` ${unit}` : ""}`;

/** Where the first and the last value sit on the frame's first axis, and in what unit. */
const span = (format: DataFormatFragment, count: number) => {
  const axis = format.axes[0];
  const calibration = format.calibration.find((candidate) => candidate.axis === axis?.name);
  if (!calibration) return { from: 0, to: count - 1, unit: null, name: axis?.name };
  return { from: calibration.offset, to: calibration.offset + calibration.scale * (count - 1), unit: calibration.unit, name: axis?.name };
};

const MARGIN = { left: 8, right: 8, top: 18, bottom: 18 };

const draw = (canvas: HTMLCanvasElement, frame: DataFrame, format: DataFormatFragment, range: { low: number; high: number }) => {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const values = frame.values;
  const count = values.length;
  if (count === 0) return;
  let low = Infinity;
  let high = -Infinity;
  for (let index = 0; index < count; index++) {
    const value = values[index];
    if (!Number.isFinite(value)) continue;
    if (value < low) low = value;
    if (value > high) high = value;
  }
  if (low === Infinity) return;
  // The range grows at once and shrinks slowly: a plot that rescales every frame cannot be read.
  range.low = Number.isFinite(range.low) ? Math.min(low, range.low + (low - range.low) * 0.05) : low;
  range.high = Number.isFinite(range.high) ? Math.max(high, range.high + (high - range.high) * 0.05) : high;
  const extent = range.high - range.low || 1;

  const color = getComputedStyle(canvas).color;
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  context.strokeStyle = color;
  context.lineWidth = 1.25;
  context.lineJoin = "round";
  context.beginPath();
  for (let index = 0; index < count; index++) {
    const x = MARGIN.left + (count === 1 ? 0 : (index / (count - 1)) * plotWidth);
    const y = MARGIN.top + (1 - (values[index] - range.low) / extent) * plotHeight;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();

  const along = span(format, count);
  context.fillStyle = color;
  context.globalAlpha = 0.6;
  context.font = "11px ui-sans-serif, system-ui, sans-serif";
  context.textBaseline = "top";
  context.textAlign = "left";
  context.fillText(label(range.high, format.unit), MARGIN.left, 3);
  context.textBaseline = "bottom";
  context.fillText(label(along.from, along.unit), MARGIN.left, height - 3);
  context.textAlign = "right";
  context.fillText(label(along.to, along.unit), width - MARGIN.right, height - 3);
  if (along.name) {
    context.textAlign = "center";
    context.fillText(along.name, width / 2, height - 3);
  }
  context.globalAlpha = 1;
};

/**
 * A data stream as a line: the newest frame of the data track named by the
 * stream's key, drawn once per display frame however fast frames come. A frame
 * is drawn only when it was sent after the one on screen, so one that is sent
 * again for late viewers changes nothing.
 */
export const StreamPlot = ({
  room,
  stream,
  className,
}: {
  room: Room;
  stream: { key: string; title: string; live?: boolean | null; format: DataFormatFragment };
  className?: string;
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [receiving, setReceiving] = useState(false);
  const format = stream.format;

  useEffect(() => {
    let newest: DataFrame | null = null;
    let drawn = -1;
    let animation = 0;
    const range = { low: NaN, high: NaN };
    const tick = () => {
      animation = requestAnimationFrame(tick);
      if (!newest || newest.sentAt === drawn || !canvas.current) return;
      drawn = newest.sentAt;
      draw(canvas.current, newest, format, range);
    };
    animation = requestAnimationFrame(tick);
    const stop = watchData(room, stream.key, (payload) => {
      const frame = decodeFrame(payload, format.dtype);
      if (!frame || (newest && frame.sentAt <= newest.sentAt)) return;
      if (!newest) setReceiving(true);
      newest = frame;
    });
    // A resized plot is drawn again from the frame it shows.
    const resized = new ResizeObserver(() => {
      drawn = -1;
    });
    if (canvas.current) resized.observe(canvas.current);
    return () => {
      stop();
      resized.disconnect();
      cancelAnimationFrame(animation);
      setReceiving(false);
    };
  }, [room, stream.key, format]);

  return (
    <div className={cn("dark relative h-full w-full bg-background text-foreground", className)}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full text-info" />
      {!receiving && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-foreground/60">
          <Activity className="size-5" />
          <span>{stream.live === false ? `${stream.title} is offline` : `Waiting for ${stream.title}…`}</span>
        </div>
      )}
    </div>
  );
};
