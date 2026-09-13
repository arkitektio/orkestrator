import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorMap } from "@/mikro-next/api/graphql";
import { useMemo, useRef, useState } from "react";
import { Maximize2, RotateCcw, Spline } from "lucide-react";
import type { TransferCurveStop } from "../../platform/model/renderGraph";
import { sampleColormapCSS } from "../../platform/layerui/colormap-utils";
import { formatContrastValue } from "../../platform/layerui/contrast-utils";

/**
 * Photoshop-Levels-style transfer editor: the histogram is ALWAYS drawn over
 * the layer's full dynamic range (no zoom/pan state to get lost in), with the
 * actual transfer curve overlaid and three draggable stops beneath it —
 * black point (climMin), midtone (gamma) and white point (climMax). The
 * midtone stop sits where the curve crosses 0.5 and dragging it solves the
 * gamma that puts 0.5 there (t^gamma = 0.5 → gamma = ln.5/ln t), exactly the
 * shader's `pow((v - climMin)/(climMax - climMin), gamma)` transfer.
 *
 * Bars use log-scaled counts — microscopy histograms are dominated by the
 * background bin and a linear scale renders as one spike.
 *
 * Two opt-in shapes for callers whose layer is not one scalar channel:
 *  - `traces` draws SEVERAL distributions over the one value axis instead of
 *    the single tinted series (the RGB card's three planes). Bars are already
 *    positioned by VALUE rather than by index, so traces with different bin
 *    edges overlay correctly with no resampling.
 *  - `showGamma={false}` drops the midtone stop entirely. For a layer whose
 *    transfer has no gamma to give — an RGB layer's shader arm compiles the
 *    `pow` out and its update mutation has no column for it — a midtone the
 *    user can drag is a control that silently does nothing.
 */

const PLOT_HEIGHT = 64;
const STRIP_HEIGHT = 11;
const GAMMA_MIN = 0.1;
const GAMMA_MAX = 9.99;
const CURVE_SAMPLES = 96;

export type LevelsValue = { min: number; max: number; gamma: number };

type DragTarget = "black" | "mid" | "white" | { stop: number; lockValue: boolean };

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Window fraction where the transfer outputs 0.5 (the midtone stop). */
const midFraction = (gamma: number) => Math.pow(0.5, 1 / clamp(gamma, GAMMA_MIN, GAMMA_MAX));

/** Piecewise-linear curve value at RAW intensity `v` (sorted stops, clamped ends). */
const curveAtRaw = (stops: readonly TransferCurveStop[], v: number): number => {
  if (v <= stops[0].position) return stops[0].value;
  const last = stops[stops.length - 1];
  if (v >= last.position) return last.value;
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i].position) {
      const a = stops[i - 1];
      const b = stops[i];
      const span = b.position - a.position;
      const f = span > 0 ? (v - a.position) / span : 0;
      return a.value + (b.value - a.value) * f;
    }
  }
  return last.value;
};

/** Bin CENTRES for a series: the server's own edges when they line up with the
 *  counts, else the domain divided evenly. */
const resolveBinValues = (
  bins: readonly number[],
  count: number,
  domainMin: number,
  domainSpan: number,
): readonly number[] => {
  if (bins.length === count && bins.length > 0) return bins;
  if (count <= 1) return [domainMin];
  return Array.from({ length: count }, (_, i) => domainMin + (domainSpan * i) / (count - 1));
};

/** Log-scaled bar heights (see the doc comment). Plain loop for the max — a
 *  spread over a 256-bin array allocates an arguments list per call. */
const resolveBarHeights = (histogram: readonly number[]): number[] => {
  let maxCount = 1;
  for (const count of histogram) if (count > maxCount) maxCount = count;
  const maxLog = Math.log1p(maxCount);
  return histogram.map((count) => (Math.log1p(Math.max(count, 0)) / maxLog) * PLOT_HEIGHT);
};

/** One series' `<rect>`s, positioned by VALUE so series with different bin
 *  edges — and domains wider than the data — land on the same axis. */
