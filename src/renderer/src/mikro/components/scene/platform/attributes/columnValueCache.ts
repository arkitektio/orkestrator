import type { AttributeLookupEngine } from "@/mikro/lib/attributes/lookupEngine";
import { LruMap } from "@/core/util/lruMap";
import {
  columnValueAt,
  readColumnValues,
  type ColumnValues,
} from "@/mikro/lib/attributes/columnarReads";
import { readColumnValuesBatched } from "@/mikro/lib/attributes/columnReadBatch";
import {
  readColumnByCompositeKey,
  readColumnByObjectId,
  type CompositeTableAccess,
  type TableAccess,
} from "./columnLut";

/**
 * A per-engine cache of `objectId → value` column maps, sitting ABOVE
 * `engine.readAcross` (which is unbatched and uncached on purpose — the cache
 * belongs to the render path that knows the values are reusable, not to the
 * engine that must stay a plain executor).
 *
 * Why it exists: the LUT effects key on the CONTENT of the active colorBy /
 * filterBys, so every colormap switch, clim nudge or rule tweak rebuilds the
 * LUT — and without this cache each rebuild re-ran a full-table
 * `SELECT key, value FROM read_parquet(…)` per entry. The values themselves
 * change with none of those knobs; only the PAINT does. With the cache, a knob
 * change re-runs allocate + paint + one texture upload, and the scan runs once
 * per (store, key column, column) per engine lifetime.
 *
 * Staleness: this assumes a store id names IMMUTABLE parquet content within a
 * session — the same assumption `ParquetPart`'s footer memo and the attribute
 * plan cache already make. Grant/URL rotation does not change the values, so
 * it does not invalidate them.
 *
 * Lifecycle rides the engine: the WeakMap keys on the `AttributeLookupEngine`,
 * so when `AttributeService.dispose()` drops the engine the cached maps go
 * with it — no explicit invalidation API needed.
 *
 * The PROMISE is cached, not the map, so concurrent rebuilds (a colorBy and a
 * rule reading the same column) share one scan; a rejected read evicts itself
 * so a transient failure never poisons the key.
 */

/** Column maps kept per engine. Whole-column maps can be large, so the cap is
 * modest — a scene rarely has more than a handful of active columns. */
const CACHE_CAPACITY = 24;

const caches = new WeakMap<AttributeLookupEngine, LruMap<Promise<Map<number, unknown>>>>();

/**
 * Get-or-start a memoized promise in a per-engine LRU, self-evicting on
 * rejection.
 *
 * Five readers below wanted exactly this and each spelled it out: look up the
 * engine's cache (creating it on first use), build the key, return a hit, else
 * start the read and attach a `catch` that removes the entry — but ONLY if the
 * entry is still this promise, so a retry that already replaced it is left
 * alone. That last condition is the whole reason this is a helper rather than
 * five three-line bodies: it is easy to write as an unconditional `take(key)`,
 * and the bug that produces (a slow failure evicting a newer, healthy read)
 * is invisible until two reads of one column overlap.
 *
 * The caller supplies the cache map because the value types genuinely differ
 * (`Map<number, …>`, `Map<string, …>`, `ColumnValues | null`) and a shared
 * store with a union type would hand a caller the shape it did not ask for.
 */
const memoizePerEngine = <V>(
  caches: WeakMap<AttributeLookupEngine, LruMap<Promise<V>>>,
  engine: AttributeLookupEngine,
  key: string,
  start: () => Promise<V>,
): Promise<V> => {
  let cache = caches.get(engine);
  if (!cache) {
    cache = new LruMap(CACHE_CAPACITY);
    caches.set(engine, cache);
  }
  const hit = cache.get(key);
  if (hit) return hit;
  const promise: Promise<V> = start().catch((error: unknown) => {
    const current = caches.get(engine);
    if (current && current.get(key) === promise) current.take(key);
    throw error;
  });
  cache.set(key, promise);
  return promise;
};

/** The key every table-scoped read shares: store, key column, value column. */
const tableKey = (access: { store: { id: string }; keyColumn: string }, column: string): string =>
  `${access.store.id}:${access.keyColumn}:${column}`;

