/**
 * The range a colouring's values span — shared by every layer that ramps a
 * per-object measure through a colormap.
 *
 * Lives in `platform/` rather than beside one renderer because two features
 * need it and `architecture.test.ts` forbids the sideways import: the point
 * layer ramps a column or a sparse slice per point, the track layer the same
 * per segment. One window function means the two cannot drift into disagreeing
 * about what a ramp runs between.
 */
import type { ColumnLutEntryColorBy } from "./columnLut";

/**
 * Split out of any per-object scatter because the GPU path needs the window
 * WITHOUT building a per-object array — that is the whole saving. CPU and GPU
 * paths both take it from here, so they cannot disagree.
 */
export const valueWindowOf = (
  byId: Map<number, unknown>,
  entry: ColumnLutEntryColorBy | null,
): { valueMin: number; valueMax: number } => {
  if (!entry || byId.size === 0) return { valueMin: 0, valueMax: 1 };
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const raw of byId.values()) {
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  // A sparse slice is the complete truth for its feature, so an object it omits is a real zero
  // and the range has to include it or an all-positive gene would start its ramp at its own
  // minimum. Harmless for a column, where the floor is the range's own end anyway.
  if (entry.dataset) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { valueMin: 0, valueMax: 1 };
  return { valueMin: min, valueMax: max === min ? min + 1 : max };
};
