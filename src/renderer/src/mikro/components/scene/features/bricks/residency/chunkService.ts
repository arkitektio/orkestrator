import type { Chunk, DataType } from "zarrita";
import {
  chunkCacheKeyFor,
  getChunkGroupWorker,
  getChunkWorker,
  readArrayMetadataCached,
  type ArrayMetadata,
} from "@/core/data/zarr/runner/index";
import { workerPool } from "@/core/data/zarr/pool/sharedWorkerPool";
import { ByteBudgetChunkCache } from "@/core/data/zarr/caches/byteBudgetChunkCache";
import { chunkFidelityForDtype } from "../octree/atlasFormat";
import { ChunkRefRegistry } from "../octree/chunkRefRegistry";
import type { BrickSystemStats } from "./residencyTypes";

export type ZarrArrayHandle = Parameters<typeof getChunkWorker>[0];

/**
 * The residency manager's decoded-chunk layer — the closed field set that IS
 * the P8/P10 mechanism (OCTREE_RENDERER.md §2.8): the byte-budgeted chunk
 * cache, in-flight sharing (one decode per chunk however many bricks want
 * it), per-chunk referrer counting with last-referrer cancellation, the
 * dispose-scoped abort, first-seen-honest `bytesDecoded`, and the sync
 * probe's chunk-key encoders + single-entry memo.
 *
 * Owned by one `BrickResidencyManager`; it writes the manager's `stats`
 * object directly (`bytesDecoded`, `rangeRequests`, `cancelledDecodes`).
 */
export class ChunkService {
  private readonly cache: ByteBudgetChunkCache;
  /** Per store: the array metadata the probe path keys the chunk cache with
   * (encoder + sharding layout); `null` while resolving. */
  private readonly chunkKeyEncoders = new Map<string, ArrayMetadata | null>();
  /** Single-entry memo for the sync chunk-cache probe: consecutive march
   * steps overwhelmingly read the SAME decoded chunk, so the last one is
   * kept keyed by its FULL zarr chunk coords — a hit skips the cache-key
   * string build and the LRU mutation entirely (≈256×/frame during a 3D
   * hover). Safe without invalidation: decoded chunks are immutable and any
   * slice/dim change alters the coord tuple, which is compared in full. */
  private lastChunkRead: {
    storeId: string;
    coords: number[];
    chunk: Chunk<DataType>;
  } | null = null;
  /** Scratch for the probe's coord tuple (avoids a per-sample allocation).
   * Filled by the caller, consumed synchronously by `cachedChunkSync`. */
  readonly coordsScratch: number[] = [];
  /** In-flight decoded-chunk promises, shared across bricks: without this,
   * N concurrent bricks touching the same plane chunk decode it N times
   * (observed 73× fetch amplification on plane-chunked SPIM data). */
  private readonly inFlightChunks = new Map<string, Promise<Chunk<DataType>>>();
  /** Per-in-flight-chunk abort: fired ONLY when the last referring brick
   * releases (see chunkRefs) — the worker pool then cancels the task if it
   * is still QUEUED, while a started task ignores it and finishes into the
   * cache. Entries live exactly as long as their inFlightChunks entry. */
  private readonly inFlightChunkAborts = new Map<string, AbortController>();
  /** Which live bricks need which in-flight chunk (`features/bricks/octree/chunkRefRegistry`). */
  private readonly chunkRefs = new ChunkRefRegistry();
  /** Chunk fetches outlive individual brick aborts (shared!); this cancels
   * them all on dispose. */
  private readonly fetchAbort = new AbortController();
  /** Chunk keys already counted toward bytesDecoded. */
  private readonly countedChunkKeys = new Set<string>();
  /** Stores whose chunk-key metadata read failed at least once (one warning). */
  private readonly warnedEncoderStores = new Set<string>();

  constructor(
    private readonly stats: BrickSystemStats,
    cacheBytes: number,
  ) {
    this.cache = new ByteBudgetChunkCache(cacheBytes);
  }

  get sizeBytes(): number {
    return this.cache.sizeBytes;
  }

  /** The resolved metadata for a store (undefined = never asked, null =
   * resolving). */
  metadataFor(storeId: string): ArrayMetadata | null | undefined {
    return this.chunkKeyEncoders.get(storeId);
  }

