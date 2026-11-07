import { useMemo, useState, type PointerEvent, type ReactNode } from "react";
import { useElementSize } from "@/core/util/useElementSize";
import { cn } from "@/core/util/utils";
import { formatSiValue } from "../coords/siFormat";
import { sparklineGeometry, sparklineIndexAt, sparklineX } from "../lines/sparklineGeometry";
import { numericTicks, TARGET_X_SPACING_PX, TARGET_Y_SPACING_PX } from "../plane/planeTicks";
import { sharedRange } from "./TraceSparklineOverlay";

/**
 * A line read out of an array, drawn as a small plot rather than a sparkline:
 * for a rail that has the room (a chart's Probe tab), where a readout of 36
 * pixels would throw it away.
 *
 * - Ticks on both axes, sized in real pixels (`useElementSize`), so labels
 *   never stretch the way a `preserveAspectRatio="none"` box would.
 * - Several lines (a cluster's members' traces) share one value scale. Each
 *   is drawn faint; the one nearest the pointer, or the selected one, is drawn
 *   full and leads the readout. A click selects it (`onSelect`), a second click
 *   lets go.
 * - The x axis is in samples of the stored line along `axis`: a line read at a
 *   stride is labelled at the positions it was read from.
 *
 * Geometry is the sparkline's (`sparklineGeometry`: a dense line reduced to
 * each pixel column's extremes, so spikes survive); the readout reads the
 * samples themselves.
 */

export type ProbePlotLine = {
  key: string;
  values: ArrayLike<number>;
  /** What the line is, for the readout: a member's id. */
  label: string;
  color: string;
};

const MARGIN = { left: 40, right: 6, top: 6, bottom: 18 };
const INSET = 1;

