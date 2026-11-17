/**
 * Where a phasor lands on the plot, and back.
 *
 * ONE scale for both axes. A phasor cursor is a circle in (g, s) and
 * `cursorHit` tests it as one, so a plot that stretched s against g would draw
 * an ellipse the pointer does not agree with — and the universal semicircle
 * would not be a semicircle. The plot's HEIGHT therefore follows from its width
 * and the extent, rather than being a second free number.
 */

export type PhasorExtent = { gMin: number; gMax: number; sMin: number; sMax: number };

export type PhasorPlotGeometry = {
  width: number;
  height: number;
  /** Pixels per phasor unit, the same along g and s. */
  scale: number;
  toPixel: (g: number, s: number) => [number, number];
  toPhasor: (x: number, y: number) => [number, number];
};

/** Room for the tick labels and for a cursor drawn at the extent's edge. */
export const PLOT_PADDING = 12;

export const phasorPlotGeometry = (extent: PhasorExtent, width: number): PhasorPlotGeometry => {
  const gSpan = Math.max(extent.gMax - extent.gMin, 1e-6);
  const sSpan = Math.max(extent.sMax - extent.sMin, 1e-6);
  const inner = Math.max(width - 2 * PLOT_PADDING, 1);
  // The wider span sets the scale, so an extent taller than it is wide (a
  // histogram computed over an odd range) cannot make the plot taller than the
  // card is wide; g is then centred in the width it does not fill.
  const scale = inner / Math.max(gSpan, sSpan);
  const height = Math.round(sSpan * scale + 2 * PLOT_PADDING);
  const left = (width - gSpan * scale) / 2;
  const bottom = height - PLOT_PADDING;
  return {
    width,
    height,
    scale,
    toPixel: (g, s) => [left + (g - extent.gMin) * scale, bottom - (s - extent.sMin) * scale],
    toPhasor: (x, y) => [extent.gMin + (x - left) / scale, extent.sMin + (bottom - y) / scale],
  };
};