  /**
   * Resolve a store's zarr chunk-key encoder for the SYNC chunk-cache probe.
   * `sampleChunkCacheSync` cannot await, so the encoder must be resolved ahead
   * of the first probe — `ensurePool` warms every level eagerly (the metadata
   * is already in `readArrayMetadataCached`'s cache from the brick fetches, so
   * this is a microtask, not a network read). Failure schedules a retry on the
   * next call and warns once per store.
   */
  warmChunkKeyEncoder(storeId: string, arr: ZarrArrayHandle): void {
    if (this.chunkKeyEncoders.has(storeId)) return;
    this.chunkKeyEncoders.set(storeId, null); // resolving
    void readArrayMetadataCached(arr)
      .then((meta) => this.chunkKeyEncoders.set(storeId, meta))
      .catch((error) => {
        this.chunkKeyEncoders.delete(storeId); // retry on the next probe
        if (!this.warnedEncoderStores.has(storeId)) {
          this.warnedEncoderStores.add(storeId);
          console.warn(`[bricks] chunk-key metadata read failed for store ${storeId}`, error);
        }
      });
  }

  /**
   * The decoded chunk at `coords` (full zarr chunk coords, dims order) if it
   * is in the cache RIGHT NOW — never fetches. Null when the store cannot be
   * resolved, its encoder is still resolving (kicked off here if it was never
   * asked for), or the chunk was evicted.
   */
  cachedChunkSync(
    storeId: string,
    coords: readonly number[],
    getArray: (storeId: string) => ZarrArrayHandle,
  ): Chunk<DataType> | null {
    const memo = this.lastChunkRead;
    if (
      memo &&
      memo.storeId === storeId &&
      memo.coords.length === coords.length &&
      memo.coords.every((v, d) => v === coords[d])
    ) {
      return memo.chunk; // hot path: no key build, no LRU touch
    }
    let arr: ZarrArrayHandle;
    try {
      arr = getArray(storeId);
    } catch {
      return null;
    }
    const encoder = this.chunkKeyEncoders.get(storeId);
    if (encoder === undefined) {
      // Fallback only — ensurePool warms every level's encoder eagerly, so
      // this fires just for pools created before the warm-up (or after a
      // metadata failure scheduled a retry).
      this.warmChunkKeyEncoder(storeId, arr);
      return null;
    }
    if (encoder === null) return null; // metadata still resolving
    const chunk = this.cache.get(chunkCacheKeyFor(arr, encoder, coords as number[]));
    if (!chunk) return null;
    this.lastChunkRead = { storeId, coords: coords.slice(), chunk };
    return chunk;
  }

  /** Register `owner` (one fetch INVOCATION) as a referrer of `chunkKey`. */
  acquireRef(chunkKey: string, owner: string): void {
    this.chunkRefs.acquire(chunkKey, owner);
  }

  /**
   * Dead-queue cancellation: `owner` no longer needs `chunkKey`. When it was
   * the LAST referrer, the chunk's per-chunk abort fires — a still-QUEUED
   * decode is cancelled outright (the wasted work this exists to reclaim); a
   * started one ignores it and finishes into the cache, so flip-backs stay
   * cheap (never abort shared in-progress decodes — that was the 13×
   * amplification bug). Happy-path releases are no-ops: the chunk promise
   * already settled and cleared its entry.
   */
  releaseRef(chunkKey: string, owner: string): void {
    if (this.chunkRefs.release(chunkKey, owner)) {
      const chunkAbort = this.inFlightChunkAborts.get(chunkKey);
      if (chunkAbort) {
        chunkAbort.abort();
        this.stats.cancelledDecodes += 1;
      }
    }
  }

