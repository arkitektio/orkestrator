import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/core/ui/button";
import { PhasorCursorKind } from "@/mikro/api/graphql";
import { cn } from "@/core/util/utils";
import {
  UNIVERSAL_SEMICIRCLE,
  cursorHit,
  cursorPaletteColor,
  singleExponentialPhasor,
  type PhasorScale,
} from "../../platform/model/phasor";
import type { PhasorCursorDef } from "../../platform/model/renderGraph";

/**
 * The classic phasor plot: the (g, s) density of the layer's phasor, the
 * universal semicircle every single-exponential decay lies on, and the node's
 * cursors drawn on top.
 *
 * The cursors are the point of it — they are a color RULE on the image (circle
 * a lobe of the density, and the pixels whose phasor falls in it get painted),
 * not a plot widget. So the plot is an editor: drag to place a CIRCLE, click to
 * lay down POLYGON vertices.
 *
 * The density comes from `PhasorContext.phasorHistogram`, computed after ingest
 * by a task that read the whole cube — which is exactly why a client can range
 * the overlay without reading it back itself.
 */

export type PhasorHistogramData = {
  bins: number;
  /** Flattened bins × bins, row-major with s outermost. */
  counts: number[];
  gMin: number;
  gMax: number;
  sMin: number;
  sMax: number;
};

type Draft = { kind: PhasorCursorKind; points: [number, number][] } | null;

const SIZE = 220;
const PADDING = 18;

export const PhasorPlot = ({
  histogram,
  cursors,
  scale,
  onCursorsChange,
  className,
}: {
  histogram: PhasorHistogramData | null;
  cursors: PhasorCursorDef[];
  scale: PhasorScale;
  onCursorsChange: (cursors: PhasorCursorDef[]) => void;
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<PhasorCursorKind | null>(null);
  const [draft, setDraft] = useState<Draft>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);

  // The plot's own extent. The histogram states the range it was computed over;
  // without one, show the whole reachable half-plane (a phasor lives in the
  // upper half of the unit circle).
  const extent = useMemo(
    () => ({
      gMin: histogram?.gMin ?? -0.05,
      gMax: histogram?.gMax ?? 1.05,
      sMin: histogram?.sMin ?? -0.05,
      sMax: histogram?.sMax ?? 0.7,
    }),
    [histogram],
  );

  const toPixel = useMemo(() => {
    const width = SIZE - 2 * PADDING;
    return (g: number, s: number): [number, number] => [
      PADDING + ((g - extent.gMin) / (extent.gMax - extent.gMin)) * width,
      // s grows upward on the plot, downward in canvas coords.
      SIZE - PADDING - ((s - extent.sMin) / (extent.sMax - extent.sMin)) * width,
    ];
  }, [extent]);

  const toPhasor = useMemo(() => {
    const width = SIZE - 2 * PADDING;
    return (x: number, y: number): [number, number] => [
      extent.gMin + ((x - PADDING) / width) * (extent.gMax - extent.gMin),
      extent.sMin + ((SIZE - PADDING - y) / width) * (extent.sMax - extent.sMin),
    ];
  }, [extent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, SIZE, SIZE);

    drawDensity(context, histogram, toPixel, extent);
    drawSemicircle(context, toPixel, scale);
    // Same color rule as the shader (`writeCursors`), so a cursor on the plot is
    // drawn in exactly the color it paints the image with.
    cursors.forEach((cursor, i) => drawCursor(context, cursor, i, toPixel));
    if (draft) drawDraft(context, draft, hover, toPixel);
  }, [histogram, cursors, scale, draft, hover, toPixel, extent]);

  const pointerPhasor = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return toPhasor(event.clientX - rect.left, event.clientY - rect.top);
  };

  const commit = (cursor: PhasorCursorDef) => {
    onCursorsChange([...cursors, cursor]);
    setDraft(null);
    setTool(null);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const [g, s] = pointerPhasor(event);

    if (!tool) {
      // No tool: clicking an existing cursor toggles it off/on, which is the
      // fastest way to see what it was actually painting.
      const hit = cursors.findIndex((cursor) => cursorHit(g, s, cursor));
      if (hit !== -1) {
        onCursorsChange(
          cursors.map((cursor, i) =>
            i === hit ? { ...cursor, visible: !cursor.visible } : cursor,
          ),
        );
      }
      return;
    }

    if (tool === PhasorCursorKind.Circle) {
      setDraft({ kind: PhasorCursorKind.Circle, points: [[g, s]] });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    // Polygon: click to add a vertex; click near the first one (or press Close)
    // to finish.
    const points = draft?.points ?? [];
    if (points.length >= 3) {
      const [fg, fs] = points[0];
      if (Math.hypot(g - fg, s - fs) < 0.03) {
        commit(polygonCursor(points));
        return;
      }
    }
    setDraft({ kind: PhasorCursorKind.Polygon, points: [...points, [g, s]] });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!tool && !draft) return;
    setHover(pointerPhasor(event));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (draft?.kind !== PhasorCursorKind.Circle) return;
    const [g, s] = pointerPhasor(event);
    const [cg, cs] = draft.points[0];
    const radius = Math.hypot(g - cg, s - cs);
    if (radius < 0.005) {
      setDraft(null);
      return;
    }
    commit({
      kind: PhasorCursorKind.Circle,
      label: null,
      visible: true,
      color: null,
      g: cg,
      s: cs,
      radius,
      points: null,
    });
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <canvas
        ref={canvasRef}
        style={{ width: SIZE, height: SIZE }}
        className={cn(
          "rounded border border-border/40 bg-black/40",
          tool ? "cursor-crosshair" : "cursor-pointer",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      <div className="flex items-center gap-1">
        <Button
          variant={tool === PhasorCursorKind.Circle ? "secondary" : "ghost"}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => {
            setDraft(null);
            setTool(tool === PhasorCursorKind.Circle ? null : PhasorCursorKind.Circle);
          }}
        >
          Circle
        </Button>
        <Button
          variant={tool === PhasorCursorKind.Polygon ? "secondary" : "ghost"}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => {
            setDraft(null);
            setTool(tool === PhasorCursorKind.Polygon ? null : PhasorCursorKind.Polygon);
          }}
        >
          Polygon
        </Button>
        {draft && draft.points.length >= 3 && (
          <Button
            variant="secondary"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => commit(polygonCursor(draft.points))}
          >
            Close
          </Button>
        )}
        {cursors.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground"
            onClick={() => onCursorsChange([])}
          >
            Clear
          </Button>
        )}
      </div>

      {!histogram && (
        <span className="text-[10px] text-muted-foreground">
          No phasor distribution computed for this lens yet — cursors still work.
        </span>
      )}
    </div>
  );
};

