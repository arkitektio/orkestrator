import { PhasorColorMode, PhasorCursorKind } from "@/mikro/api/graphql";
import { cursorPaletteColor, phasorValue, type PhasorScale } from "../../platform/model/phasor";
import type { PhasorCursorDef } from "../../platform/model/renderGraph";

/**
 * What the phasor card's cursor rows say and do, kept out of the component so
 * it can be tested: a cursor is identified by its POSITION in the list (the
 * transfer carries no ids), and its default colour is a function of that
 * position — which is the one thing an edit here must not disturb by accident.
 */

export const cursorLabel = (cursor: PhasorCursorDef, index: number): string =>
  cursor.label?.trim() || `Cursor ${index + 1}`;

/** The colour the cursor paints with: its own, else the palette's for its
 *  position. The same rule the plot and the shader (`writeCursors`) follow. */
export const cursorRgb = (cursor: PhasorCursorDef, index: number): readonly number[] =>
  cursor.color && cursor.color.length >= 3 ? cursor.color : cursorPaletteColor(index);

/** Where the cursor sits: a circle's centre, a polygon's mean corner. */
export const cursorCentre = (cursor: PhasorCursorDef): [number, number] | null => {
  if (cursor.kind === PhasorCursorKind.Polygon) {
    const points = cursor.points ?? [];
    if (points.length === 0) return null;
    const g = points.reduce((sum, point) => sum + point[0], 0) / points.length;
    const s = points.reduce((sum, point) => sum + point[1], 0) / points.length;
    return [g, s];
  }
  return cursor.g == null || cursor.s == null ? null : [cursor.g, cursor.s];
};

const trim = (value: number): string => {
  const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
  return value.toFixed(digits);
};

/**
 * A value in the scale's BASE unit (ms over a time axis, µm over a length one —
 * `PhasorScale`) as a person reads it: a lifetime in ns, a wavelength offset in
 * nm. Null without a scale: the raw phase or modulus is not worth a row's
 * detail line.
 */
export const formatPhasorValue = (value: number, scale: PhasorScale): string | null => {
  if (scale.omega === null || !Number.isFinite(value)) return null;
  if (scale.dimension === "time") return `${trim(value * 1e6)} ns`;
  if (scale.dimension === "length") return `${trim(value * 1e3)} nm`;
  return null;
};

/** The row's second line: the shape, and what the layer's colouring reads at
 *  its centre when the axis is calibrated enough to say. */
export const cursorDetail = (
  cursor: PhasorCursorDef,
  mode: PhasorColorMode,
  scale: PhasorScale,
): string => {
  const shape =
    cursor.kind === PhasorCursorKind.Polygon
      ? `polygon · ${cursor.points?.length ?? 0} corners`
      : "circle";
  const centre = cursorCentre(cursor);
  const value = centre ? formatPhasorValue(phasorValue(centre[0], centre[1], mode, scale), scale) : null;
  return value ? `${shape} · ${value}` : shape;
};

export const patchCursor = (
  cursors: readonly PhasorCursorDef[],
  index: number,
  patch: Partial<PhasorCursorDef>,
): PhasorCursorDef[] =>
  cursors.map((cursor, i) => (i === index ? { ...cursor, ...patch } : cursor));

/**
 * Remove one cursor WITHOUT recolouring the ones after it. A cursor with no
 * colour of its own takes the palette's for its position, so dropping the
 * second of three would repaint the third in the second's colour — on the plot
 * and in the image. The ones that move up therefore keep the colour they had,
 * written out.
 */
export const removeCursor = (
  cursors: readonly PhasorCursorDef[],
  index: number,
): PhasorCursorDef[] =>
  cursors.flatMap((cursor, i) => {
    if (i === index) return [];
    if (i < index || cursor.color) return [cursor];
    return [{ ...cursor, color: [...cursorPaletteColor(i)] }];
  });
