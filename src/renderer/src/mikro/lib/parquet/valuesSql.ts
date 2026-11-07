import { escapeSqlIdentifier, escapeSqlLiteral } from "@/core/data/parquet/sqlBind";
import { whereClause, type RowFilter } from "./filterSql";

/**
 * The reads of a chart of values and a grid, as SQL over one parquet file.
 * Every numeric column is cast to DOUBLE (so it arrives through Arrow as a
 * `Float64Array`) and rows missing a column a mark needs are left out: a NULL
 * read as 0 would draw a point the table does not hold.
 *
 * Pure string builders -- tested in node. Identifiers and the URL are escaped
 * here and nowhere else.
 */

export const POINT_COLUMNS = { x: "__x", y: "__y", z: "__z", row: "__row" } as const;

/** Tables up to this many (filtered) rows are drawn whole; beyond it, a uniform sample of this many. */
export const POINTS_MAX = 2_000_000;

const from = (url: string) => `read_parquet(${escapeSqlLiteral(url)})`;
const dbl = (column: string) => `TRY_CAST(${escapeSqlIdentifier(column)} AS DOUBLE)`;
const present = (columns: readonly string[]) => columns.map((c) => `${dbl(c)} IS NOT NULL`);

export type PointColumns = { x: string; y: string; z?: string | null };

/** How many rows a points layer would draw, and the box they span. */
export const pointsExtentSql = (url: string, columns: PointColumns, filters: readonly RowFilter[]): string => {
  const needed = [columns.x, columns.y, ...(columns.z ? [columns.z] : [])];
  return (
    `SELECT COUNT(*) AS n, MIN(${dbl(columns.x)}) AS x0, MAX(${dbl(columns.x)}) AS x1, ` +
    `MIN(${dbl(columns.y)}) AS y0, MAX(${dbl(columns.y)}) AS y1` +
    (columns.z ? `, MIN(${dbl(columns.z)}) AS z0, MAX(${dbl(columns.z)}) AS z1` : "") +
    ` FROM ${from(url)} WHERE ${whereClause(filters, present(needed))}`
  );
};

/**
 * The points themselves, with the row number they came from (what a tooltip
 * reads the rest of the row by). Above `POINTS_MAX` rows, a reproducible
 * uniform sample of that many.
 */
export const pointsSql = (url: string, columns: PointColumns, filters: readonly RowFilter[], total: number): string => {
  const needed = [columns.x, columns.y, ...(columns.z ? [columns.z] : [])];
  const kept =
    `SELECT ${dbl(columns.x)} AS ${POINT_COLUMNS.x}, ${dbl(columns.y)} AS ${POINT_COLUMNS.y}` +
    (columns.z ? `, ${dbl(columns.z)} AS ${POINT_COLUMNS.z}` : "") +
    `, CAST(file_row_number AS DOUBLE) AS ${POINT_COLUMNS.row}` +
    ` FROM read_parquet(${escapeSqlLiteral(url)}, file_row_number = true)` +
    ` WHERE ${whereClause(filters, present(needed))}`;
  // DuckDB samples the FROM, before the WHERE: sampling the kept rows needs them as a subquery.
  return total > POINTS_MAX ? `SELECT * FROM (${kept}) USING SAMPLE reservoir(${POINTS_MAX} ROWS) REPEATABLE (7)` : kept;
};

/** One row of a table, by its row number: what a tooltip shows beside the plotted values. */
export const rowSql = (url: string, row: number): string =>
  `SELECT * EXCLUDE (file_row_number) FROM read_parquet(${escapeSqlLiteral(url)}, file_row_number = true) WHERE file_row_number = ${Math.max(0, Math.floor(row))} LIMIT 1`;

// --- distributions --------------------------------------------------------

export const DEFAULT_BINS = 30;
export const MAX_GROUPS = 24;

const groupExpr = (group: string | null | undefined) =>
  group ? `COALESCE(CAST(${escapeSqlIdentifier(group)} AS VARCHAR), '∅')` : `'all'`;

/** The value's range, row count and the groups (the most populous first, at most `MAX_GROUPS`). */
export const distributionExtentSql = (url: string, value: string, group: string | null, filters: readonly RowFilter[]): string =>
  `SELECT ${groupExpr(group)} AS g, COUNT(*) AS n, MIN(${dbl(value)}) AS lo, MAX(${dbl(value)}) AS hi ` +
  `FROM ${from(url)} WHERE ${whereClause(filters, present([value]))} ` +
  `GROUP BY 1 ORDER BY n DESC, g LIMIT ${MAX_GROUPS}`;

/**
 * A histogram per group over ONE shared domain, so the groups' bars line up:
 * `bin` is `floor((v - lo) / width)`, the top edge folded into the last bin.
 */
export const histogramSql = (
  url: string,
  value: string,
  group: string | null,
  filters: readonly RowFilter[],
  domain: { lo: number; hi: number },
  bins: number,
): string => {
  const width = (domain.hi - domain.lo) / Math.max(1, bins) || 1;
  const v = dbl(value);
  return (
    `SELECT ${groupExpr(group)} AS g, ` +
    `LEAST(${bins - 1}, GREATEST(0, CAST(FLOOR((${v} - ${domain.lo}) / ${width}) AS BIGINT))) AS b, COUNT(*) AS n ` +
    `FROM ${from(url)} WHERE ${whereClause(filters, present([value]))} GROUP BY 1, 2 ORDER BY 1, 2`
  );
};

/** Five numbers and a count per group: what a box is drawn from. */
export const boxSql = (url: string, value: string, group: string | null, filters: readonly RowFilter[]): string => {
  const v = dbl(value);
  return (
    `SELECT ${groupExpr(group)} AS g, COUNT(*) AS n, MIN(${v}) AS lo, quantile_cont(${v}, 0.25) AS q1, ` +
    `quantile_cont(${v}, 0.5) AS q2, quantile_cont(${v}, 0.75) AS q3, MAX(${v}) AS hi ` +
    `FROM ${from(url)} WHERE ${whereClause(filters, present([value]))} GROUP BY 1 ORDER BY n DESC, g LIMIT ${MAX_GROUPS}`
  );
};

/** Freedman-Diaconis-ish default: bins from the row count when none is set, between 10 and 80. */
export const defaultBins = (n: number): number => Math.max(10, Math.min(80, Math.round(Math.sqrt(Math.max(1, n)) * 1.5)));

// --- grid cells -----------------------------------------------------------

/**
 * Cells of a grid from a table: (row member, column member, value), one per
 * row. A position named null is the row's own number in the file: the synthetic
 * `object` axis of a table with no coordinate column.
 */
export const cellsSql = (
  url: string,
  columns: { row: string | null; column: string | null; value: string },
  filters: readonly RowFilter[],
  limit: number,
  columnIsRowNumber = false,
): string => {
  const at = (name: string | null) => (name ? dbl(name) : "CAST(file_row_number AS DOUBLE)");
  const col = columns.column ? dbl(columns.column) : columnIsRowNumber ? at(null) : "0";
  const needed = [...(columns.row ? [columns.row] : []), ...(columns.column ? [columns.column] : []), columns.value];
  return (
    `SELECT ${at(columns.row)} AS r, ${col} AS c, ${dbl(columns.value)} AS v ` +
    `FROM read_parquet(${escapeSqlLiteral(url)}, file_row_number = true) WHERE ${whereClause(filters, present(needed))} LIMIT ${Math.max(1, Math.floor(limit))}`
  );
};