const polygonCursor = (points: [number, number][]): PhasorCursorDef => ({
  kind: PhasorCursorKind.Polygon,
  label: null,
  visible: true,
  color: null,
  g: null,
  s: null,
  radius: null,
  points: points.map(([g, s]) => [g, s]),
});

type ToPixel = (g: number, s: number) => [number, number];

/** Log-scaled, like the intensity histogram in LevelsEditor: a phasor density is
 * dominated by the background lobe, and a linear scale shows nothing else. */
function drawDensity(
  context: CanvasRenderingContext2D,
  histogram: PhasorHistogramData | null,
  toPixel: ToPixel,
  extent: { gMin: number; gMax: number; sMin: number; sMax: number },
): void {
  if (!histogram || histogram.bins <= 0) return;

  const { bins, counts } = histogram;
  let peak = 0;
  for (const count of counts) peak = Math.max(peak, count);
  if (peak <= 0) return;

  const gStep = (histogram.gMax - histogram.gMin) / bins;
  const sStep = (histogram.sMax - histogram.sMin) / bins;
  const scale = 1 / Math.log1p(peak);

  for (let si = 0; si < bins; si++) {
    for (let gi = 0; gi < bins; gi++) {
      const count = counts[si * bins + gi] ?? 0;
      if (count <= 0) continue;
      const intensity = Math.log1p(count) * scale;
      const g0 = histogram.gMin + gi * gStep;
      const s0 = histogram.sMin + si * sStep;
      const [x0, y0] = toPixel(g0, s0);
      const [x1, y1] = toPixel(g0 + gStep, s0 + sStep);
      context.fillStyle = `rgba(120, 190, 255, ${intensity.toFixed(3)})`;
      context.fillRect(
        Math.min(x0, x1),
        Math.min(y0, y1),
        Math.abs(x1 - x0) + 0.5,
        Math.abs(y1 - y0) + 0.5,
      );
    }
  }
  void extent;
}

