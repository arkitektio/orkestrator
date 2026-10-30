/**
 * Per-shape annotation styling, pure and canvas-free — an AnnotationLayer
 * draws a whole collection, so stroke and fill live on each Annotation rather
 * than on the layer. Shared so the browse card's glyph paints a shape in the
 * same colors the scene does.
 */

export const DEFAULT_STROKE = "#38bdf8";
export const ACTIVE_STROKE = "#f59e0b";
/** The shape under the pointer: near-white, so it reads on any stroke color
 * and apart from the amber selection (which wins when both apply). */
export const HOVER_STROKE = "#f8fafc";
/** Every existing shape while a new one is half-drawn: out of the way, and it
 * says they are not clickable right now. */
export const MUTED_STROKE = "#6b7280";
/** Fill alpha for a shape that asks to be filled but names no fill color. */
export const IMPLIED_FILL_OPACITY = 0.08;

export type ShapeStyle = {
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
  fill: string | null;
  fillOpacity: number;
};

/**
 * A selected shape is drawn in the selection color regardless of its own — the
 * point of the highlight is that it overrides. Shared by the per-shape
 * renderer and the merged outline batch so the two paint identically. Muted
 * wins over both: while a shape is being drawn, nothing else asks for attention.
 */
export function resolveStyle(
  annotation: {
    strokeColor?: readonly number[] | null;
    fillColor?: readonly number[] | null;
    strokeWidth?: number | null;
    filled?: boolean | null;
  },
  isActive: boolean,
  isHovered = false,
  isMuted = false,
): ShapeStyle {
  const stroke = rgbaToStyle(annotation.strokeColor);
  const fill = rgbaToStyle(annotation.fillColor);
  const strokeColor = isMuted
    ? MUTED_STROKE
    : isActive
      ? ACTIVE_STROKE
      : isHovered
        ? HOVER_STROKE
        : (stroke?.color ?? DEFAULT_STROKE);

  return {
    stroke: strokeColor,
    strokeOpacity: !isMuted && (isActive || isHovered) ? 1 : (stroke?.opacity ?? 1),
    strokeWidth: annotation.strokeWidth ?? 1.5,
    fill: annotation.filled ? (isMuted ? MUTED_STROKE : (fill?.color ?? strokeColor)) : null,
    fillOpacity: fill?.opacity ?? IMPLIED_FILL_OPACITY,
  };
}

/** RGBA as four 0-255 ints (the schema's `[Int!]`) → a three-ready color + alpha. */
export function rgbaToStyle(
  rgba: readonly number[] | null | undefined,
): { color: string; opacity: number } | null {
  if (!rgba || rgba.length < 3) return null;
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  const alpha = rgba[3];
  return {
    color: `#${channel(rgba[0])}${channel(rgba[1])}${channel(rgba[2])}`,
    opacity: alpha === undefined ? 1 : Math.max(0, Math.min(1, alpha / 255)),
  };
}
