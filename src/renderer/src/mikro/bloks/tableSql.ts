import { escapeSqlIdentifier, escapeSqlLiteral } from "@/core/data/parquet/sqlBind";

/**
 * The SQL the table bloks run on a TableDataset's parquet. A blok never writes
 * SQL: it names columns and a structured filter, and everything it names is
 * escaped here — a column as an identifier, a value as a literal.
 */

export const ROW_OPS = ["eq", "ne", "gt", "gte", "lt", "lte", "in", "contains", "isNull", "notNull"] as const;
export type RowOp = (typeof ROW_OPS)[number];

/** One condition of a `where`; all of them must hold. */
export type RowCondition = { column: string; op?: RowOp; value?: unknown };

export type RowsRequest = {
  columns?: readonly string[];
  where?: readonly RowCondition[];
  orderBy?: string;
  descending?: boolean;
  limit: number;
  offset?: number;
};

/** Above this a page is an export, not something a blok lays out. */
export const ROWS_LIMIT_MAX = 1000;
export const ROWS_LIMIT_DEFAULT = 50;

const readParquet = (url: string) => `read_parquet(${escapeSqlLiteral(url)})`;

const literal = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value == null) return "NULL";
  return escapeSqlLiteral(String(value));
};

const COMPARISONS: Partial<Record<RowOp, string>> = { eq: "=", ne: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" };

export const conditionSql = (condition: RowCondition): string => {
  const column = escapeSqlIdentifier(condition.column);
  const op = condition.op ?? "eq";
  const comparison = COMPARISONS[op];
  if (comparison) return `${column} ${comparison} ${literal(condition.value)}`;
  switch (op) {
    case "in": {
      const values = Array.isArray(condition.value) ? condition.value : [condition.value];
      // `IN ()` is not SQL; an empty set holds for no row.
      return values.length === 0 ? "FALSE" : `${column} IN (${values.map(literal).join(", ")})`;
    }
    case "contains":
      return `contains(lower(CAST(${column} AS VARCHAR)), lower(${literal(condition.value ?? "")}))`;
    case "isNull":
      return `${column} IS NULL`;
    case "notNull":
      return `${column} IS NOT NULL`;
    default:
      throw new Error(`Unknown filter operation '${String(op)}'.`);
  }
};

const whereSql = (where: readonly RowCondition[] | undefined) =>
  where && where.length > 0 ? ` WHERE ${where.map(conditionSql).join(" AND ")}` : "";

export const rowsSql = (url: string, request: RowsRequest): string => {
  const columns =
    request.columns && request.columns.length > 0 ? request.columns.map(escapeSqlIdentifier).join(", ") : "*";
  const order = request.orderBy
    ? ` ORDER BY ${escapeSqlIdentifier(request.orderBy)} ${request.descending ? "DESC" : "ASC"} NULLS LAST`
    : "";
  const limit = Math.min(Math.max(Math.floor(request.limit), 0), ROWS_LIMIT_MAX);
  const offset = Math.max(Math.floor(request.offset ?? 0), 0);
  return `SELECT ${columns} FROM ${readParquet(url)}${whereSql(request.where)}${order} LIMIT ${limit} OFFSET ${offset}`;
};

export const countSql = (url: string, where: readonly RowCondition[] | undefined): string =>
  `SELECT count(*) AS n FROM ${readParquet(url)}${whereSql(where)}`;

/** Count, fill and spread of one column in one scan; `distinct` is the costly part and opt-in. */
export const columnStatSql = (url: string, column: string, withDistinct: boolean): string => {
  const name = escapeSqlIdentifier(column);
  const number = `TRY_CAST(${name} AS DOUBLE)`;
  const distinct = withDistinct ? `, count(DISTINCT ${name}) AS n_distinct` : "";
  return `SELECT count(*) AS n_rows, count(${name}) AS n_non_null, min(${number}) AS min, max(${number}) AS max, avg(${number}) AS mean${distinct} FROM ${readParquet(url)}`;
};
