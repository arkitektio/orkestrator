/**
 * What a table's column can be in a chart, read off its declaration as the
 * server reads it: a number to plot, a measurement to summarise, a grouping
 * to split rows by. Shared by the forms that create layers and the cards that
 * retune them, so both offer exactly what the server would accept.
 *
 * Pure -- tested in node.
 */

type ColumnLike = { role?: string | null; dtype?: string | null; axisType?: string | null };

/** The DuckDB number types, as the server lists them (`coords.is_numeric_dtype`). */
const NUMERIC_DTYPES = new Set([
  "TINYINT", "SMALLINT", "INTEGER", "BIGINT", "HUGEINT",
  "UTINYINT", "USMALLINT", "UINTEGER", "UBIGINT", "UHUGEINT",
  "FLOAT", "REAL", "DOUBLE",
]);

/** A column holding numbers, whatever its role: what a position of a chart of values may be. */
export const isNumericColumn = (column: ColumnLike): boolean => {
  const dtype = (column.dtype ?? "").toUpperCase();
  return NUMERIC_DTYPES.has(dtype) || dtype.startsWith("DECIMAL");
};

/** A measurement a series may read as its value: an ATTRIBUTE (or undeclared) column that is no text. */
export const isValueColumn = (column: ColumnLike): boolean =>
  (column.role == null || column.role === "ATTRIBUTE") && !/str|utf|char|bool|object|categor/i.test(column.dtype ?? "");

/** What a distribution may be grouped by: a column naming a group, not measuring one. */
export const isGroupColumn = (column: ColumnLike): boolean =>
  column.role === "LABEL" ||
  column.role === "GROUP_ID" ||
  column.axisType === "CHANNEL" ||
  /str|utf|char|bool|categor/i.test(column.dtype ?? "");
