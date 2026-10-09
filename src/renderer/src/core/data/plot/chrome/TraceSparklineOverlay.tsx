import { useMemo, useState, type PointerEvent } from "react";
import { cn } from "@/core/util/utils";
import { sparklineGeometry, sparklineX } from "../lines/sparklineGeometry";
import { formatValue } from "../probe/formatValue";
import { sampleAt } from "../probe/sampleAt";

/**
 * Several lines of samples in ONE small box, on one value scale — the
 * `TraceSparkline` for comparing: three objects' traces drawn over each other
 * say more than three boxes each stretched to its own extremes.
 *
 * Props in, SVG out, like the single line. Each line brings its colour; lines
 * of different lengths each span the full width, and the pointer reads all of
 * them at the same fraction along.
 */

export type SparklineOverlayLine = {
  key: string;
  values: ArrayLike<number>;
  color: string;
  /** A position along this line to mark, as a (fractional) sample index. */
  marker?: number | null;
};

const BOX_WIDTH = 240;

/** The extremes over every line, ignoring what is not a number. */
export const sharedRange = (
  lines: readonly Pick<SparklineOverlayLine, "values">[],
): { min: number; max: number } | null => {
  let min = Infinity;
  let max = -Infinity;
  for (const line of lines) {
    for (let i = 0; i < line.values.length; i++) {
      const value = line.values[i];
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  return min <= max ? { min, max } : null;
};

export const TraceSparklineOverlay = ({
  lines,
  height = 48,
  className,
}: {
  lines: readonly SparklineOverlayLine[];
  height?: number;
  className?: string;
}) => {
  const range = useMemo(() => sharedRange(lines), [lines]);
  const drawn = useMemo(
    () =>
      lines
        .filter((line) => line.values.length > 0)
        .map((line) => ({
          line,
          geometry: sparklineGeometry(line.values, BOX_WIDTH, height, 1, range),
        })),
    [lines, height, range],
  );
  /** The pointer's fraction along the box, 0..1. */
  const [hovered, setHovered] = useState<number | null>(null);

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;
    setHovered(Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)));
  };

  if (drawn.length === 0) return null;

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
        {drawn.map(({ line }) =>
          line.marker == null ? null : (
            <line
              key={`marker-${line.key}`}
              x1={sparklineX(line.marker, line.values.length, BOX_WIDTH)}
              x2={sparklineX(line.marker, line.values.length, BOX_WIDTH)}
              y1={0}
              y2={height}
              stroke={line.color}
              strokeOpacity={0.5}
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          ),
        )}
        {drawn.map(({ line, geometry }) => (
          <polyline
            key={line.key}
            points={geometry.points}
            fill="none"
            stroke={line.color}
            strokeWidth={1}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {hovered !== null && (
          <line
            x1={hovered * BOX_WIDTH}
            x2={hovered * BOX_WIDTH}
            y1={0}
            y2={height}
            stroke="currentColor"
            strokeOpacity={0.8}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="flex flex-wrap justify-between gap-x-2 font-mono text-[9px]">
        {hovered !== null ? (
          drawn.map(({ line, geometry }) => {
            const index = Math.round(hovered * (line.values.length - 1));
            const read = sampleAt(geometry.xs, geometry.ys, index);
            return (
              <span key={line.key} style={{ color: line.color }}>
                [{index}] {read ? formatValue(read.value) : "—"}
              </span>
            );
          })
        ) : (
          <>
            <span className="opacity-60">{range ? formatValue(range.min) : ""}</span>
            <span className="opacity-60">{range ? formatValue(range.max) : ""}</span>
          </>
        )}
      </div>
    </div>
  );
};