const seriesBars = (
  histogram: readonly number[],
  binValues: readonly number[],
  barHeights: readonly number[],
  fillOf: (index: number) => string,
  domainMin: number,
  domainSpan: number,
  keyPrefix: string,
): React.ReactNode[] =>
  histogram.map((_, i) => {
    const v = binValues[i] ?? domainMin;
    const h = barHeights[i];
    if (h <= 0) return null;
    // Width spans to the next bin; the last bin mirrors its predecessor's gap.
    const nextV = binValues[i + 1] ?? v + (v - (binValues[i - 1] ?? v));
    const x = ((v - domainMin) / domainSpan) * 100;
    const w = Math.max(((nextV - domainMin) / domainSpan) * 100 - x, 0.15);
    return (
      <rect
        key={`${keyPrefix}${i}`}
        x={x}
        y={PLOT_HEIGHT - h}
        width={w + 0.15}
        height={h}
        fill={fillOf(i)}
      />
    );
  });

export type LevelsTrace = {
  bins: number[];
  histogram: number[];
  /** CSS colour for this distribution's bars. */
  color: string;
};

export const LevelsEditor = ({
  bins,
  histogram,
  traces,
  value,
  colormap,
  baseColor,
  p1,
  p99,
  histMin,
  histMax,
  dtypeMin,
  dtypeMax,
  showGamma = true,
  onChange,
  stops,
  onStopsChange,
}: {
  bins: number[];
  histogram: number[];
  /** Several distributions over the one value axis, drawn with `screen`
   * blending, INSTEAD of the `bins`/`histogram` series. Empty or absent keeps
   * the single-series behaviour. */
  traces?: readonly LevelsTrace[];
  value: LevelsValue;
  colormap: ColorMap | null | undefined;
  baseColor?: number[] | null;
  p1: number | null | undefined;
  p99: number | null | undefined;
  histMin: number | null | undefined;
  histMax: number | null | undefined;
  dtypeMin: number;
  dtypeMax: number;
  /** False hides the midtone stop, its numeric field and the γ readout, and
   * takes "mid" out of the drag targets. Gamma then rides through every
   * `onChange` unchanged (1 for a layer that has none). */
  showGamma?: boolean;
  onChange: (next: LevelsValue) => void;
  /** The intensity transfer CURVE (server LookupStops). ≥2 stops = curve mode:
   * the black/mid/white handles yield to draggable curve points and gamma is
   * bypassed ("gamma is the fallback"). Editing needs `onStopsChange`. */
  stops?: TransferCurveStop[] | null;
  onStopsChange?: (stops: TransferCurveStop[] | null) => void;
}) => {
  const curve = stops && stops.length >= 2 && onStopsChange ? stops : null;
  // The histogram extent (the data-focused view). The Reset / Min/Max buttons
  // snap back to this, and it's the floor for the draggable domain.
  const plotMin = histMin ?? dtypeMin;
  const plotMax = histMax ?? dtypeMax;
  // The x domain: the histogram extent grown to always contain the current clim
  // (or the curve's outer stops) so a native/typed value is visible and
  // reachable instead of snapping back to the histogram edge.
  const domainMin = Math.min(plotMin, value.min, value.max, curve?.[0]?.position ?? Infinity);
  const domainMax = Math.max(
    plotMax,
    value.min,
    value.max,
    curve?.[curve.length - 1]?.position ?? -Infinity,
  );
  const domainSpan = Math.max(domainMax - domainMin, Number.EPSILON);
  const minSpan = domainSpan / 500;

  const gamma = clamp(value.gamma || 1, GAMMA_MIN, GAMMA_MAX);
  const black = clamp(value.min, domainMin, domainMax);
  const white = clamp(Math.max(value.max, black + minSpan), domainMin, domainMax);
  const mid = black + (white - black) * midFraction(gamma);

  const xOf = (v: number) => ((v - domainMin) / domainSpan) * 100;
  const valueAt = (ratio: number) => domainMin + clamp(ratio, 0, 1) * domainSpan;

  const binValues = useMemo(
    () => resolveBinValues(bins, histogram.length, domainMin, domainSpan),
    [bins, histogram.length, domainMin, domainSpan],
  );

  const barHeights = useMemo(() => resolveBarHeights(histogram), [histogram]);

  const barColors = useMemo(
    () =>
      histogram.map((_, i) =>
        sampleColormapCSS(colormap, histogram.length > 1 ? i / (histogram.length - 1) : 0, baseColor),
      ),
    [histogram, colormap, baseColor],
  );

  // The bar rects — one per histogram bin, often 256 per channel — are the
  // heaviest part of this subtree. CRITICALLY, this memo must NOT depend on
  // the dragged clim (`black`/`white`): it used to color each bar by
  // in-window-ness, which invalidated the memo and rebuilt + re-diffed all
  // 256 elements on EVERY drag tick. Bars are now drawn fully colored once
  // per histogram/domain change, and the out-of-window regions are dimmed by
  // two overlay rects (below) whose position is a cheap per-render attribute.
  const singleBars = useMemo(
    () =>
      seriesBars(histogram, binValues, barHeights, (i) => barColors[i], domainMin, domainSpan, ""),
    [histogram, binValues, barHeights, barColors, domainMin, domainSpan],
  );

  // Multi-series mode: one flat-coloured group per trace, composited with
  // `screen` so overlapping distributions lighten instead of hiding each
  // other — three plane histograms read as one picture, and where all three
  // agree the bar goes white, which is exactly what that region looks like.
  const traceBars = useMemo(() => {
    if (!traces || traces.length === 0) return null;
    return traces.map((trace, t) => {
      const values = resolveBinValues(trace.bins, trace.histogram.length, domainMin, domainSpan);
      const heights = resolveBarHeights(trace.histogram);
      return (
        <g key={t} style={{ mixBlendMode: "screen" }}>
          {seriesBars(
            trace.histogram,
            values,
            heights,
            () => trace.color,
            domainMin,
            domainSpan,
            `${t}:`,
          )}
        </g>
      );
    });
  }, [traces, domainMin, domainSpan]);

  const bars = traceBars ?? singleBars;

  // Transfer curve over the full domain, in plot coordinates: the piecewise
  // stop curve when active, else the clim-window + gamma power law.
  const curvePoints = useMemo(() => {
    const windowSpan = Math.max(white - black, Number.EPSILON);
    const points: string[] = [];
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
      const v = domainMin + (domainSpan * i) / CURVE_SAMPLES;
      const norm = curve
        ? curveAtRaw(curve, v)
        : Math.pow(clamp((v - black) / windowSpan, 0, 0.999), gamma);
      points.push(`${(i / CURVE_SAMPLES) * 100},${PLOT_HEIGHT - norm * PLOT_HEIGHT}`);
    }
    return points.join(" ");
  }, [domainMin, domainSpan, black, white, gamma, curve]);

  // The window the dim overlays and edge lines mark: clim, or the curve's domain.
  const windowMin = curve ? curve[0].position : black;
  const windowMax = curve ? curve[curve.length - 1].position : white;

  // --- Handle dragging -------------------------------------------------------
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    target: DragTarget;
    black: number;
    white: number;
    stops: TransferCurveStop[];
  } | null>(null);

  const ratioFromClientX = (clientX: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  };

  /** Normalized curve VALUE (1 at the plot top) from a pointer y. The plot
   * svg sits after the surface's 4px top padding, PLOT_HEIGHT px tall. */
  const valueFromClientY = (clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clamp(1 - (clientY - rect.top - 4) / PLOT_HEIGHT, 0, 1);
  };

  const inPlot = (clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    return !!rect && clientY - rect.top - 4 <= PLOT_HEIGHT + 2;
  };

  /** Nearest curve stop's index (by x), with its pixel distance. */
  const nearestStop = (clientX: number): { index: number; px: number } | null => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!curve || !rect || rect.width === 0) return null;
    const px = clientX - rect.left;
    let best = -1;
    let bestDist = Infinity;
    curve.forEach((stop, index) => {
      const dist = Math.abs(px - (xOf(stop.position) / 100) * rect.width);
      if (dist < bestDist) {
        best = index;
        bestDist = dist;
      }
    });
    return best === -1 ? null : { index: best, px: bestDist };
  };

  /** Drag start resolution. The ADD path publishes the new stop immediately
   * and returns the POST-add array — the prop hasn't re-rendered yet, and the
   * drag's neighbor clamps must index the array the drag operates on. */
  const resolveDragStart = (
    clientX: number,
    clientY: number,
  ): { target: DragTarget; stops: TransferCurveStop[] } => {
    if (curve) {
      const near = nearestStop(clientX);
      // Grabbing near a stop drags it; further away, a press in the PLOT adds
      // a stop at the pointer. Strip presses always grab the nearest stop.
      if (near && (near.px <= 10 || !inPlot(clientY))) {
        return { target: { stop: near.index, lockValue: !inPlot(clientY) }, stops: [...curve] };
      }
      const position = valueAt(ratioFromClientX(clientX));
      const added = [...curve, { position, value: valueFromClientY(clientY) }].sort(
        (a, b) => a.position - b.position,
      );
      onStopsChange?.(added);
      return {
        target: { stop: added.findIndex((s) => s.position === position), lockValue: false },
        stops: added,
      };
    }
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return { target: showGamma ? "mid" : "black", stops: [] };
    const px = clientX - rect.left;
    const candidates: [DragTarget, number][] = [
      ["black", (xOf(black) / 100) * rect.width],
      // A hidden midtone is not a drag target: grabbing an invisible handle
      // would set a gamma the caller has no use for.
      ...(showGamma ? ([["mid", (xOf(mid) / 100) * rect.width]] as [DragTarget, number][]) : []),
      ["white", (xOf(white) / 100) * rect.width],
    ];
    candidates.sort((a, b) => Math.abs(px - a[1]) - Math.abs(px - b[1]));
    return { target: candidates[0][0], stops: [] };
  };

  const applyDrag = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const v = valueAt(ratioFromClientX(clientX));
    if (typeof drag.target === "object") {
      const { stop, lockValue } = drag.target;
      const reference = drag.stops;
      if (!onStopsChange || stop < 0 || stop >= reference.length) return;
      // Keep the stop between its (drag-start) neighbors so order never flips.
      const lo = stop > 0 ? reference[stop - 1].position + minSpan : domainMin;
      const hi =
        stop < reference.length - 1 ? reference[stop + 1].position - minSpan : domainMax;
      const next = reference.map((entry, index) =>
        index === stop
          ? {
              position: clamp(v, Math.min(lo, hi), Math.max(lo, hi)),
              value: lockValue ? entry.value : valueFromClientY(clientY),
            }
          : entry,
      );
      onStopsChange(next);
      return;
    }
    if (drag.target === "black") {
      onChange({ min: clamp(v, domainMin, drag.white - minSpan), max: drag.white, gamma });
    } else if (drag.target === "white") {
      onChange({ min: drag.black, max: clamp(v, drag.black + minSpan, domainMax), gamma });
    } else {
      const t = clamp((v - drag.black) / Math.max(drag.white - drag.black, Number.EPSILON), 0.02, 0.98);
      const nextGamma = clamp(Math.log(0.5) / Math.log(t), GAMMA_MIN, GAMMA_MAX);
      onChange({ min: drag.black, max: drag.white, gamma: nextGamma });
    }
  };

  // rAF-coalesced drag: pointermove fires 60–120×/s and every `onChange` used
  // to commit the whole chain synchronously — layer store write → full card
  // editor re-render → GPU uniform rebuild — PER EVENT. One rAF slot holds
  // the latest clientX and applies it once per frame; pointerup flushes.
  const dragRafRef = useRef<number | null>(null);
  const pendingClientRef = useRef({ x: 0, y: 0 });

  const flushDrag = () => {
    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    if (dragRef.current) applyDrag(pendingClientRef.current.x, pendingClientRef.current.y);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = resolveDragStart(event.clientX, event.clientY);
    dragRef.current = { target: start.target, black, white, stops: start.stops };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    applyDrag(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    pendingClientRef.current = { x: event.clientX, y: event.clientY };
    if (dragRafRef.current === null) {
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        if (dragRef.current) applyDrag(pendingClientRef.current.x, pendingClientRef.current.y);
      });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    flushDrag(); // the release position must land even mid-frame
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /** Double-click a curve stop removes it (a curve keeps at least two). */
  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!curve || !onStopsChange || curve.length <= 2) return;
    const near = nearestStop(event.clientX);
    if (near && near.px <= 10) {
      onStopsChange(curve.filter((_, index) => index !== near.index));
    }
  };

  // --- Numeric drafts --------------------------------------------------------
  const [draft, setDraft] = useState<{ min?: string; gamma?: string; max?: string }>({});
  const commitDraft = () => {
    const parsedMin = draft.min !== undefined ? Number.parseFloat(draft.min) : value.min;
    const parsedMax = draft.max !== undefined ? Number.parseFloat(draft.max) : value.max;
    const parsedGamma = draft.gamma !== undefined ? Number.parseFloat(draft.gamma) : gamma;
    setDraft({});
    if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax) || !Number.isFinite(parsedGamma))
      return;
    onChange({
      min: parsedMin,
      max: Math.max(parsedMax, parsedMin + minSpan),
      gamma: clamp(parsedGamma, GAMMA_MIN, GAMMA_MAX),
    });
  };
  const draftProps = (key: "min" | "gamma" | "max", current: string) => ({
    value: draft[key] ?? current,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((d) => ({ ...d, [key]: event.target.value })),
    onBlur: commitDraft,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitDraft();
      }
    },
  });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Levels</span>
        <span className="font-mono">
          {formatContrastValue(windowMin)} – {formatContrastValue(windowMax)}
          {curve ? (
            <span className="text-muted-foreground"> · curve ({curve.length})</span>
          ) : (
            showGamma && <span className="text-muted-foreground"> · γ {gamma.toFixed(2)}</span>
          )}
        </span>
      </div>

      <div
        ref={surfaceRef}
        className={`${curve ? "cursor-crosshair" : "cursor-ew-resize"} touch-none select-none rounded border border-white/10 bg-black/25 px-0 pt-1`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <svg
          className="block w-full"
          viewBox={`0 0 100 ${PLOT_HEIGHT}`}
          preserveAspectRatio="none"
          style={{ height: PLOT_HEIGHT }}
        >
          <rect x={0} y={0} width={100} height={PLOT_HEIGHT} fill="rgba(0,0,0,0.3)" />
          {bars}
          {/* Out-of-window dimming: two overlay rects instead of per-bar
              recoloring — dragging a stop moves an attribute on TWO elements
              rather than rebuilding all ~256 bar rects (see the bars memo). */}
          {xOf(windowMin) > 0 && (
            <rect x={0} y={0} width={xOf(windowMin)} height={PLOT_HEIGHT} fill="rgba(0,0,0,0.6)" />
          )}
          {xOf(windowMax) < 100 && (
            <rect
              x={xOf(windowMax)}
              y={0}
              width={100 - xOf(windowMax)}
              height={PLOT_HEIGHT}
              fill="rgba(0,0,0,0.6)"
            />
          )}
          {/* Transfer curve + its window edges. */}
          {[windowMin, windowMax].map((v, i) => (
            <line
              key={i}
              x1={xOf(v)}
              y1={0}
              x2={xOf(v)}
              y2={PLOT_HEIGHT}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={0.4}
              strokeDasharray="2,2"
            />
          ))}
          <polyline
            points={curvePoints}
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={0.9}
            vectorEffect="non-scaling-stroke"
          />
          {/* Curve control points: drag (both axes in the plot), double-click
              to remove, press empty plot to add. */}
          {curve?.map((stop, index) => (
            <circle
              key={index}
              cx={xOf(stop.position)}
              cy={PLOT_HEIGHT - stop.value * PLOT_HEIGHT}
              r={2.4}
              fill="#38bdf8"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Handle strip: black/mid/white in gamma mode; one triangle per
            curve stop (shaded by its VALUE) in curve mode. */}
        <svg
          className="block w-full"
          viewBox={`0 0 100 ${STRIP_HEIGHT}`}
          preserveAspectRatio="none"
          style={{ height: STRIP_HEIGHT + 3 }}
        >
          {(curve
            ? curve.map((stop): [number, string] => {
                const shade = Math.round(10 + stop.value * 240);
                return [stop.position, `rgb(${shade},${shade},${shade})`];
              })
            : ([
                [black, "#0a0a0a"],
                ...(showGamma ? [[mid, "#9ca3af"] as [number, string]] : []),
                [white, "#fafafa"],
              ] as [number, string][])
          ).map(([v, fill], i) => {
            const x = xOf(v);
            return (
              <polygon
                key={i}
                points={`${x},1 ${x + 2.2},${STRIP_HEIGHT} ${x - 2.2},${STRIP_HEIGHT}`}
                fill={fill}
                stroke="rgba(255,255,255,0.65)"
                strokeWidth={0.3}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>

      {!curve && (
        <div className={`grid gap-1 ${showGamma ? "grid-cols-3" : "grid-cols-2"}`}>
          <Input
            {...draftProps("min", String(value.min))}
            className="h-6 px-2 text-[10px] font-mono"
            title="Black point"
          />
          {showGamma && (
            <Input
              {...draftProps("gamma", gamma.toFixed(2))}
              className="h-6 px-2 text-center text-[10px] font-mono"
              title="Gamma (midtone)"
            />
          )}
          <Input
            {...draftProps("max", String(value.max))}
            className="h-6 px-2 text-right text-[10px] font-mono"
            title="White point"
          />
        </div>
      )}

      {curve ? (
        <div className="flex items-center gap-0.5">
          <span className="flex-1 truncate px-1 text-[9px] text-muted-foreground">
            drag points · press plot to add · double-click to remove
          </span>
          <Button
            variant="ghost"
            size="xs"
            className="h-5 px-1.5 text-[10px]"
            title="Back to the clim + gamma transfer (the curve is discarded on save)"
            onClick={() => onStopsChange?.(null)}
          >
            <RotateCcw className="mr-0.5 h-2.5 w-2.5" />
            Use gamma
          </Button>
        </div>
      ) : (
        <div className="flex gap-0.5">
          {p1 != null && p99 != null && (
            <Button
              variant="ghost"
              size="xs"
              className="h-5 flex-1 px-1 text-[10px]"
              onClick={() => onChange({ min: p1, max: Math.max(p99, p1 + minSpan), gamma })}
            >
              Auto
            </Button>
          )}
          {histMin != null && histMax != null && (
            <Button
              variant="ghost"
              size="xs"
              className="h-5 flex-1 px-1 text-[10px]"
              onClick={() => onChange({ min: histMin, max: histMax, gamma })}
            >
              Min/Max
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            className="h-5 flex-1 px-1 text-[10px]"
            onClick={() => onChange({ min: dtypeMin, max: dtypeMax, gamma })}
            title="Full dtype range"
          >
            <Maximize2 className="mr-0.5 h-2.5 w-2.5" />
            Full
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="h-5 flex-1 px-1 text-[10px]"
            onClick={() => onChange({ min: plotMin, max: plotMax, gamma: 1 })}
          >
            <RotateCcw className="mr-0.5 h-2.5 w-2.5" />
            Reset
          </Button>
          {onStopsChange && (
            <Button
              variant="ghost"
              size="xs"
              className="h-5 flex-1 px-1 text-[10px]"
              title="Switch to a multi-point transfer curve (seeded from the current levels; gamma becomes the fallback)"
              onClick={() =>
                onStopsChange([
                  { position: black, value: 0 },
                  { position: mid, value: 0.5 },
                  { position: white, value: 1 },
                ])
              }
            >
              <Spline className="mr-0.5 h-2.5 w-2.5" />
              Curve
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
