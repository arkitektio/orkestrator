import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Eraser } from "lucide-react";

import { RowAction, Segment, SegmentGroup } from "@/core/data/scene/layerui/cardControls";
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
import { phasorPlotGeometry } from "./phasorPlotGeometry";

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
 *
 * The plot takes the WIDTH it is given and derives its height
 * (`phasorPlotGeometry`): g and s share one scale, so a circle cursor is drawn
 * as the circle `cursorHit` tests.
 *
 * What is being drawn — the tool, the unfinished shape — is a `PhasorDraw` the
 * HOST owns (`usePhasorDraw`), so the tool buttons (`PhasorPlotTools`) can sit
 * wherever the host's layout puts them: in a card section's title line, or
 * under the plot in a graph node.
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

/** The drawing in progress: which tool is armed and the shape so far. */
export type PhasorDraw = {
  tool: PhasorCursorKind | null;
  draft: Draft;
  /** Arm a tool, or disarm it when it is the armed one. Drops the draft. */
  pickTool: (tool: PhasorCursorKind) => void;
  setDraft: (draft: Draft) => void;
  /** Add the finished cursor and disarm. */
  commit: (cursor: PhasorCursorDef) => void;
  /** Whether the polygon being drawn has enough corners to close. */
  canClose: boolean;
  closePolygon: () => void;
};

export const usePhasorDraw = (
  cursors: PhasorCursorDef[],
  onCursorsChange: (cursors: PhasorCursorDef[]) => void,
): PhasorDraw => {
  const [tool, setTool] = useState<PhasorCursorKind | null>(null);
  const [draft, setDraft] = useState<Draft>(null);

  const commit = (cursor: PhasorCursorDef) => {
    onCursorsChange([...cursors, cursor]);
    setDraft(null);
    setTool(null);
  };
  const canClose = draft?.kind === PhasorCursorKind.Polygon && draft.points.length >= 3;

  return {
    tool,
    draft,
    pickTool: (next) => {
      setDraft(null);
      setTool(tool === next ? null : next);
    },
    setDraft,
    commit,
    canClose,
    closePolygon: () => {
      if (draft && canClose) commit(polygonCursor(draft.points));
    },
  };
};

/**
 * The plot's tools, in the layer cards' control vocabulary: the two shapes as
 * one segmented group (they are mutually exclusive), then the actions that only
 * exist sometimes — close the polygon being drawn, remove every cursor.
 */
export const PhasorPlotTools = ({
  draw,
  cursors,
  onCursorsChange,
}: {
  draw: PhasorDraw;
  cursors: PhasorCursorDef[];
  onCursorsChange: (cursors: PhasorCursorDef[]) => void;
}) => (
  <div className="flex items-center gap-1">
    {draw.canClose && (
      <RowAction title="Close the polygon" onClick={draw.closePolygon}>
        <Check className="h-2.5 w-2.5" />
      </RowAction>
    )}
    {cursors.length > 0 && (
      <RowAction title="Remove every cursor" danger onClick={() => onCursorsChange([])}>
        <Eraser className="h-2.5 w-2.5" />
      </RowAction>
    )}
    <SegmentGroup>
      <Segment
        active={draw.tool === PhasorCursorKind.Circle}
        title="Draw a circle cursor: drag on the plot from its centre"
        onClick={() => draw.pickTool(PhasorCursorKind.Circle)}
      >
        circle
      </Segment>
      <Segment
        active={draw.tool === PhasorCursorKind.Polygon}
        title="Draw a polygon cursor: click its corners, then the first one again"
        onClick={() => draw.pickTool(PhasorCursorKind.Polygon)}
      >
        polygon
      </Segment>
    </SegmentGroup>
  </div>
);

export const PhasorPlot = ({
  histogram,
  cursors,
  scale,
  draw,
  onCursorsChange,
  className,
}: {
  histogram: PhasorHistogramData | null;
  cursors: PhasorCursorDef[];
  scale: PhasorScale;
  draw: PhasorDraw;
  onCursorsChange: (cursors: PhasorCursorDef[]) => void;
  className?: string;
}) => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const { tool, draft, setDraft, commit } = draw;

  // The plot is as wide as its host: a card in a three-column panel and the
  // same card in a float are different widths, and neither is 220px.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setWidth(Math.floor(frame.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

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

  const geometry = useMemo(() => phasorPlotGeometry(extent, width), [extent, width]);
  const { toPixel, toPhasor, height } = geometry;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || width <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    drawDensity(context, histogram, toPixel);
    drawSemicircle(context, toPixel, scale);
    // Same color rule as the shader (`writeCursors`), so a cursor on the plot is
    // drawn in exactly the color it paints the image with.
    cursors.forEach((cursor, i) => drawCursor(context, cursor, i, toPixel));
    if (draft) drawDraft(context, draft, hover, toPixel);
  }, [histogram, cursors, scale, draft, hover, toPixel, width, height]);

  const pointerPhasor = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return toPhasor(event.clientX - rect.left, event.clientY - rect.top);
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

    // Polygon: click to add a vertex; click near the first one (or the close
    // action in `PhasorPlotTools`) to finish.
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
    // `dark`: the plot is a black surface in either theme, like the levels
    // histogram, so its white strokes always have something to sit on.
    <div
      ref={frameRef}
      className={cn(
        "dark w-full overflow-hidden rounded border border-foreground/10 bg-background/85",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        className={cn("block touch-none", tool ? "cursor-crosshair" : "cursor-pointer")}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          if (draft?.kind === PhasorCursorKind.Circle) setDraft(null);
        }}
      />
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