export const readColumnByObjectIdCached = (
  engine: AttributeLookupEngine,
  access: TableAccess,
  column: string,
): Promise<Map<number, unknown>> =>
  memoizePerEngine(caches, engine, tableKey(access, column), () =>
    readColumnByObjectId(engine, access, column),
  );

/**
 * `readColumnByObjectIdCached`, with the SCAN shared: the values come off the
 * batched COLUMNAR read when it can answer (one multi-column SELECT for every
 * same-tick entry over the table — `columnReadBatch.ts`), and the row map the
 * legacy consumers index by id is derived from those arrays rather than by a
 * second scan of the same column. Falls back to the plain row path when the
 * columnar read declines (non-numeric key column, exotic result shape).
 *
 * Same cache, same key, same contract as `readColumnByObjectIdCached` — this
 * is a drop-in for every `readColumn` injection.
 */
export const readColumnByObjectIdBatchedCached = (
  engine: AttributeLookupEngine,
  access: TableAccess,
  column: string,
): Promise<Map<number, unknown>> =>
  memoizePerEngine(caches, engine, tableKey(access, column), async () => {
    const columnar = await readColumnValuesBatchedCached(engine, access, column);
    // The columnar read declines on a non-numeric key column or an exotic
    // result shape; the plain row path is the fallback, not an error.
    if (!columnar) return readColumnByObjectId(engine, access, column);
    const map = new Map<number, unknown>();
    for (let index = 0; index < columnar.count; index += 1) {
      map.set(Number(columnar.ids[index]), columnValueAt(columnar, index));
    }
    return map;
  });

/**
 * The same cache, for the COMPOSITE-keyed read (a network node/edge table's
 * `(object, node…)` columns). Its own `LruMap` for the reason the columnar one
 * has its own: the value type differs (`Map<string, …>` against
 * `Map<number, …>`), and a shared cache with a union type would hand a caller
 * the shape it did not ask for. Keyed by the ORDERED key-column list — order
 * is meaning for a composite key, so `(a,b)` and `(b,a)` are different reads.
 */
const compositeCaches = new WeakMap<
  AttributeLookupEngine,
  LruMap<Promise<Map<string, unknown>>>
>();

export const readColumnByCompositeKeyCached = (
  engine: AttributeLookupEngine,
  access: CompositeTableAccess,
  column: string,
): Promise<Map<string, unknown>> =>
  // Keyed by the ORDERED key-column list: order is meaning for a composite
  // key, so `(a,b)` and `(b,a)` are different reads.
  memoizePerEngine(
    compositeCaches,
    engine,
    `${access.store.id}:${access.keyColumns.join(",")}:${column}`,
    () => readColumnByCompositeKey(engine, access, column),
  );

/**
 * The same cache, for the COLUMNAR read.
 *
 * A separate `LruMap` rather than a shared one keyed by shape: the two hold
 * different things for the same key, and one cache with a union value type
 * would hand a caller the shape it did not ask for. They are cheap to keep
 * apart — a scene reads a handful of columns — and the label path is the only
 * caller of this one, so in practice only one of the two is ever populated for
 * a given column.
 *
 * Null is cached too, and deliberately: a column the columnar path cannot
 * answer (a non-numeric key, a result with no columnar view) will not become
 * answerable on a retry, and re-running a full-table scan on every rebuild to
 * rediscover that is the cost this cache exists to remove. The caller falls
 * back to `readColumnByObjectIdCached`, which has its own entry.
 */
const columnarCaches = new WeakMap<
  AttributeLookupEngine,
  LruMap<Promise<ColumnValues | null>>
>();

/** `readColumnValuesCached`, with the batched read underneath — same cache,
 *  same key, so batched and unbatched consumers share entries. The cache sits
 *  OUTSIDE the batch: only true misses contribute to a tick's statement. */
export const readColumnValuesBatchedCached = (
  engine: AttributeLookupEngine,
  access: TableAccess,
  column: string,
): Promise<ColumnValues | null> =>
  memoizePerEngine(columnarCaches, engine, tableKey(access, column), () =>
    readColumnValuesBatched(engine, access, column),
  );

export const readColumnValuesCached = (
  engine: AttributeLookupEngine,
  access: TableAccess,
  column: string,
): Promise<ColumnValues | null> =>
  memoizePerEngine(columnarCaches, engine, tableKey(access, column), () =>
    readColumnValues(engine, access, column),
  );
