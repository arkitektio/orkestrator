/**
 * Turning a name into a position along a sparse axis.
 *
 * An `at` entry is `{axis, value}` where `value` is a **row index**, not a gene
 * name. The names live in the table the axis references — that is what
 * `SparseAxisReference` is for, and it is the reason a 19,059-feature matrix
 * costs ONE row in the picker rather than 19,059: the server offers the axis,
 * and the client finds the position.
 *
 * Read once per axis and filtered in the browser. A transcriptome's names are
 * about 250 KB, so one read buys instant typing against the whole list, and the
 * alternative — a query per keystroke — spends round trips to avoid a quarter
 * of a megabyte. Neither costs the server anything: this is the client's own
 * DuckDB over parquet it already holds a grant for.
 */
import { ColumnRole } from "@/mikro/api/graphql";
import type { SparseColouringSourceFragment } from "@/mikro/api/graphql";
import type { AttributeLookupEngine } from "../attributes/lookupEngine";
import { escapeSqlIdentifier, escapeSqlLiteral } from "../attributes/sqlBind";
import { LruMap } from "@/core/util/lruMap";

export type AxisPosition = { value: number; label: string };

type ReferencedTable = SparseColouringSourceFragment["axisReferences"][number]["references"];

/**
 * Which column names a row, and which holds its index.
 *
 * The index column is the table's single INDEX coordinate — the same one
 * `createTableDataset` requires of any reference target, and the one a position
 * IS. The label is the first LABEL-role column, falling back to the index
 * itself so an axis with no names still lists positions rather than nothing.
 */
export const positionColumnsOf = (
  table: ReferencedTable,
): { index: string; label: string | null } | null => {
  const columns = table.columns ?? [];
  const index = columns.find((column) => column.role === ColumnRole.Coordinate)?.name
    ?? columns.find((column) => column.role === ColumnRole.Id)?.name;
  if (!index) return null;
  const label = columns.find((column) => column.role === ColumnRole.Label)?.name ?? null;
  return { index, label };
};

const cache = new LruMap<Promise<readonly AxisPosition[]>>(8);

/**
 * Every position along one axis, with its name.
 *
 * Cached per referenced table for the app's life — the list is a property of
 * the dataset, not of the colouring, so switching genes never re-reads it.
 */
export const readAxisPositions = (
  engine: AttributeLookupEngine,
  table: ReferencedTable,
): Promise<readonly AxisPosition[]> => {
  const cached = cache.get(table.id);
  if (cached) return cached;

  const columns = positionColumnsOf(table);
  if (!columns) {
    return Promise.reject(
      new Error(`'${table.name}' declares no INDEX coordinate column, so its rows are not positions`),
    );
  }

  const index = escapeSqlIdentifier(columns.index);
  const label = columns.label ? escapeSqlIdentifier(columns.label) : index;
  const pending = engine
    .readAcross(
      [table.store],
      (urlOf) =>
        `SELECT ${index} AS position, ${label} AS label FROM read_parquet(${escapeSqlLiteral(urlOf(table.store.id))}) ORDER BY position`,
    )
    .then((rows) =>
      rows
        .map((row) => ({ value: Number(row.position), label: String(row.label ?? row.position) }))
        .filter((entry) => Number.isFinite(entry.value)),
    );

  cache.set(table.id, pending);
  pending.catch(() => {
    if (cache.get(table.id) === pending) cache.take(table.id);
  });
  return pending;
};

/**
 * The positions whose name matches, best-prefix first.
 *
 * Prefix before substring because a gene list is full of names that contain
 * each other — typing "IL7" should reach IL7R before AKIRIN1L7 — and capped
 * because a dropdown showing thousands of rows is a wall, not a control.
 */
export const matchPositions = (
  positions: readonly AxisPosition[],
  term: string,
  limit = 50,
): readonly AxisPosition[] => {
  const needle = term.trim().toLowerCase();
  if (!needle) return positions.slice(0, limit);
  const prefix: AxisPosition[] = [];
  const contains: AxisPosition[] = [];
  for (const entry of positions) {
    const haystack = entry.label.toLowerCase();
    if (haystack.startsWith(needle)) prefix.push(entry);
    else if (haystack.includes(needle)) contains.push(entry);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...contains].slice(0, limit);
};
