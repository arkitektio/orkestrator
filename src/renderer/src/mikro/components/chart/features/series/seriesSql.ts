import { escapeSqlIdentifier, escapeSqlLiteral } from "@/core/data/parquet/sqlBind";

/**
 * The reads a series layer issues, as SQL over one parquet file.
 *
 * A series is two columns: the coordinate the graph lays along the chart's
 * axis, and the numeric value read against it. Both are cast to DOUBLE, so they
 * arrive through Arrow as `Float64Array`s — no row objects at any size. Rows
 * missing either are left out: a null in a DOUBLE column would arrive as 0, and
 * a point at (0, 0) that the table does not hold is worse than a gap.
 *
 * Pure string builders — tested in node. Identifiers and the URL are escaped
 * here and nowhere else.
 */

export const SERIES_COLUMNS = { x: "__x", y: "__y" } as const;
export const ENVELOPE_COLUMNS = {
  minX: "__x_at_min",
  minY: "__y_min",
  maxX: "__x_at_max",
  maxY: "__y_max",
} as const;

export type SeriesColumns = { coordinateColumn: string; valueColumn: string };

const num = (value: number): string => {
  if (!Number.isFinite(value)) throw new Error(`not a finite number: ${value}`);
  return String(value);
};

const from = (url: string) => `read_parquet(${escapeSqlLiteral(url)})`;

const present = (columns: SeriesColumns) =>
  `${escapeSqlIdentifier(columns.coordinateColumn)} IS NOT NULL AND ${escapeSqlIdentifier(columns.valueColumn)} IS NOT NULL`;

/** How many rows there are and how far the coordinate runs: one footer-cheap read. */
export const seriesExtentSql = (url: string, columns: SeriesColumns): string =>
  `SELECT COUNT(*) AS n, ` +
  `CAST(MIN(${escapeSqlIdentifier(columns.coordinateColumn)}) AS DOUBLE) AS lo, ` +
  `CAST(MAX(${escapeSqlIdentifier(columns.coordinateColumn)}) AS DOUBLE) AS hi ` +
  `FROM ${from(url)} WHERE ${present(columns)}`;

/** Every row, in coordinate order: what a table small enough to hold is read as, once. */
export const seriesWholeSql = (url: string, columns: SeriesColumns): string =>
  `SELECT CAST(${escapeSqlIdentifier(columns.coordinateColumn)} AS DOUBLE) AS ${SERIES_COLUMNS.x}, ` +
  `CAST(${escapeSqlIdentifier(columns.valueColumn)} AS DOUBLE) AS ${SERIES_COLUMNS.y} ` +
  `FROM ${from(url)} WHERE ${present(columns)} ORDER BY ${SERIES_COLUMNS.x}`;

/**
 * The min/max ENVELOPE of a window, one row per bucket of the coordinate, in
 * coordinate order: for each bucket, its lowest and highest value and where
 * along the coordinate each sits.
 *
 * For a table too large to hold. `lo`/`hi`/`bucket` are in the COORDINATE
 * column's own units (the caller maps the chart's window back through the
 * layer's placement). Row-group statistics make the range predicate cheap on a
 * table written in coordinate order; on one that is not, this scans it.
 */
export const seriesEnvelopeSql = (
  url: string,
  columns: SeriesColumns,
  window: { lo: number; hi: number; bucket: number },
): string => {
  const x = `CAST(${escapeSqlIdentifier(columns.coordinateColumn)} AS DOUBLE)`;
  const y = `CAST(${escapeSqlIdentifier(columns.valueColumn)} AS DOUBLE)`;
  return (
    `SELECT arg_min(x, y) AS ${ENVELOPE_COLUMNS.minX}, MIN(y) AS ${ENVELOPE_COLUMNS.minY}, ` +
    `arg_max(x, y) AS ${ENVELOPE_COLUMNS.maxX}, MAX(y) AS ${ENVELOPE_COLUMNS.maxY} ` +
    `FROM (SELECT ${x} AS x, ${y} AS y FROM ${from(url)} ` +
    `WHERE ${present(columns)} AND ${x} >= ${num(window.lo)} AND ${x} <= ${num(window.hi)}) ` +
    `GROUP BY FLOOR((x - ${num(window.lo)}) / ${num(window.bucket)}) ` +
    `ORDER BY MIN(x)`
  );
};

/**
 * The bucketed window a chart window maps to, QUANTISED so a zoom inside a
 * band rereads nothing: the bucket width is the power of two at or under what
 * one pixel covers, and the bounds are snapped outward to that grid. Two
 * windows in the same band, overlapping the same buckets, are the same read.
 */
export const envelopeWindow = (
  window: { lo: number; hi: number },
  widthPx: number,
): { lo: number; hi: number; bucket: number } | null => {
  const span = window.hi - window.lo;
  if (!(span > 0) || !(widthPx > 0)) return null;
  const bucket = 2 ** Math.floor(Math.log2(span / widthPx));
  if (!(bucket > 0) || !Number.isFinite(bucket)) return null;
  return {
    lo: Math.floor(window.lo / bucket) * bucket,
    hi: Math.ceil(window.hi / bucket) * bucket,
    bucket,
  };
};
