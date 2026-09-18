/**
 * The unit table of a spikes layer: the parquet table whose rows ARE the
 * raster's units. Its INDEX coordinate column holds each row's unit position
 * along the sparse dataset's unit axis — the key every row order, colour-by and
 * filter-by joins on.
 *
 * Pure — runs in node.
 */

import type { ColumnLike } from "./eventSource";

export type UnitTableLike = {
  id: string;
  name: string;
  store: { id: string };
  columns?: readonly ColumnLike[] | null;
};

/** The column holding each row's unit index: the INDEX coordinate column. */
export const unitIdColumn = (table: UnitTableLike, unitAxis: string | null = null): string | null => {
  const columns = table.columns ?? [];
  const index = columns.find((c) => c.role === "COORDINATE" && c.axisType === "INDEX");
  if (index) return index.name;
  return unitAxis && columns.some((c) => c.name === unitAxis) ? unitAxis : null;
};

const ident = (name: string) => `"${name.replaceAll('"', '""')}"`;
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

/** Unit indices in the order `orderColumn` sorts them (nulls last, ties by index). */
export const unitOrderSql = (url: string, idColumn: string, orderColumn: string): string =>
  `SELECT CAST(${ident(idColumn)} AS DOUBLE) AS __unit FROM read_parquet(${literal(url)})` +
  ` ORDER BY ${ident(orderColumn)} NULLS LAST, ${ident(idColumn)}`;
