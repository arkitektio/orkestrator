/**
 * Main-thread cache of decoded zarr v3 shard indexes.
 *
 * One ranged read per shard per scene, shared by every brick / worker that
 * touches the shard (the decode workers never see a shard index — they receive
 * a plain `Range` to fetch). Single-flight on the promise so concurrent bricks
 * of the same shard coalesce; a rejected read is evicted so the next caller
 * retries instead of hitting a poisoned promise. `null` = the shard object is
 * absent (404) ⇒ every inner chunk is fill.
 *
 * Bounded by entry count: an index is 16 B × inner-chunks-per-shard (8 KB for
 * 512³/64³), so 1024 entries is ≤ ~8 MB for typical layouts.
 */

import type { AbsolutePath } from '@zarrita/storage'
import type { RangeReadableStore } from '@/core/lib/zarr/store/types'
import { decodeShardIndex, indexRange, type ShardingLayout } from './sharding'

export const SHARD_INDEX_CACHE_ENTRIES = 1024

export class ShardIndexCache {
  private readonly entries = new Map<string, Promise<BigUint64Array | null>>()

  constructor(private readonly maxEntries = SHARD_INDEX_CACHE_ENTRIES) {}

  get size(): number {
    return this.entries.size
  }

  get(
    store: RangeReadableStore,
    storeId: string,
    shardPath: AbsolutePath,
    layout: ShardingLayout,
    options?: RequestInit,
  ): Promise<BigUint64Array | null> {
    const key = `${storeId}:${shardPath}`
    const hit = this.entries.get(key)
    if (hit) {
      // LRU touch: re-insert so eviction order follows recency.
      this.entries.delete(key)
      this.entries.set(key, hit)
      return hit
    }
    const promise = (async () => {
      const bytes = await store.getRange(shardPath, indexRange(layout), options)
      if (!bytes) return null
      return decodeShardIndex(bytes, layout)
    })()
    this.entries.set(key, promise)
    promise.catch(() => {
      if (this.entries.get(key) === promise) this.entries.delete(key)
    })
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
    return promise
  }

  clear(): void {
    this.entries.clear()
  }
}

/** Process-wide instance: shard indexes are content-addressed by store + path. */
export const DEFAULT_SHARD_INDEX_CACHE = new ShardIndexCache()
