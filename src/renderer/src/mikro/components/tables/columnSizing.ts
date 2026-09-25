/**
 * Column widths that are fitted ONCE and then kept.
 *
 * A browser table in `auto` layout re-fits every column to its content on
 * every render, so each sort, page or search re-flows the whole grid and the
 * numbers jump sideways while a reader is following a row. A spreadsheet
 * does the opposite: it fits the columns when the sheet opens and then leaves
 * them alone until someone drags a divider. That is the rule here — the
 * table renders unsized (auto layout) exactly until it has content to fit
 * against, measures each unsized column once, and from then on paints a
 * fixed layout at those widths.
 *
 * A column can become unsized again on purpose: double-clicking its divider
 * drops its width, which puts it back through one fitting pass — the
 * spreadsheet's "autofit" — and a column made visible later starts unsized
 * and fits the same way, without touching the widths its neighbours have.
 */

export type ColumnWidths = Record<string, number>;

export type MeasuredColumn = { id: string; width: number };

/** Below this a column is a sliver nobody can drag or read. */
export const MIN_COLUMN_WIDTH = 40;

/**
 * Fold freshly measured widths into the sizing state, touching only the
 * columns that had none. Returns `null` when nothing was learned, so a caller
 * can leave state untouched rather than re-render on an identical object.
 */
export const mergeMeasuredWidths = (
  current: ColumnWidths,
  measured: readonly MeasuredColumn[],
): ColumnWidths | null => {
  let next: ColumnWidths | null = null;
  for (const { id, width } of measured) {
    if (current[id] !== undefined) continue;
    if (!Number.isFinite(width) || width <= 0) continue;
    next ??= { ...current };
    next[id] = Math.max(MIN_COLUMN_WIDTH, Math.ceil(width));
  }
  return next;
};

/** Which of the visible columns still have no width — the ones a fitting pass is for. */
export const unsizedColumns = (
  visibleIds: readonly string[],
  current: ColumnWidths,
): string[] => visibleIds.filter((id) => current[id] === undefined);
