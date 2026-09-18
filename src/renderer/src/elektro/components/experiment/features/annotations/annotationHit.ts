import { pixelAtTime } from "../../platform/camera/rangeToCamera";
import { valueToY } from "../../platform/coords/rowMap";
import type { AnnotationMarks } from "./annotationGeometry";

/**
 * Which annotation is under a click — the SELECT tool's hit test, in PIXELS, so
 * the tolerance is the same at every zoom.
 *
 * Priority follows what is drawn on top: a value shape (a line over a trace)
 * first, then an instant, then an epoch — the narrowest epoch wins where they
 * nest, so a short epoch inside a long one stays selectable.
 *
 * Pure — runs in node.
 */

export const SHAPE_SLOP_PX = 5;
export const EVENT_SLOP_PX = 4;

type BandLike = { bottom: number; top: number };

export type HitContext = {
  window: { start: number; end: number };
  widthPx: number;
  heightPx: number;
  rowCount: number;
  bands: Record<string, BandLike>;
  climOf: (band: BandLike) => { lo: number; hi: number } | null;
};

/** World y (row units) → surface pixel; the inverse of `yAtPixel`. */
const pixelAtY = (y: number, heightPx: number, rowCount: number) =>
  (-y / Math.max(1, rowCount)) * heightPx;

/** Distance from a point to a segment, in pixels. */
export const segmentDistance = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t = length2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

export const hitAnnotation = (
  marksByLayer: Readonly<Record<string, AnnotationMarks>>,
  /** Visible annotation layers, in draw order. */
  layerIds: readonly string[],
  px: number,
  py: number,
  ctx: HitContext,
): string | null => {
  const x = (time: number) => pixelAtTime(time, ctx.widthPx, ctx.window);

  // 1. Value shapes, drawn over their trace rows.
  let bestShape: { id: string; d: number } | null = null;
  for (const layerId of layerIds) {
    for (const row of marksByLayer[layerId]?.rows ?? []) {
      const band = ctx.bands[`${row.traceLayerId}:${row.channel}`];
      const clim = band ? ctx.climOf(band) : null;
      if (!band || !clim) continue;
      const { scale, offset } = valueToY(band, clim);
      const y = (value: number) => pixelAtY(scale * value + offset, ctx.heightPx, ctx.rowCount);
      for (const shape of row.shapes) {
        const n = shape.times.length;
        const edges = shape.closed ? n : n - 1;
        for (let i = 0; i < edges; i++) {
          const j = (i + 1) % n;
          const d = segmentDistance(px, py, x(shape.times[i]), y(shape.values[i]), x(shape.times[j]), y(shape.values[j]));
          if (d <= SHAPE_SLOP_PX && (!bestShape || d < bestShape.d)) bestShape = { id: shape.id, d };
        }
      }
    }
  }
  if (bestShape) return bestShape.id;

  // 2. Instants, across every row.
  let bestEvent: { id: string; d: number } | null = null;
  for (const layerId of layerIds) {
    for (const event of marksByLayer[layerId]?.events ?? []) {
      const d = Math.abs(x(event.time) - px);
      if (d <= EVENT_SLOP_PX && (!bestEvent || d < bestEvent.d)) {
        bestEvent = { id: event.annotationId, d };
      }
    }
  }
  if (bestEvent) return bestEvent.id;

  // 3. Epochs: inside the span, the narrowest wins.
  let bestEpoch: { id: string; width: number } | null = null;
  for (const layerId of layerIds) {
    for (const epoch of marksByLayer[layerId]?.epochs ?? []) {
      const x0 = x(epoch.start);
      const x1 = Math.max(x(epoch.end), x0 + 1);
      if (px < x0 - EVENT_SLOP_PX || px > x1 + EVENT_SLOP_PX) continue;
      if (!bestEpoch || x1 - x0 < bestEpoch.width) bestEpoch = { id: epoch.id, width: x1 - x0 };
    }
  }
  return bestEpoch?.id ?? null;
};
