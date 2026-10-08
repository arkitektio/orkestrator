import { valueToY } from "@/core/data/plot/coords/rowMap";
import { ROW_PADDING } from "@/core/data/plot/layout/stackLayout";
import { bandKey, effectiveClim, type Band, type Clim, type RowInfo } from "@/core/data/plot/stores/viewerStore";

/**
 * Where a mark's HEIGHT is drawn: the row and the scale a value is read against.
 *
 * A drawing surface's VALUE axis is unitless — "what a height measures is
 * whatever the thing drawn beside it measures" — and the schema does not say
 * which row that is. So there is ONE answer, used for drawing a mark and for
 * reading one back alike: the chart's first row, on that row's scale. With a
 * single row (the common chart) there is no question; with several, marks sit
 * over the first. A chart with no row at all draws them over the whole height
 * on a 0…1 scale.
 *
 * Pure — the frame is derived from the viewer store's layout, never stored.
 */
export type ValueFrame = {
  /** How many rows the viewport is divided into (at least 1). */
  rows: number;
  /** `worldY = offset + scale · value`, in row units (0 at the top, negative down). */
  scale: number;
  offset: number;
  band: { top: number; bottom: number };
  clim: Clim;
  /** The row a drawn shape is read against, when there is one. */
  row: { layerId: string; channel: number } | null;
};

const UNIT: Clim = { lo: 0, hi: 1 };

export const valueFrameOf = (viewer: {
  rows: readonly RowInfo[];
  rowCount: number;
  bands: Readonly<Record<string, Band>>;
  clims: Readonly<Record<string, Clim>>;
}): ValueFrame | null => {
  const first = viewer.rows[0];
  if (!first || viewer.rowCount === 0) {
    const band = { top: -ROW_PADDING, bottom: -1 + ROW_PADDING };
    return { rows: 1, ...valueToY(band, UNIT), band, clim: UNIT, row: null };
  }
  const layerId = first.layerIds[0];
  const band = layerId ? viewer.bands[bandKey(layerId, 0)] : undefined;
  if (!layerId || !band) return null;
  // Not seeded yet: nothing says what a height means, so nothing is drawn at one.
  const clim = effectiveClim(viewer.clims as Record<string, Clim>, band);
  if (!clim) return null;
  return {
    rows: viewer.rowCount,
    ...valueToY(band, clim),
    band,
    clim,
    row: { layerId, channel: 0 },
  };
};

/**
 * The SVG matrix that draws (position − origin, value) in pixels:
 * `matrix(a, 0, 0, d, e, f)`. Marks are written once in data terms and this one
 * transform follows the window, the layout and the scale.
 */
export const markMatrix = (
  frame: ValueFrame,
  window: { start: number; end: number },
  origin: number,
  size: { width: number; height: number },
): { a: number; d: number; e: number; f: number } | null => {
  const span = window.end - window.start;
  if (!(span > 0) || !(size.width > 0) || !(size.height > 0)) return null;
  const a = size.width / span;
  const perRow = size.height / frame.rows;
  return {
    a,
    // World y runs negative downward; pixels run positive downward.
    d: -frame.scale * perRow,
    e: -(window.start - origin) * a,
    f: -frame.offset * perRow,
  };
};

/** The value a world y reads as in the frame. */
export const valueAtY = (frame: ValueFrame, y: number): number =>
  frame.scale === 0 ? frame.clim.lo : (y - frame.offset) / frame.scale;
