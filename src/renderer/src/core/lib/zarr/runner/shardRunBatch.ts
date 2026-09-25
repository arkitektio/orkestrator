/**
 * Cross-call batching of shard range reads: group calls issued in the same
 * tick (neighbouring bricks dispatched by one reconcile loop) contribute
 * their post-index byte ranges here, keyed by everything that must match for
 * the items to legally share one `fetch_decode_multi` request. A
 * `setTimeout(0)` flush then coalesces ACROSS the contributing calls — the
 * dispatch loop is synchronous and same-shard index reads share one
 * single-flight promise, so same-tick contributions land within one
 * macrotask, and a lone contribution pays at most that one macrotask.
 */

import {
  coalesceRangesDense,
  DEFAULT_DENSE_COALESCE,
  type CoalescedRange,
  type DenseCoalesceOptions,
} from "./rangeCoalesce"

export interface ShardBatchItem {
  offset: number
  length: number
  /** Set when the chunk is at the array edge (smaller than the chunk shape). */
  actualChunkShape?: number[]
  priority: number
  /** Effective abort for this chunk (per-coord signal ?? the call's signal). */
  signal?: AbortSignal
  /** Run-of-1 fallback — the owning call's single-chunk path. */
  dispatchSingle(): void
  onChunk(chunk: unknown | undefined): void
  onError(error: unknown): void
  /** Stats hook of the owning call (`onDispatch`, additive). */
  attributeTasks(count: number): void
}

export type ShardRunExecutor = (run: CoalescedRange<ShardBatchItem>) => void

interface PendingBatch {
  items: ShardBatchItem[]
  coalesce: DenseCoalesceOptions
  execute: ShardRunExecutor
  timer: ReturnType<typeof setTimeout>
}

const pending = new Map<string, PendingBatch>()

const poolIdMap = new WeakMap<object, number>()
let poolIdCounter = 0

function getPoolId(pool: object): string {
  if (!poolIdMap.has(pool)) poolIdMap.set(pool, poolIdCounter++)
  return `pool_${poolIdMap.get(pool)}`
}

/**
 * The key is the correctness linchpin: it must cover EVERY non-per-item
 * argument of `workerFetchDecodeMulti` plus scheduling identity (pool,
 * workerUrl) and the coalesce rule — anything missing here would decode a
 * merged member with another call's parameters. Keep in lockstep with
 * `executeShardRun` in get-worker.ts.
 */
export function shardBatchKeyFor(parts: {
  pool: object
  workerUrl: string | URL | undefined
  storeId: string
  shardPath: string
  metaId: number | string
  textureFidelity: string
  useSharedArrayBuffer: boolean
  serializedRequestInit: unknown
  coalesce: DenseCoalesceOptions
}): string {
  return [
    getPoolId(parts.pool),
    String(parts.workerUrl ?? ""),
    parts.storeId,
    parts.shardPath,
    String(parts.metaId),
    parts.textureFidelity,
    parts.useSharedArrayBuffer ? "sab" : "copy",
    JSON.stringify(parts.serializedRequestInit ?? null),
    JSON.stringify(parts.coalesce),
  ].join("|")
}

/**
 * Add one call's items for a shard to the pending batch and (on the first
 * contribution for the key) schedule the flush. The first contributor's
 * `coalesce`/`execute` win — by key construction all contributors' are
 * equivalent.
 *
 * Task attribution at flush is LEAD-ITEM: each physical request is counted
 * once, on the run's first item's owner, so a scene-wide sum of `onDispatch`
 * counts stays an exact requests total while per-call counts become
 * approximate for shared runs.
 */
export function contributeShardItems(
  batchKey: string,
  items: ShardBatchItem[],
  coalesce: DenseCoalesceOptions = DEFAULT_DENSE_COALESCE,
  execute: ShardRunExecutor,
): void {
  if (items.length === 0) return
  const entry = pending.get(batchKey)
  if (entry) {
    entry.items.push(...items)
    return
  }
  const batch: PendingBatch = {
    items: [...items],
    coalesce,
    execute,
    timer: setTimeout(() => flush(batchKey), 0),
  }
  pending.set(batchKey, batch)
}

function flush(batchKey: string): void {
  const batch = pending.get(batchKey)
  if (!batch) return
  pending.delete(batchKey)
  const ranges = batch.items.map((item) => ({
    offset: item.offset,
    length: item.length,
    item,
  }))
  for (const run of coalesceRangesDense(ranges, batch.coalesce)) {
    if (run.items.length === 1) {
      const only = run.items[0].item
      only.dispatchSingle()
      only.attributeTasks(1)
    } else {
      batch.execute(run)
      run.items[0].item.attributeTasks(1)
    }
  }
}

/** Test hook: drain every pending batch synchronously. */
export function flushPendingShardBatchesNow(): void {
  for (const [key, batch] of [...pending]) {
    clearTimeout(batch.timer)
    flush(key)
  }
}
