/**
 * The one mapping between a time window, the camera and the pixels.
 *
 * A timeline's camera is not free: it is DERIVED from the visible window. x spans
 * exactly `[start, end]` of world time (shifted by the scope's `timeOrigin`, the
 * same shift the trace buffers were packed with) and y spans the whole row stack.
 * So there is no camera state of its own to keep in sync — the range store is the
 * source of truth and the camera is a projection of it.
 *
 * Every gesture, the time axis, the probe and the overview use these helpers, so
 * "which time is under this pixel" has one answer.
 *
 * Pure — runs in node.
 */

export type Frustum = { left: number; right: number; top: number; bottom: number };

/** y extent when there are no rows yet, so the camera never has a zero-height frustum. */
const MIN_ROWS = 1;

export const frustumFor = (
  window: { start: number; end: number },
  timeOrigin: number,
  rowCount: number,
): Frustum => ({
  left: window.start - timeOrigin,
  right: window.end - timeOrigin,
  top: 0,
  bottom: -Math.max(MIN_ROWS, rowCount),
});

/** World time under a horizontal pixel offset (from the canvas' left edge). */
export const timeAtPixel = (
  px: number,
  widthPx: number,
  window: { start: number; end: number },
): number => window.start + (widthPx > 0 ? px / widthPx : 0) * (window.end - window.start);

/** Horizontal pixel offset of a world time. */
export const pixelAtTime = (
  time: number,
  widthPx: number,
  window: { start: number; end: number },
): number => {
  const width = window.end - window.start;
  return width > 0 ? ((time - window.start) / width) * widthPx : 0;
};

/** World y (row units, 0 at top, negative downward) under a vertical pixel offset. */
export const yAtPixel = (py: number, heightPx: number, rowCount: number): number =>
  -(heightPx > 0 ? py / heightPx : 0) * Math.max(MIN_ROWS, rowCount);

/** The row under a vertical pixel offset, or null outside the stack. */
export const rowAtPixel = (
  py: number,
  heightPx: number,
  rowCount: number,
): number | null => {
  if (rowCount <= 0 || heightPx <= 0) return null;
  const row = Math.floor((py / heightPx) * rowCount);
  return row >= 0 && row < rowCount ? row : null;
};

/** World time a horizontal DRAG of `dxPx` moves the window by (drag right = earlier). */
export const timeDeltaForDrag = (
  dxPx: number,
  widthPx: number,
  window: { start: number; end: number },
): number => (widthPx > 0 ? -(dxPx / widthPx) * (window.end - window.start) : 0);

/**
 * Wheel delta → zoom factor. Exponential, so a notch is the same RELATIVE zoom at
 * every scale — a linear mapping would crawl when zoomed out and leap when zoomed
 * in. `factor > 1` zooms out.
 */
export const zoomFactorForWheel = (deltaY: number, sensitivity = 0.0015): number =>
  Math.exp(deltaY * sensitivity);