/**
 * The universal semicircle (centre (0.5, 0), radius 0.5) plus lifetime ticks
 * along it: every single-exponential decay lands ON the arc, and a mixture
 * falls inside it — which is the whole reason to look at a phasor plot.
 */
function drawSemicircle(
  context: CanvasRenderingContext2D,
  toPixel: ToPixel,
  scale: PhasorScale,
): void {
  context.strokeStyle = "rgba(255,255,255,0.35)";
  context.lineWidth = 1;
  context.beginPath();
  for (let i = 0; i <= 64; i++) {
    const angle = (Math.PI * i) / 64;
    const g = UNIVERSAL_SEMICIRCLE.centerG + UNIVERSAL_SEMICIRCLE.radius * Math.cos(angle);
    const s = UNIVERSAL_SEMICIRCLE.centerS + UNIVERSAL_SEMICIRCLE.radius * Math.sin(angle);
    const [x, y] = toPixel(g, s);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();

  // Axes.
  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.beginPath();
  const [ox, oy] = toPixel(0, 0);
  const [ex] = toPixel(1, 0);
  const [, ey] = toPixel(0, 0.6);
  context.moveTo(ox, oy);
  context.lineTo(ex, oy);
  context.moveTo(ox, oy);
  context.lineTo(ox, ey);
  context.stroke();

  if (scale.omega === null || scale.dimension !== "time") return;

  // Lifetime ticks (in ns — the base time unit here is ms).
  context.fillStyle = "rgba(255,255,255,0.55)";
  context.font = "9px ui-monospace, monospace";
  for (const tauNs of [0.5, 1, 2, 4, 8]) {
    const { g, s } = singleExponentialPhasor(tauNs * 1e-6, scale);
    if (g < 0 || g > 1) continue;
    const [x, y] = toPixel(g, s);
    context.beginPath();
    context.arc(x, y, 1.6, 0, Math.PI * 2);
    context.fill();
    context.fillText(`${tauNs}`, x + 3, y - 3);
  }
}

function drawCursor(
  context: CanvasRenderingContext2D,
  cursor: PhasorCursorDef,
  index: number,
  toPixel: ToPixel,
): void {
  const rgb = cursor.color ?? cursorPaletteColor(index);
  const color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

  context.strokeStyle = color;
  context.lineWidth = cursor.visible ? 1.6 : 0.8;
  context.setLineDash(cursor.visible ? [] : [3, 3]);
  context.fillStyle = withAlpha(color, cursor.visible ? 0.18 : 0.06);

  context.beginPath();
  if (cursor.kind === PhasorCursorKind.Polygon && cursor.points?.length) {
    cursor.points.forEach(([g, s], i) => {
      const [x, y] = toPixel(g, s);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
  } else if (cursor.radius) {
    const [cx, cy] = toPixel(cursor.g ?? 0, cursor.s ?? 0);
    const [ex] = toPixel((cursor.g ?? 0) + cursor.radius, cursor.s ?? 0);
    context.arc(cx, cy, Math.abs(ex - cx), 0, Math.PI * 2);
  }
  context.fill();
  context.stroke();
  context.setLineDash([]);
}

function drawDraft(
  context: CanvasRenderingContext2D,
  draft: NonNullable<Draft>,
  hover: [number, number] | null,
  toPixel: ToPixel,
): void {
  context.strokeStyle = "rgba(255,255,255,0.8)";
  context.setLineDash([4, 3]);
  context.lineWidth = 1;
  context.beginPath();

  if (draft.kind === PhasorCursorKind.Circle && hover) {
    const [cg, cs] = draft.points[0];
    const [cx, cy] = toPixel(cg, cs);
    const radius = Math.hypot(hover[0] - cg, hover[1] - cs);
    const [ex] = toPixel(cg + radius, cs);
    context.arc(cx, cy, Math.abs(ex - cx), 0, Math.PI * 2);
  } else {
    const points = hover ? [...draft.points, hover] : draft.points;
    points.forEach(([g, s], i) => {
      const [x, y] = toPixel(g, s);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
  }

  context.stroke();
  context.setLineDash([]);
}

const withAlpha = (color: string, alpha: number): string => {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return color;
  const [r, g, b] = match[1].split(",").map((part) => parseFloat(part));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
