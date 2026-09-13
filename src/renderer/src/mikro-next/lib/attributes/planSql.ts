import type { TableHopLike } from "./attributeTypes";
import { escapeSqlIdentifier } from "./sqlBind";

/**
 * The DuckDB statement for one TABLE hop, derived locally.
 *
 * A plan carries no SQL: a TABLE lookup is `keyColumns` and `attributes`, and
 * the statement is the client's to write — the server's own worker derives it
 * from the same two lists (`core/logic/plan_sql.py`), and this is that module
 * carried over. The contract it keeps:
 *
 *  - `SELECT <attributes> FROM read_parquet(?) WHERE <key> = ? [AND …]`,
 *    identifiers quoted, values as `?` placeholders, never interpolated;
 *  - bind the parquet path/URL first (from the worker's own access grant),
 *    then the key values in `keyColumns` order;
 *  - a MANY binding (every position a sparse parent returned) is an `IN`
 *    list over that one key, and the statement selects the key columns too,
 *    so a row says which value it answers.
 *
 * Two things the server's derivation does not do are done here because the
 * user asked for them: a PROJECTION (`columns`) narrows the select list to a
 * subset of the declared attributes — DuckDB then reads only those column
 * chunks off the parquet — and the `IN` list's length is part of the
 * statement, which is why MANY statements are never prepared (see the engine).
 */

export type TableHopSqlSpec = {
  /** Attribute names to select; null/empty = every declared attribute. Names
   * that are not declared attributes are dropped, never trusted. */
  columns?: readonly string[] | null;
  /** The one key bound as a list, and how many values it carries. */
  many?: { axis: string; count: number } | null;
};

export type TableHopSql = {
  sql: string;
  /** The attribute names the statement selects, in select order. */
  selected: readonly string[];
  /** A stable identity for the statement's SHAPE: the hop plus the
   * projection. The `IN` count is deliberately left out — a MANY statement is
   * run as literal SQL, never prepared, so its shape needs no cache key. */
  shapeKey: string;
};

/** The declared attribute names a projection may keep, in declared order. */
export const projectColumns = (
  hop: TableHopLike,
  columns: readonly string[] | null | undefined,
): readonly string[] => {
  const declared = hop.lookup.attributes.map((attribute) => attribute.name);
  if (!columns || columns.length === 0) return declared;
  const wanted = new Set(columns);
  const kept = declared.filter((name) => wanted.has(name));
  return kept.length === 0 ? declared : kept;
};

/** True when `columns` narrows the hop's declared attributes. */
export const isProjection = (
  hop: TableHopLike,
  columns: readonly string[] | null | undefined,
): boolean => projectColumns(hop, columns).length < hop.lookup.attributes.length;

export const tableHopSql = (hop: TableHopLike, spec: TableHopSqlSpec = {}): TableHopSql => {
  const projected = projectColumns(hop, spec.columns);
  const keys = hop.lookup.keyColumns;
  const many = spec.many ?? null;
  if (many && !keys.some((key) => key.axis === many.axis)) {
    throw new Error(`hop binds no key named ${many.axis} to bind a list under`);
  }
  if (many && many.count < 1) {
    throw new Error("a MANY binding needs at least one value");
  }

  // A MANY read returns the key columns with each row, so a row says which of
  // the bound values it answers. Declared attributes that double as keys are
  // not selected twice.
  const keyNames = many ? keys.map((key) => key.column.name) : [];
  const selectNames = [...keyNames, ...projected.filter((name) => !keyNames.includes(name))];
  const selectList = selectNames.length
    ? selectNames.map((name) => escapeSqlIdentifier(name)).join(", ")
    : "*";

  const where = keys
    .map((key) => {
      const identifier = escapeSqlIdentifier(key.column.name);
      if (many && key.axis === many.axis) {
        return `${identifier} IN (${Array.from({ length: many.count }, () => "?").join(", ")})`;
      }
      return `${identifier} = ?`;
    })
    .join(" AND ");

  return {
    sql: `SELECT ${selectList} FROM read_parquet(?)${where ? ` WHERE ${where}` : ""}`,
    selected: selectNames,
    shapeKey: isProjection(hop, spec.columns) ? `#${projected.join(",")}` : "",
  };
};
