/**
 * The 2-D view of a plane: which rectangle of data space fills the canvas, and
 * the gestures that move it.
 *
 * The 1-D plot engine has a time window and stacked value rows. A plane has two
 * equal axes -- a scatter of `area` against `volume`, a histogram of `area`
 * against its counts, a grid of genes against cells -- so its view is simply an
 * axis-aligned rectangle, and every gesture is a map from one rectangle to the
 * next.
 *
 * Pure -- runs in node.
 */

export type PlaneView = { x0: number; x1: number; y0: number; y1: number };
export type PlaneExtent = PlaneView;

/** Which axes a gesture acts on. */
export type PlaneAxes = "both" | "x" | "y";

const width = (v: PlaneView) => v.x1 - v.x0;
const height = (v: PlaneView) => v.y1 - v.y0;

/** The smallest span a view may shrink to, relative to the extent: past it, floats run out. */
export const MIN_RELATIVE_SPAN = 1e-9;

export const isValidView = (v: PlaneView): boolean =>
  [v.x0, v.x1, v.y0, v.y1].every(Number.isFinite) && width(v) > 0 && height(v) > 0;

/** An extent padded by a fraction on every side; a zero-width side opens to one unit. */
export const padded = (extent: PlaneExtent, fraction = 0.05): PlaneView => {
  const w = width(extent) > 0 ? width(extent) : Math.max(1, Math.abs(extent.x0));
  const h = height(extent) > 0 ? height(extent) : Math.max(1, Math.abs(extent.y0));
  const cx = (extent.x0 + extent.x1) / 2;
  const cy = (extent.y0 + extent.y1) / 2;
  return {
    x0: cx - (w / 2) * (1 + 2 * fraction),
    x1: cx + (w / 2) * (1 + 2 * fraction),
    y0: cy - (h / 2) * (1 + 2 * fraction),
    y1: cy + (h / 2) * (1 + 2 * fraction),
  };
};

/** The union of extents; null when none is finite. */
export const unionExtent = (extents: readonly (PlaneExtent | null | undefined)[]): PlaneExtent | null => {
  let out: PlaneExtent | null = null;
  for (const e of extents) {
    if (!e || ![e.x0, e.x1, e.y0, e.y1].every(Number.isFinite)) continue;
    out = out
      ? { x0: Math.min(out.x0, e.x0), x1: Math.max(out.x1, e.x1), y0: Math.min(out.y0, e.y0), y1: Math.max(out.y1, e.y1) }
      : { ...e };
  }
  return out;
};

/** A point of data space under a pixel of the canvas (y grows downward on screen, upward in data). */
export const dataAt = (view: PlaneView, size: { width: number; height: number }, px: number, py: number) => ({
  x: view.x0 + (px / Math.max(1, size.width)) * width(view),
  y: view.y1 - (py / Math.max(1, size.height)) * height(view),
});

/** The pixel of the canvas a point of data space lands on. */
export const pixelOf = (view: PlaneView, size: { width: number; height: number }, x: number, y: number) => ({
  px: ((x - view.x0) / width(view)) * size.width,
  py: ((view.y1 - y) / height(view)) * size.height,
});

/**
 * Zoom about a data point by a factor per axis (< 1 zooms in): the point under
 * the cursor stays under the cursor.
 */
export const zoomAbout = (view: PlaneView, at: { x: number; y: number }, factor: number, axes: PlaneAxes = "both"): PlaneView => {
  const fx = axes === "y" ? 1 : factor;
  const fy = axes === "x" ? 1 : factor;
  return {
    x0: at.x - (at.x - view.x0) * fx,
    x1: at.x + (view.x1 - at.x) * fx,
    y0: at.y - (at.y - view.y0) * fy,
    y1: at.y + (view.y1 - at.y) * fy,
  };
};

/** The zoom factor for a wheel delta: smooth, symmetric (in then out returns to where it was). */
export const zoomFactorForWheel = (deltaY: number): number => Math.exp(Math.max(-1, Math.min(1, deltaY * 0.0015)));

/** Move the view by a drag of `dx, dy` pixels: the data under the pointer follows it. */
export const panByPixels = (view: PlaneView, size: { width: number; height: number }, dx: number, dy: number, axes: PlaneAxes = "both"): PlaneView => {
  const ddx = axes === "y" ? 0 : (dx / Math.max(1, size.width)) * width(view);
  const ddy = axes === "x" ? 0 : (dy / Math.max(1, size.height)) * height(view);
  return { x0: view.x0 - ddx, x1: view.x1 - ddx, y0: view.y0 + ddy, y1: view.y1 + ddy };
};

/** The view a dragged box of pixels zooms into; null for a box too small to mean anything. */
export const viewForBox = (
  view: PlaneView,
  size: { width: number; height: number },
  a: { px: number; py: number },
  b: { px: number; py: number },
  minPx = 6,
): PlaneView | null => {
  if (Math.abs(a.px - b.px) < minPx && Math.abs(a.py - b.py) < minPx) return null;
  const p = dataAt(view, size, Math.min(a.px, b.px), Math.max(a.py, b.py));
  const q = dataAt(view, size, Math.max(a.px, b.px), Math.min(a.py, b.py));
  // A box thin in one direction zooms the other only.
  const keepX = Math.abs(a.px - b.px) < minPx;
  const keepY = Math.abs(a.py - b.py) < minPx;
  return {
    x0: keepX ? view.x0 : p.x,
    x1: keepX ? view.x1 : q.x,
    y0: keepY ? view.y0 : p.y,
    y1: keepY ? view.y1 : q.y,
  };
};

/** Clamp a view so it never collapses below a sliver of the extent. */
export const clampView = (view: PlaneView, extent: PlaneExtent | null): PlaneView => {
  if (!extent) return view;
  const minW = Math.max(Math.abs(width(extent)), 1e-12) * MIN_RELATIVE_SPAN;
  const minH = Math.max(Math.abs(height(extent)), 1e-12) * MIN_RELATIVE_SPAN;
  const out = { ...view };
  if (width(out) < minW) {
    const c = (out.x0 + out.x1) / 2;
    out.x0 = c - minW / 2;
    out.x1 = c + minW / 2;
  }
  if (height(out) < minH) {
    const c = (out.y0 + out.y1) / 2;
    out.y0 = c - minH / 2;
    out.y1 = c + minH / 2;
  }
  return out;
};
