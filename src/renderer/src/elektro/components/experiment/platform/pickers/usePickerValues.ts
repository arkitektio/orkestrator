import type { ApolloClient, NormalizedCache } from "@apollo/client";
import { useEffect, useState } from "react";
import { useElektro } from "@/app/Arkitekt";
import {
  GetTableDatasetDocument,
  type GetTableDatasetQuery,
  type GetTableDatasetQueryVariables,
} from "@/elektro/api/graphql";
import { useElektroParquetEngine } from "@/elektro/components/store/parquetEngine";
import { unitIdColumn } from "../sources/unitTable";
import { chainSql, entryProblem, type PickerEntry, type TableRef } from "./pickerModel";

/**
 * The values behind a layer's active pickers, as maps `key → value`.
 *
 * `from` says where the key sits on each entry's chain:
 *  - `0` — the ROOT table's identity (a raster's unit index): one SQL walk from
 *    the root to the terminal column answers every unit at once;
 *  - `1` — the first JOINED table's identity (an event row's foreign key, which
 *    the events read carries alongside each row): the walk starts past the root.
 *    Direct entries need no map at `from = 1` — their column rides along on the
 *    events read itself — and are skipped.
 *
 * Tables past the root are fetched once through Apollo (`GetTableDataset`,
 * cache-first) for their store and identity column; every read goes through the
 * shared parquet engine, which installs a scoped secret per store.
 */

export type PickerValues = {
  /** Entry key → its map (absent while loading or when skipped). */
  maps: Record<string, Map<unknown, unknown>>;
  /** Entry key → why it is not drawn. */
  problems: Record<string, string>;
  loading: boolean;
};

const EMPTY: PickerValues = { maps: {}, problems: {}, loading: false };

export const usePickerValues = (
  root: TableRef | null,
  entries: readonly { key: string; entry: PickerEntry }[],
  from: 0 | 1,
): PickerValues => {
  const client = useElektro() as ApolloClient<NormalizedCache> | undefined;
  const engine = useElektroParquetEngine();
  const [values, setValues] = useState<PickerValues>(EMPTY);
  const signature = JSON.stringify([root?.id, from, entries.map((e) => [e.key, e.entry])]);

  useEffect(() => {
    if (!root || !engine || !client || entries.length === 0) {
      setValues(EMPTY);
      return;
    }
    let disposed = false;
    setValues((v) => ({ ...v, loading: true }));

    const tables = new Map<string, TableRef>([[root.id, root]]);
    const fetchTable = async (id: string): Promise<TableRef | null> => {
      if (tables.has(id)) return tables.get(id)!;
      const result = await client.query<GetTableDatasetQuery, GetTableDatasetQueryVariables>({
        query: GetTableDatasetDocument,
        variables: { id },
        fetchPolicy: "cache-first",
      });
      const table = result.data?.tableDataset;
      if (!table) return null;
      const ref = { id: table.id, store: table.store, idColumn: unitIdColumn(table) };
      tables.set(id, ref);
      return ref;
    };

    void (async () => {
      const maps: Record<string, Map<unknown, unknown>> = {};
      const problems: Record<string, string> = {};
      for (const { key, entry } of entries) {
        const problem = entryProblem(entry, root.id);
        if (problem) {
          problems[key] = problem;
          continue;
        }
        const path = entry.joinPath ?? [];
        if (from === 1 && path.length === 0) continue;
        try {
          const chain = [...path.map((s) => s.table), path.length ? entry.table : root.id];
          const refs = await Promise.all(chain.map(fetchTable));
          if (refs.some((r) => r == null)) {
            problems[key] = "a table on its join could not be loaded";
            continue;
          }
          const stores = refs.slice(from).map((r) => r!.store);
          const rows = await engine.readAcross(stores, (urlOf) => {
            const sql = chainSql(entry, root.id, (id) => tables.get(id) ?? null, urlOf, { from });
            if (!sql) throw new Error("a table on its join declares no identity column");
            return sql;
          });
          maps[key] = new Map(rows.map((row) => [normalizeKey(row.__key), row.__v]));
        } catch (error) {
          problems[key] = error instanceof Error ? error.message : String(error);
        }
      }
      if (!disposed) setValues({ maps, problems, loading: false });
    })();

    return () => {
      disposed = true;
    };
    // `signature` stands for `root`, `entries` and `from`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, engine, client]);

  return values;
};

/** Keys compare as numbers where they are numeric (a unit index read as 3 or "3"). */
export const normalizeKey = (key: unknown): unknown => {
  if (typeof key === "bigint") return Number(key);
  if (typeof key === "string" && key.trim() !== "" && Number.isFinite(Number(key))) return Number(key);
  return key;
};