  /**
   * Grouped twin of `fetchChunkShared` for a brick's chunk set: the same
   * per-chunk in-flight sharing and per-chunk abort bookkeeping, but chunks
   * not already in flight go through `getChunkGroupWorker`, which coalesces
   * near-adjacent inner chunks of one shard into a single ranged GET — also
   * ACROSS bricks dispatched in the same tick (`shardRunBatch.ts`), which is
   * why `rangeRequests` accumulates (`onDispatch` fires per flushed batch,
   * each physical request attributed once scene-wide). Returns one promise
   * per coordinate, in order.
   */
  fetchChunksShared(
    arr: ZarrArrayHandle,
    storeId: string,
    coordsList: number[][],
    priority: number,
  ): Promise<Chunk<DataType>>[] {
    const out: Promise<Chunk<DataType>>[] = new Array(coordsList.length);
    const fresh: { index: number; key: string; abort: AbortController }[] = [];
    for (let i = 0; i < coordsList.length; i++) {
      const key = `${storeId}:${coordsList[i].join(",")}`;
      const existing = this.inFlightChunks.get(key);
      if (existing) {
        const existingAbort = this.inFlightChunkAborts.get(key);
        if (!existingAbort || !existingAbort.signal.aborted) {
          out[i] = existing;
          continue;
        }
        this.inFlightChunks.delete(key);
        this.inFlightChunkAborts.delete(key);
      }
      const abort = new AbortController();
      this.inFlightChunkAborts.set(key, abort);
      fresh.push({ index: i, key, abort });
    }
    if (fresh.length === 0) return out;

    const promises = getChunkGroupWorker(
      arr,
      fresh.map((entry) => coordsList[entry.index]),
      {
        pool: workerPool,
        priority,
        signal: this.fetchAbort.signal,
        signals: fresh.map((entry) => entry.abort.signal),
        useSharedArrayBuffer: true,
        cache: this.cache,
        textureFidelity: chunkFidelityForDtype(arr.dtype),
        onDispatch: (tasks) => {
          this.stats.rangeRequests += tasks;
        },
      },
    );
    fresh.forEach((entry, j) => {
      const promise: Promise<Chunk<DataType>> = promises[j]
        .then((chunk) => {
          if (!this.countedChunkKeys.has(entry.key)) {
            this.countedChunkKeys.add(entry.key);
            this.stats.bytesDecoded += (chunk.data as { byteLength?: number }).byteLength ?? 0;
          }
          return chunk as Chunk<DataType>;
        })
        .finally(() => {
          if (this.inFlightChunks.get(entry.key) === promise) {
            this.inFlightChunks.delete(entry.key);
            this.inFlightChunkAborts.delete(entry.key);
          }
        });
      this.inFlightChunks.set(entry.key, promise);
      out[entry.index] = promise;
    });
    return out;
  }

  /**
   * Decoded-chunk fetch with in-flight sharing: every brick wanting the same
   * chunk awaits ONE decode. Deliberately not bound to a brick's abort
   * signal — a shared result may still serve other bricks (or the cache);
   * the dispose-scoped signal cancels everything.
   */
  fetchChunkShared(
    arr: ZarrArrayHandle,
    storeId: string,
    chunkCoords: number[],
    priority: number,
  ): Promise<Chunk<DataType>> {
    const key = `${storeId}:${chunkCoords.join(",")}`;
    const existing = this.inFlightChunks.get(key);
    if (existing) {
      // NEVER hand out a DOOMED entry: a brick abort fires the per-chunk
      // controller synchronously and then synchronously starts replacement
      // fetches (finally → startNextFetches), all BEFORE the cancelled
      // promise's own async cleanup has removed it from this map. A new
      // subscriber to that promise inherits the rejection and its brick
      // stays unloaded until the next replan — the "sometimes doesn't load /
      // loads seconds later" regression. An aborted entry is cleared here
      // and the fetch re-issued fresh.
      const existingAbort = this.inFlightChunkAborts.get(key);
      if (!existingAbort || !existingAbort.signal.aborted) return existing;
      this.inFlightChunks.delete(key);
      this.inFlightChunkAborts.delete(key);
    }

    // Per-chunk abort on top of the dispose-scoped one: fired only when the
    // LAST referring brick releases this chunk (fetchBrick's finally). The
    // worker runner's abort path cancels the task if still queued; a started
    // task ignores the cancellation and its decode lands in the cache.
    const chunkAbort = new AbortController();
    this.inFlightChunkAborts.set(key, chunkAbort);
    const promise = getChunkWorker(arr, chunkCoords, {
      pool: workerPool,
      priority,
      signal: AbortSignal.any([this.fetchAbort.signal, chunkAbort.signal]),
      useSharedArrayBuffer: true,
      cache: this.cache,
      // ARRAY-level representation (dtype + orkestrator.raw16): every scene
      // fetch of this array must agree, because the cache key and the
      // in-flight key above carry no fidelity component.
      textureFidelity: chunkFidelityForDtype(arr.dtype),
    })
      .then((chunk) => {
        if (!this.countedChunkKeys.has(key)) {
          this.countedChunkKeys.add(key);
          this.stats.bytesDecoded += (chunk.data as { byteLength?: number }).byteLength ?? 0;
        }
        return chunk as Chunk<DataType>;
      })
      .finally(() => {
        // Identity-guarded: a doomed entry may already have been REPLACED by
        // a fresh fetch (the branch above). Unconditional deletes here tore
        // down the replacement's dedup + cancellation entries.
        if (this.inFlightChunks.get(key) === promise) {
          this.inFlightChunks.delete(key);
          this.inFlightChunkAborts.delete(key);
        }
      });
    this.inFlightChunks.set(key, promise);
    return promise;
  }

  /** Cancel every chunk fetch and drop the in-flight bookkeeping. */
  dispose(): void {
    this.fetchAbort.abort();
    this.inFlightChunks.clear();
    this.inFlightChunkAborts.clear();
    this.chunkRefs.clear();
    this.lastChunkRead = null;
  }
}
