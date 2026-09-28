/**
 * Cross-call batching of full-column parquet reads: calls issued in the same
 * tick (a styling build resolving its colouring and every rule at once, via
 * `Promise.all`) contribute their columns here, keyed by everything that must
 * match for the reads to legally share one SELECT — the engine, the store and
 * the key column. A `setTimeout(0)` flush then issues ONE
 *
 *     SELECT key AS object_id, "c1", "c2", … ORDER BY object_id
 *
 * where each contributor used to issue its own full scan of the same parquet,
 * serialized behind the others on the engine's one connection. The pattern is
 * `lib/zarr/runner/shardRunBatch.ts`'s, transplanted: same-tick contributions
 * land within one macrotask, a lone contribution pays at most that macrotask
 * and takes the plain single-column path, and the KEY IS THE CORRECTNESS
 * LINCHPIN — anything that varies per call and is not in it would read a
 * merged member against another call's table.
 *
 * One statement also *strengthens* `readColumnValues`' row-alignment
 * contract: columns of one SELECT share one row order by construction, where
 * two ORDER BY reads merely promise to agree.
 *
 * Failure isolation: a batch-level SQL error (one bad column name fails the
 * whole statement) falls back to per-column `readColumnValues`, so a bad
 * column cannot poison its siblings.
 */
import type { ParquetStoreLike } from "./attributeTypes";
import { readColumnValues, type ColumnValues } from "./columnarReads";
import type { AttributeLookupEngine } from "./lookupEngine";
import { escapeSqlIdentifier, escapeSqlLiteral } from "./sqlBind";

type Contributor = {
  column: string;
  resolve: (values: ColumnValues | null) => void;
  reject: (error: unknown) => void;
};

type PendingBatch = {
  engine: AttributeLookupEngine;
  store: ParquetStoreLike;
  keyColumn: string;
  contributors: Contributor[];
};

const pending = new Map<string, PendingBatch>();

const engineIds = new WeakMap<object, number>();
let engineIdCounter = 0;
const engineIdOf = (engine: object): string => {
  let id = engineIds.get(engine);
  if (id === undefined) {
    id = engineIdCounter++;
    engineIds.set(engine, id);
  }
  return `engine_${id}`;
};

/** Everything non-per-item: engine identity, store, key column. Exported for
 *  the tests that ratchet the key's completeness. */
export const columnBatchKeyFor = (
  engine: AttributeLookupEngine,
  store: ParquetStoreLike,
  keyColumn: string,
): string => [engineIdOf(engine), store.id, keyColumn].join("|");

/** A column as numbers, or null — `columnarReads.ts`'s runtime split. */
const asNumeric = (column: ArrayLike<number> | ArrayLike<string>): ArrayLike<number> | null =>
  ArrayBuffer.isView(column) ? (column as ArrayLike<number>) : null;

const flush = async (batch: PendingBatch): Promise<void> => {
  const { engine, store, keyColumn, contributors } = batch;

  // Run of 1: the owning call's plain single-column read, no alias plumbing.
  if (contributors.length === 1) {
    const [only] = contributors;
    try {
      only.resolve(await readColumnValues(engine, { store, keyColumn }, only.column));
    } catch (error) {
      only.reject(error);
    }
    return;
  }

  // Dedupe: contributors of one column share one result object.
  const columns = [...new Set(contributors.map(({ column }) => column))];
  const aliasOf = new Map(columns.map((column, index) => [column, `c${index}`] as const));

  const settle = (valuesFor: (column: string) => ColumnValues | null): void => {
    for (const contributor of contributors) contributor.resolve(valuesFor(contributor.column));
  };
  const fallback = async (): Promise<void> => {
    // Per-column, so one bad column fails only its own contributors.
    await Promise.all(
      contributors.map(async (contributor) => {
        try {
          contributor.resolve(
            await readColumnValues(engine, { store, keyColumn }, contributor.column),
          );
        } catch (error) {
          contributor.reject(error);
        }
      }),
    );
  };

  let read: Record<string, ArrayLike<number> | ArrayLike<string>> | null;
  try {
    read = await engine.readColumnsTyped(
      [store],
      (urlOf) =>
        `SELECT ${escapeSqlIdentifier(keyColumn)} AS object_id, ${columns
          .map((column) => `${escapeSqlIdentifier(column)} AS ${aliasOf.get(column)}`)
          .join(", ")} FROM read_parquet(${escapeSqlLiteral(urlOf(store.id))}) ORDER BY object_id`,
      ["object_id", ...columns.map((column) => aliasOf.get(column)!)],
    );
  } catch {
    await fallback();
    return;
  }

  if (!read) {
    settle(() => null);
    return;
  }
  const ids = asNumeric(read.object_id);
  if (!ids) {
    settle(() => null);
    return;
  }

  const byColumn = new Map<string, ColumnValues | null>(
    columns.map((column) => {
      const raw = read![aliasOf.get(column)!];
      // An engine honouring the contract returns every requested column or
      // null for the lot; a partial answer still resolves the missing member
      // to null (→ the caller's row fallback) rather than to garbage.
      if (raw == null || typeof raw.length !== "number") return [column, null] as const;
      const numeric = asNumeric(raw);
      return [
        column,
        {
          ids,
          numeric,
          text: numeric ? null : (raw as ArrayLike<string>),
          count: ids.length,
        },
      ] as const;
    }),
  );
  settle((column) => byColumn.get(column) ?? null);
};

/**
 * One column's values, coalesced with every same-tick read of the same
 * `(engine, store, keyColumn)`. Same result contract as `readColumnValues`:
 * null when the read cannot answer columnwise, a rejection on a genuine
 * failure of THIS column.
 */
export const readColumnValuesBatched = (
  engine: AttributeLookupEngine,
  access: { store: ParquetStoreLike; keyColumn: string },
  column: string,
): Promise<ColumnValues | null> => {
  const key = columnBatchKeyFor(engine, access.store, access.keyColumn);
  let batch = pending.get(key);
  if (!batch) {
    const opened: PendingBatch = {
      engine,
      store: access.store,
      keyColumn: access.keyColumn,
      contributors: [],
    };
    batch = opened;
    pending.set(key, opened);
    setTimeout(() => {
      pending.delete(key);
      void flush(opened);
    }, 0);
  }
  return new Promise<ColumnValues | null>((resolve, reject) => {
    batch!.contributors.push({ column, resolve, reject });
  });
};
