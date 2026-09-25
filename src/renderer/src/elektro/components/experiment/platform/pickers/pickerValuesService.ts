import type { ParquetQueryEngine } from "@/core/data/parquet/parquetEngine";
import { unitIdColumn, type UnitTableLike } from "../sources/unitTable";
import { chainSql, entryProblem, type PickerEntry, type TableRef } from "./pickerModel";

/**
 * The values behind layers' pickers — one service per experiment scope, shared
 * by every driver, card and editor that asks.
 *
 * It caches two things a picker needs over and over: a table's metadata (store,
 * identity column, columns — what the editor lists and every join walks), and
 * each entry's `key → value` map. Both are cached as PROMISES and self-evict on
 * failure, so two layers asking at once share one read and an error does not
 * stick.
 *
 * `from` says where the key sits on an entry's chain:
 *  - `0` — the ROOT table's identity (a raster's unit index);
 *  - `1` — the first JOINED table's identity (an event row's foreign key, which
 *    the events read carries alongside each row). Direct entries need no map at
 *    `from = 1` — their column rides along on the events read itself.
 *
 * Dependency-injected (the engine and the table fetch are getters/functions), so
 * it runs in tests without Apollo or DuckDB.
 */

export type TableMeta = UnitTableLike & {
  columns?: readonly {
    name: string;
    role?: string | null;
    axisType?: string | null;
    dtype?: string | null;
    references?: { id: string; name: string } | null;
  }[] | null;
};

export type PickerServiceDeps = {
  engine: () => ParquetQueryEngine | null;
  fetchTable: (id: string) => Promise<TableMeta | null>;
};

export type PickerValues = {
  /** Entry key → its map (absent when skipped or failed). */
  maps: Record<string, Map<unknown, unknown>>;
  /** Entry key → why it is not drawn. */
  problems: Record<string, string>;
};

/** Keys compare as numbers where they are numeric (a unit index read as 3 or "3"). */
export const normalizeKey = (key: unknown): unknown => {
  if (typeof key === "bigint") return Number(key);
  if (typeof key === "string" && key.trim() !== "" && Number.isFinite(Number(key))) return Number(key);
  return key;
};

const selfEvicting = <T>(cache: Map<string, Promise<T>>, key: string, make: () => Promise<T>): Promise<T> => {
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = make();
  cache.set(key, pending);
  pending.catch(() => {
    if (cache.get(key) === pending) cache.delete(key);
  });
  return pending;
};

export class PickerValuesService {
  private readonly tables = new Map<string, Promise<TableMeta | null>>();
  private readonly maps = new Map<string, Promise<Map<unknown, unknown>>>();

  constructor(private readonly deps: PickerServiceDeps) {}

  /** A table's metadata, fetched once. Seed it with tables the scene already holds. */
  table(id: string): Promise<TableMeta | null> {
    return selfEvicting(this.tables, id, () => this.deps.fetchTable(id));
  }

  /** Register a table already in hand (a layer's own root table) — no fetch needed. */
  seed(table: TableMeta): void {
    if (!this.tables.has(table.id)) this.tables.set(table.id, Promise.resolve(table));
  }

  /** The maps for a layer's active entries (problems for the ones that cannot be drawn). */
  async values(
    root: TableMeta,
    entries: readonly { key: string; entry: PickerEntry }[],
    from: 0 | 1,
  ): Promise<PickerValues> {
    this.seed(root);
    const out: PickerValues = { maps: {}, problems: {} };
    await Promise.all(
      entries.map(async ({ key, entry }) => {
        const problem = entryProblem(entry, root.id);
        if (problem) {
          out.problems[key] = problem;
          return;
        }
        if (from === 1 && (entry.joinPath ?? []).length === 0) return;
        try {
          out.maps[key] = await this.entryMap(root, entry, from);
        } catch (error) {
          out.problems[key] = error instanceof Error ? error.message : String(error);
        }
      }),
    );
    return out;
  }

  dispose(): void {
    this.tables.clear();
    this.maps.clear();
  }

  private entryMap(root: TableMeta, entry: PickerEntry, from: 0 | 1): Promise<Map<unknown, unknown>> {
    const cacheKey = JSON.stringify([root.id, from, entry.table, entry.column, entry.joinPath ?? []]);
    return selfEvicting(this.maps, cacheKey, async () => {
      const engine = this.deps.engine();
      if (!engine) throw new Error("the parquet engine is not ready");
      const path = entry.joinPath ?? [];
      const chain = [...path.map((s) => s.table), path.length ? entry.table : root.id];
      const metas = await Promise.all(chain.map((id) => this.table(id)));
      if (metas.some((m) => m == null)) throw new Error("a table on its join could not be loaded");
      const refs = new Map<string, TableRef>(
        metas.map((m) => [m!.id, { id: m!.id, store: m!.store, idColumn: unitIdColumn(m!) }]),
      );
      const rows = await engine.readAcross(
        metas.slice(from).map((m) => m!.store),
        (urlOf) => {
          const sql = chainSql(entry, root.id, (id) => refs.get(id) ?? null, urlOf, { from });
          if (!sql) throw new Error("a table on its join declares no identity column");
          return sql;
        },
      );
      return new Map(rows.map((row) => [normalizeKey(row.__key), row.__v]));
    });
  }
}
