import { escapeSqlIdentifier, escapeSqlLiteral } from "@/core/data/parquet/sqlBind";

/**
 * A table lens' row filters (`windowFilters`, `LabelFilterBy`) as one SQL
 * predicate, so a chart of values and a grid read exactly the rows the lens
 * keeps -- the same rule the scene's point layer applies in JS:
 *
 *  - `min` / `max`: inclusive bounds, either side open;
 *  - `values`: the column (as text) is one of them;
 *  - `exclude`: the rule inverted;
 *  - a rule with neither bounds nor values keeps everything.
 *
 * A rule with a `joinPath` reads ANOTHER table; it cannot be a predicate on this
 * one, and callers leave it out (and say so) rather than mistake its column for
 * one of this table's.
 *
 * Pure -- runs in node.
 */

export type RowFilter = {
  column?: string | null;
  min?: number | null;
  max?: number | null;
  values?: readonly string[] | null;
  exclude?: boolean | null;
  joinPath?: readonly unknown[] | null;
};

const num = (value: number): string => {
  if (!Number.isFinite(value)) throw new Error(`not a finite number: ${value}`);
  return String(value);
};

/** One rule as a predicate, or null for a rule that keeps everything (or reads another table). */
export const filterPredicate = (filter: RowFilter): string | null => {
  if (!filter.column || (filter.joinPath && filter.joinPath.length > 0)) return null;
  const column = escapeSqlIdentifier(filter.column);
  const parts: string[] = [];
  if (filter.values && filter.values.length > 0) {
    parts.push(`CAST(${column} AS VARCHAR) IN (${filter.values.map((v) => escapeSqlLiteral(String(v))).join(", ")})`);
  }
  if (filter.min != null) parts.push(`TRY_CAST(${column} AS DOUBLE) >= ${num(filter.min)}`);
  if (filter.max != null) parts.push(`TRY_CAST(${column} AS DOUBLE) <= ${num(filter.max)}`);
  if (parts.length === 0) return null;
  const kept = parts.length === 1 ? parts[0] : `(${parts.join(" AND ")})`;
  // A row whose value is missing is not kept by a bound, and not dropped by an exclusion of one.
  return filter.exclude ? `NOT COALESCE(${kept}, FALSE)` : kept;
};

/** Every rule ANDed, with any extra predicates; "TRUE" when nothing filters. */
export const whereClause = (filters: readonly RowFilter[], extra: readonly string[] = []): string => {
  const parts = [...filters.map(filterPredicate).filter((p): p is string => p !== null), ...extra];
  return parts.length > 0 ? parts.join(" AND ") : "TRUE";
};
