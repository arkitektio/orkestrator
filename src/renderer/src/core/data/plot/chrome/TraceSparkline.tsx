import { useMemo, useState, type PointerEvent } from "react";
import { cn } from "@/core/util/utils";
import { sparklineGeometry, sparklineIndexAt, sparklineX } from "../lines/sparklineGeometry";
import { formatValue } from "../probe/formatValue";
import { sampleAt } from "../probe/sampleAt";

/**
 * A line of samples, small: a trace inside a readout.
 *
 * Props in, SVG out — no plot scope, no canvas, no store. The plot engine draws
 * a chart; this draws the one line a hover asks about, where mounting an engine
 * per hovered object would be the wrong weight. It shares the engine's packing
 * (`sparklineGeometry`) and its readback (`sampleAt`), so what it shows under
 * the pointer is what it drew.
 *
 * The line takes `currentColor`; the marker is where the host says "here" is
 * along it (the frame on screen), in sample indices.
 */

/** The box the line is laid out in; the SVG stretches it to its container. */
const BOX_WIDTH = 240;

export const TraceSparkline = ({
  values,
  marker = null,
  height = 36,
  className,
}: {
  values: ArrayLike<number>;
  /** A position along the line to mark, as a (fractional) sample index. */
  marker?: number | null;
  height?: number;
  className?: string;
}) => {
  const geometry = useMemo(() => sparklineGeometry(values, BOX_WIDTH, height), [values, height]);
  const [hovered, setHovered] = useState<number | null>(null);
  const count = values.length;

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const x = ((event.clientX - bounds.left) / bounds.width) * BOX_WIDTH;
    setHovered(Math.round(sparklineIndexAt(x, count, BOX_WIDTH)));
  };

  if (count === 0) return null;
  const read = hovered === null ? null : sampleAt(geometry.xs, geometry.ys, hovered);

  return (
    <div className={cn("space-y-0.5", className)}>
      <svg
        viewBox={`0 0 ${BOX_WIDTH} ${height}`}
        preserveAspectRatio="none"
        className="pointer-events-auto block w-full"
        style={{ height }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHovered(null)}
      >
        {marker !== null && (
          <line
            x1={sparklineX(marker, count, BOX_WIDTH)}
            x2={sparklineX(marker, count, BOX_WIDTH)}
            y1={0}
            y2={height}
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <polyline
          points={geometry.points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {hovered !== null && (
          <line
            x1={sparklineX(hovered, count, BOX_WIDTH)}
            x2={sparklineX(hovered, count, BOX_WIDTH)}
            y1={0}
            y2={height}
            stroke="currentColor"
            strokeOpacity={0.8}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="flex justify-between font-mono text-[9px] opacity-60">
        {hovered !== null ? (
          <>
            <span>[{hovered}]</span>
            <span>{read ? formatValue(read.value) : "—"}</span>
          </>
        ) : (
          <>
            <span>{geometry.valueMin === null ? "" : formatValue(geometry.valueMin)}</span>
            <span>{geometry.valueMax === null ? "" : formatValue(geometry.valueMax)}</span>
          </>
        )}
      </div>
    </div>
  );
};
