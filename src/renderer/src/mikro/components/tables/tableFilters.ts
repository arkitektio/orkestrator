/**
 * The per-column filters of a table dataset's grid: a numeric range, or a set
 * of values to keep or to drop. One filter per column — a new one on the same
 * column replaces the old, except that a bound set from a cell (≥ / ≤) keeps
 * the other bound of a range already there.
 *
 * Pure: the SQL a filter compiles to, the words its chip reads, and the
 * filters a right-click on a cell offers. The grid holds the state; DuckDB
 * reads the predicates (`useDuckDbTable`).
 */

/** Inclusive at both ends; a missing bound is open. */
export type RangeFilter = { kind: "range"; column: string; min?: number; max?: number };

/**
 * Values compared as text, the way the column's distinct values are listed.
 * `NULL_VALUE` stands for an empty cell.
 */
export type ValuesFilter = {
  kind: "values";
  column: string;
  values: string[];
  exclude?: boolean;
  /**
   * Compare as numbers, not as text: DuckDB writes a double 2 as "2.0" where
   * JavaScript writes "2", so a number picked from a cell would never match
   * its own column as text.
   */
  numeric?: boolean;
};

export type TableColumnFilter = RangeFilter | ValuesFilter;

/** Keyed by column name. */
export type TableColumnFilters = Readonly<Record<string, TableColumnFilter>>;

/** How an empty cell is named in a values filter (and in the histogram query). */
export const NULL_VALUE = "(null)";

const escapeSqlIdentifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
const escapeSqlLiteral = (value: string) => `'${value.replaceAll("'", "''")}'`;

/** A number fit to be written into SQL, or nothing. */
const finite = (value: number | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * The WHERE predicate a filter compiles to, or null when it does not narrow
 * (an open range, an empty set). Numbers are only ever written after a
 * finiteness check and text only as an escaped literal.
 */
export const filterPredicate = (filter: TableColumnFilter): string | null => {
  const column = escapeSqlIdentifier(filter.column);
  if (filter.kind === "range") {
    const value = `TRY_CAST(${column} AS DOUBLE)`;
    const bounds = [
      finite(filter.min) ? `${value} >= ${filter.min}` : null,
      finite(filter.max) ? `${value} <= ${filter.max}` : null,
    ].filter(Boolean);
    return bounds.length ? `(${bounds.join(" AND ")})` : null;
  }
  if (filter.values.length === 0) return null;
  if (filter.numeric) {
    const numbers = filter.values.map(Number).filter((value) => Number.isFinite(value));
    if (numbers.length === 0) return null;
    const value = `TRY_CAST(${column} AS DOUBLE)`;
    // An empty cell is neither in nor out of a set of numbers: excluding
    // numbers keeps it, keeping numbers drops it.
    return filter.exclude
      ? `COALESCE(${value} NOT IN (${numbers.join(", ")}), TRUE)`
      : `${value} IN (${numbers.join(", ")})`;
  }
  const text = `COALESCE(TRY_CAST(${column} AS VARCHAR), ${escapeSqlLiteral(NULL_VALUE)})`;
  const list = filter.values.map(escapeSqlLiteral).join(", ");
  return `${text} ${filter.exclude ? "NOT IN" : "IN"} (${list})`;
};

/** Every predicate of `filters` that narrows. */
export const filterPredicates = (filters: TableColumnFilters): string[] =>
  Object.values(filters)
    .map(filterPredicate)
    .filter((predicate): predicate is string => predicate !== null);

/** Whether any filter narrows. */
export const hasActiveFilters = (filters: TableColumnFilters): boolean => filterPredicates(filters).length > 0;

/** `filters` with `filter` set for its column, or the column's removed when `filter` narrows nothing. */
export const setFilter = (filters: TableColumnFilters, filter: TableColumnFilter): TableColumnFilters => {
  const { [filter.column]: _replaced, ...rest } = filters;
  return filterPredicate(filter) ? { ...rest, [filter.column]: filter } : rest;
};

/** `filters` without `column`'s. */
export const clearFilter = (filters: TableColumnFilters, column: string): TableColumnFilters => {
  const { [column]: _removed, ...rest } = filters;
  return rest;
};

const numberFormat = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 });
const formatNumber = (value: number) => numberFormat.format(value);