export const ProbeLinePlot = ({
  lines,
  axis,
  stride = 1,
  height = 150,
  selected = null,
  onSelect,
  actions,
  className,
}: {
  lines: readonly ProbePlotLine[];
  /** The axis the samples run along. */
  axis: string;
  /** Every `stride`-th sample of the stored line was read. */
  stride?: number;
  height?: number;
  selected?: string | null;
  onSelect?: (key: string | null) => void;
  /** Beside the readout: what can be done with the line. */
  actions?: ReactNode;
  className?: string;
}) => {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const plotWidth = Math.max(0, size.width - MARGIN.left - MARGIN.right);
  const plotHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const drawn = useMemo(() => lines.filter((line) => line.values.length > 0), [lines]);
  const range = useMemo(() => sharedRange(drawn), [drawn]);
  const count = drawn.reduce((most, line) => Math.max(most, line.values.length), 0);
  const geometries = useMemo(
    () =>
      plotWidth > 0
        ? drawn.map((line) => sparklineGeometry(line.values, plotWidth, plotHeight, INSET, range))
        : [],
    [drawn, plotWidth, plotHeight, range],
  );

  const xTicks = useMemo(
    () => numericTicks(0, Math.max(0, count - 1) * stride, plotWidth, TARGET_X_SPACING_PX),
    [count, stride, plotWidth],
  );
  const yTicks = useMemo(
    () => (range ? numericTicks(range.min, range.max, plotHeight, TARGET_Y_SPACING_PX) : []),
    [range, plotHeight],
  );
  const yOf = (value: number) => {
    if (!range) return plotHeight / 2;
    const span = range.max - range.min;
    const level = span > 0 ? (value - range.min) / span : 0.5;
    return INSET + (1 - level) * Math.max(0, plotHeight - 2 * INSET);
  };

  /** The pointer, as a fraction along the plot and a value. */
  const [pointer, setPointer] = useState<{ fraction: number; value: number | null } | null>(null);

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (plotWidth <= 0) return;
    const x = event.clientX - bounds.left - MARGIN.left;
    const y = event.clientY - bounds.top - MARGIN.top;
    const fraction = Math.min(1, Math.max(0, x / plotWidth));
    const span = range ? range.max - range.min : 0;
    const level = plotHeight > 2 * INSET ? 1 - (y - INSET) / (plotHeight - 2 * INSET) : 0.5;
    setPointer({ fraction, value: range ? range.min + level * span : null });
  };

  /** Each line's sample under the pointer. */
  const reads = pointer
    ? drawn.map((line) => {
        const index = Math.round(sparklineIndexAt(pointer.fraction * plotWidth, line.values.length, plotWidth));
        return { line, index, value: line.values[index] };
      })
    : [];
  // The line the pointer is nearest, by value at its position.
  const nearest =
    pointer && pointer.value !== null && reads.length > 1
      ? reads.reduce((best, read) =>
          Number.isFinite(read.value) &&
          (!Number.isFinite(best.value) ||
            Math.abs(read.value - (pointer.value as number)) < Math.abs(best.value - (pointer.value as number)))
            ? read
            : best,
        )
      : (reads[0] ?? null);
  const emphasised = nearest?.line.key ?? selected;
  const several = drawn.length > 1;

  // The box renders even with nothing in it: the size observer binds on mount.
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div ref={ref} className="w-full" style={{ height }}>
        {size.width > 0 && drawn.length > 0 && (
          <svg
            width={size.width}
            height={height}
            className={cn("block text-muted-foreground", onSelect && several && "cursor-pointer")}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setPointer(null)}
            onClick={() => {
              if (!onSelect || !nearest) return;
              onSelect(nearest.line.key === selected ? null : nearest.line.key);
            }}
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {yTicks.map((tick) => (
                <g key={`y${tick.value}`} transform={`translate(0,${yOf(tick.value)})`}>
                  <line x1={0} x2={plotWidth} stroke="currentColor" strokeOpacity={0.12} />
                  <text
                    x={-4}
                    dy="0.32em"
                    textAnchor="end"
                    fill="currentColor"
                    className="font-mono text-[10px] tabular-nums"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}
              <line x1={0} x2={plotWidth} y1={plotHeight} y2={plotHeight} stroke="currentColor" strokeOpacity={0.4} />
              {xTicks.map((tick) => {
                const x = sparklineX(tick.value / stride, count, plotWidth);
                return (
                  <g key={`x${tick.value}`} transform={`translate(${x},${plotHeight})`}>
                    <line y1={0} y2={4} stroke="currentColor" strokeOpacity={0.6} />
                    <text
                      y={14}
                      textAnchor="middle"
                      fill="currentColor"
                      className="font-mono text-[10px] tabular-nums"
                    >
                      {tick.label}
                    </text>
                  </g>
                );
              })}
              {drawn.map((line, i) => {
                const geometry = geometries[i];
                if (!geometry) return null;
                const strong = !several || line.key === emphasised;
                return (
                  <polyline
                    key={line.key}
                    points={geometry.points}
                    fill="none"
                    stroke={line.color}
                    strokeOpacity={strong ? 1 : 0.3}
                    strokeWidth={strong ? 1.5 : 1}
                    strokeLinejoin="round"
                  />
                );
              })}
              {/* The emphasised line on top of the faint ones. */}
              {several &&
                emphasised !== null &&
                drawn.map((line, i) =>
                  line.key === emphasised && geometries[i] ? (
                    <polyline
                      key={`top-${line.key}`}
                      points={geometries[i].points}
                      fill="none"
                      stroke={line.color}
                      strokeWidth={1.75}
                      strokeLinejoin="round"
                    />
                  ) : null,
                )}
              {pointer && (
                <line
                  x1={pointer.fraction * plotWidth}
                  x2={pointer.fraction * plotWidth}
                  y1={0}
                  y2={plotHeight}
                  stroke="currentColor"
                  strokeOpacity={0.7}
                />
              )}
              {nearest && Number.isFinite(nearest.value) && (
                <circle
                  cx={sparklineX(nearest.index, nearest.line.values.length, plotWidth)}
                  cy={yOf(nearest.value)}
                  r={2.5}
                  fill={nearest.line.color}
                />
              )}
            </g>
          </svg>
        )}
      </div>
      <div className="flex min-h-5 items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground">
        <span className="min-w-0 truncate tabular-nums">
          {nearest ? (
            <>
              {several && <span className="text-foreground">{nearest.line.label} · </span>}
              {axis} {(nearest.index * stride).toLocaleString()} ·{" "}
              <span className="text-foreground">
                {Number.isFinite(nearest.value) ? formatSiValue(nearest.value) : "—"}
              </span>
            </>
          ) : (
            <>
              {several ? `${drawn.length} lines along ${axis}` : `along ${axis}`}
              {stride > 1 ? `, 1 in ${stride} samples` : ""}
              {several && selected !== null && (
                <span className="text-foreground">
                  {" "}
                  · {drawn.find((line) => line.key === selected)?.label ?? ""}
                </span>
              )}
            </>
          )}
        </span>
        {actions}
      </div>
    </div>
  );
};