/** What a filter's chip reads: "area 10 – 200", "area ≥ 10", "label = a, b", "label ≠ a". */
export const describeFilter = (filter: TableColumnFilter, label: string = filter.column): string => {
  if (filter.kind === "range") {
    const { min, max } = filter;
    if (finite(min) && finite(max)) return min === max ? `${label} = ${formatNumber(min)}` : `${label} ${formatNumber(min)} – ${formatNumber(max)}`;
    if (finite(min)) return `${label} ≥ ${formatNumber(min)}`;
    if (finite(max)) return `${label} ≤ ${formatNumber(max)}`;
    return label;
  }
  const shown = filter.values.slice(0, 2).map((value) => (value === NULL_VALUE ? "empty" : value));
  const more = filter.values.length > 2 ? ` +${filter.values.length - 2}` : "";
  return `${label} ${filter.exclude ? "≠" : "="} ${shown.join(", ")}${more}`;
};

/**
 * The numeric reading of a cell, for the range filters a right-click offers,
 * or null when the cell is not a number (a bigint past 2^53 comes as text and
 * is offered as a value instead).
 */
export const numericCellValue = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** A cell as the text a values filter compares, `NULL_VALUE` when empty. */
export const textCellValue = (value: unknown): string =>
  value === null || value === undefined ? NULL_VALUE : typeof value === "object" ? JSON.stringify(value) : String(value);

/** How far "similar" reaches either side of a number: 10% of it (or ±0.1 around zero). */
const SIMILAR_SPREAD = 0.1;

export type CellFilterAction = {
  key: "same" | "similar" | "atLeast" | "atMost" | "exclude";
  label: string;
  filter: TableColumnFilter;
};

/**
 * What a right-click on a cell offers, in menu order. A number gets the
 * range family (same, similar, at least, at most); anything gets "same"
 * and "exclude". A bound from a cell keeps the other bound of the column's
 * current range, so "≥ 10" then "≤ 200" on two cells reads as 10 – 200.
 */
export const cellFilterActions = (
  column: string,
  value: unknown,
  current: TableColumnFilter | undefined,
  label: string = column,
): CellFilterAction[] => {
  const number = numericCellValue(value);
  const text = textCellValue(value);
  const shown = text === NULL_VALUE ? "empty" : number !== null ? formatNumber(number) : text;
  const range = current?.kind === "range" ? current : undefined;

  if (number === null) {
    return [
      { key: "same", label: `Only ${label} = ${shown}`, filter: { kind: "values", column, values: [text] } },
      { key: "exclude", label: `Exclude ${label} = ${shown}`, filter: { kind: "values", column, values: [text], exclude: true } },
    ];
  }

  const spread = number === 0 ? SIMILAR_SPREAD : Math.abs(number) * SIMILAR_SPREAD;
  return [
    { key: "same", label: `Only ${label} = ${shown}`, filter: { kind: "range", column, min: number, max: number } },
    {
      key: "similar",
      label: `Similar ${label} (±10%)`,
      filter: { kind: "range", column, min: number - spread, max: number + spread },
    },
    { key: "atLeast", label: `${label} ≥ ${shown}`, filter: { kind: "range", column, min: number, max: range?.max } },
    { key: "atMost", label: `${label} ≤ ${shown}`, filter: { kind: "range", column, min: range?.min, max: number } },
    {
      key: "exclude",
      label: `Exclude ${label} = ${shown}`,
      filter: { kind: "values", column, values: [String(number)], exclude: true, numeric: true },
    },
  ];
};
