/**
 * getWorker() — Worker-accelerated get for zarrita arrays.
 *
 * Reads data from a zarrita Array, offloading codec decode operations to a
 * WorkerPool. The main thread fetches raw bytes from the store, transfers
 * them to a worker for decoding, then copies the decoded chunk into the
 * output array on the main thread.
 *
 * Uses a persistent WorkerPool queue for bounded-concurrency scheduling.
 */

import { zarrTimingEnabled } from './timing.js'
import type { WorkerPoolTaskHandle, WorkerPoolTaskInput } from "../pool/types"
import type {
  Chunk,
  DataType,
  Readable,
  Scalar,
  Slice,
  TypedArray,
  Array as ZarrArray,
} from "zarrita"

import { ByteBudgetChunkCache } from "@/lib/zarr/caches/byteBudgetChunkCache"
import { BasicIndexer } from "./internals/indexer"
import { setter } from "./internals/setter"
import {
  assertSharedArrayBufferAvailable,
  create_chunk_key_encoder,
  createBuffer,
  get_strides,
} from "./internals/util"
import type { ChunkCache, CodecChunkMeta, GetWorkerOptions, TextureFidelity } from "./types"
import {
  disposeWorker,
  getMetaId,
  isWorkerCrashedError,
  workerFetchDecode,
  workerFetchDecodeMulti,
} from "./worker-rpc"
import {
  DEFAULT_DENSE_COALESCE,
  type CoalescedRange,
  type DenseCoalesceOptions,
} from "./rangeCoalesce"
import {
  contributeShardItems,
  shardBatchKeyFor,
  type ShardBatchItem,
} from "./shardRunBatch"
import {
  isRangeReadableStore,
  isWorkerFetchCapableStore,
  workerFetchConfigFor,
} from "@/lib/zarr/store/types"
import {
  serializeRequestInit,
  type S3FetchConfig,
  type SerializedRequestInit,
} from "./s3-request"
import {
  innerLinearIndex,
  lookupInnerChunk,
  rangeHeaderFor,
  resolveShardingLayout,
  shardCoordOf,
  type ShardingLayout,
} from "./sharding"
import { DEFAULT_SHARD_INDEX_CACHE } from "./shardIndexCache"

/**
 * Create a Worker using the default codec-worker script bundled with this
 * package.
 *
 * Using `new Worker(new URL(..., import.meta.url))` in a single expression
 * allows bundlers (Vite, Rollup, webpack 5) to detect the worker entry point
 * and bundle its dependency graph into a self-contained asset. The previous
 * approach — storing the URL in a variable and passing it to `new Worker()`
 * separately — caused bundlers to treat the worker file as a plain static
 * asset, leaving its relative `./internals/*` imports unresolved.
 */
export function createDefaultWorker(): Worker {
  return new Worker(new URL("./codec-worker.js", import.meta.url), {
    type: "module",
  })
}

/** Shared TextDecoder instance. */
const decoder = new TextDecoder()

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Aborted", "AbortError")
  }

  const error = new Error("Aborted")
  error.name = "AbortError"
  return error
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError()
  }
}

function withAbortSignal<StoreOpts>(
  storeOpts: StoreOpts | undefined,
  signal?: AbortSignal,
): StoreOpts | undefined {
  if (!signal) {
    return storeOpts
  }

  if (storeOpts == null) {
    return { signal } as StoreOpts
  }

  if (typeof storeOpts !== "object") {
    return storeOpts
  }

  if ("signal" in (storeOpts as Record<string, unknown>)) {
    return storeOpts
  }

  return {
    ...(storeOpts as Record<string, unknown>),
    signal,
  } as StoreOpts
}

async function abortable<T>(
  signal: AbortSignal | undefined,
  promiseFactory: () => Promise<T>,
  onAbort?: () => void,
): Promise<T> {
  throwIfAborted(signal)

  if (!signal) {
    return promiseFactory()
  }

  return new Promise<T>((resolve, reject) => {
    const abortHandler = () => {
      try {
        onAbort?.()
      } finally {
        reject(createAbortError())
      }
    }

    signal.addEventListener("abort", abortHandler, { once: true })

    Promise.resolve()
      .then(promiseFactory)
      .then(
        (value) => {
          signal.removeEventListener("abort", abortHandler)
          resolve(value)
        },
        (error) => {
          signal.removeEventListener("abort", abortHandler)
          reject(error)
        },
      )
  })
}

async function waitForTaskHandles<T>(
  handles: Array<WorkerPoolTaskHandle<T>>,
  signal?: AbortSignal,
): Promise<T[]> {
  throwIfAborted(signal)

  return abortable(signal, () => Promise.all(handles.map((handle) => handle.promise)), () => {
    handles.forEach((handle) => {
      handle.cancel()
    })
  })
}

function enqueueWorkerTask<T>(
  pool: GetWorkerOptions["pool"],
  workerUrl: string | URL | undefined,
  signal: AbortSignal | undefined,
  task: (worker: Worker, signal: AbortSignal | undefined) => Promise<T>,
  priority?: number,
): WorkerPoolTaskHandle<T> {
  return pool.enqueue(createWorkerTask(pool, workerUrl, signal, task, priority))
}

/**
 * Wrap a worker RPC as a pool task. The worker is SHARED with other in-flight
 * requests, so neither an abort nor an ordinary failure may terminate it:
 * cancellation rides `signal` into the RPC (a per-request `cancel` message),
 * and only a worker-level crash (`WorkerCrashedError`) disposes the worker
 * and retires its slot.
 */
function createWorkerTask<T>(
  pool: GetWorkerOptions["pool"],
  workerUrl: string | URL | undefined,
  signal: AbortSignal | undefined,
  task: (worker: Worker, signal: AbortSignal | undefined) => Promise<T>,
  priority?: number,
): WorkerPoolTaskInput<T> {
  return {
    priority,
    task: async (workerSlot: Worker | null) => {
      const worker =
        workerSlot ??
        (workerUrl
          ? new Worker(workerUrl, { type: "module" })
          : createDefaultWorker())

      return abortable(signal, async () => ({ worker, result: await task(worker, signal) })).catch(
        (error) => {
          if (isWorkerCrashedError(error)) {
            disposeWorker(worker, error)
            pool.retire(worker)
          } else if (workerSlot === null) {
            // Nobody else knows this worker (the task spawned it and the pool
            // only adopts it on success) — don't leak it.
            disposeWorker(
              worker,
              error instanceof Error ? error : new Error(String(error)),
            )
          }
          throw error
        },
      )
    },
  }
}

/** Constructor matching `promoteChunkForTexture`'s output for this dtype and
 * fidelity — fill-value substitute chunks must use the SAME representation as
 * fetched chunks, or a cache can hold mixed types for one array. */
function getTextureOutputConstructor(
  dataType: DataType,
  textureFidelity: TextureFidelity,
): Uint8ArrayConstructor | Uint16ArrayConstructor | Float32ArrayConstructor {
  if (dataType === "uint8") return Uint8Array
  if (textureFidelity === "raw16" && dataType === "uint16") return Uint16Array
  return Float32Array
}

function roundTiming(ms: number): number {
  return Number(ms.toFixed(2))
}

export { zarrTimingEnabled }

/**
 * Per-chunk timing logs are opt-in (see `zarrTimingEnabled`). Every call site
 * is guarded with `if (zarrTimingEnabled())` so the 15-field record and its
 * `roundTiming` calls are never built when logging is off; the check here is
 * only a belt-and-braces guard for callers that forget.
 */
function logChunkTiming(label: string, timings: Record<string, unknown>): void {
  if (!zarrTimingEnabled()) return
  console.log(label, timings)
}

// ---------------------------------------------------------------------------
// Chunk cache helpers — store-scoped key generation
// ---------------------------------------------------------------------------

// Byte-bounded, not count-bounded: callers that pass no `cache` (attribute
// probes, one-off reads) used to fill a 500-entry LRU with promoted float32
// chunks — at 128³ that is gigabytes the pool budget never saw.
const DEFAULT_CHUNK_CACHE_BYTES = 256 * 1024 * 1024
const globalChunkCache = new ByteBudgetChunkCache(DEFAULT_CHUNK_CACHE_BYTES)

const DEFAULT_CHUNK_CACHE: ChunkCache = {
  get: (key) => globalChunkCache.get(key),
  set: (key, value) => {
    globalChunkCache.set(key, value as Chunk<DataType>)
  },
}

/** WeakMap to assign unique IDs to store instances, preventing cache collisions. */
const storeIdMap = new WeakMap<object, number>()
let storeIdCounter = 0

export function getStoreId(store: Readable): string {
  if (!storeIdMap.has(store)) {
    storeIdMap.set(store, storeIdCounter++)
  }
  return `store_${storeIdMap.get(store)}`
}

/**
 * Chunk objects the store could not provide get a fill-value substitute — a
 * legitimate zarr convention for genuinely-sparse arrays, but ALSO how a
 * missing/partially-uploaded store silently renders as blank data (e.g. ONE
 * blank channel when channels are chunked separately). Warn once per path so
 * "missing data" is never invisible.
 */
const warnedFillChunkPaths = new Set<string>()

function warnFillChunk(chunkPath: string, fillValue: unknown): void {
  if (warnedFillChunkPaths.has(chunkPath)) return
  warnedFillChunkPaths.add(chunkPath)
  console.warn(
    `[zarr] chunk object missing from store — substituting fill value ` +
      `${String(fillValue ?? 0)}: ${chunkPath}`,
  )
}

export function createCacheKey<D extends DataType, Store extends Readable>(
  arr: ZarrArray<D, Store>,
  encodeChunkKey: (chunk_coords: number[]) => string,
  chunk_coords: number[],
): string {
  const chunkKey = encodeChunkKey(chunk_coords)
  const storeId = getStoreId(arr.store)
  return `${storeId}:${arr.path}:${chunkKey}`
}

// ---------------------------------------------------------------------------
// Unified metadata reader — reads zarr.json once, returns everything needed
// ---------------------------------------------------------------------------

export interface ArrayMetadata {
  /**
   * What a decode worker needs. For a SHARDED array this is the INNER chunk
   * shape + inner codec chain — the sharding layer is unwrapped here, because
   * the worker pipeline is built from zarrita's codec registry, which has no
   * `sharding_indexed` entry.
   */
  codecMeta: CodecChunkMeta
  /** Encodes STORAGE-object coords: chunk coords when unsharded, shard coords when sharded. */
  encodeChunkKey: (chunk_coords: number[]) => string
  fillValue: Scalar<DataType> | null
  /** Present iff the array's top-level codec is `sharding_indexed`. */
  sharding?: ShardingLayout
}

/**
 * The chunk shape consumers should plan/fetch in: the inner chunk shape for a
 * sharded array, else the array's chunk shape. Populated synchronously once
 * `readArrayMetadataCached` resolves (the scene's array open awaits it), so
 * planners that are sync can read it without a promise. `undefined` for an
 * array whose metadata has not been read yet.
 */
const effectiveChunkShapes = new WeakMap<object, readonly number[]>()

export function effectiveChunkShapeOf(arr: object): readonly number[] | undefined {
  return effectiveChunkShapes.get(arr)
}

/**
 * Where one chunk's bytes live: the storage object to GET, the decoded-chunk
 * cache key, and — for a sharded array — the byte range inside the shard, or
 * `missing` when the shard index says the inner chunk is absent.
 */
export interface ChunkLocation {
  chunkPath: `/${string}`
  cacheKey: string
  /** Set only for sharded arrays with a present inner chunk. */
  range?: { offset: number; length: number }
  /** Sharded arrays only: the index marks this inner chunk absent (fill). */
  missing: boolean
}

/**
 * Decoded-chunk cache key for a chunk coordinate, SYNCHRONOUS for both layouts
 * (no shard index needed — the key only depends on coordinates). Sharded: the
 * shard key plus the inner chunk's C-order position, because inner coords
 * pushed through the SHARD key encoder would alias distinct inner chunks.
 * Unsharded: identical to `createCacheKey`.
 */
export function chunkCacheKeyFor<D extends DataType, Store extends Readable>(
  arr: ZarrArray<D, Store>,
  meta: ArrayMetadata,
  chunkCoords: readonly number[],
): string {
  const { sharding, encodeChunkKey } = meta
  if (!sharding) return createCacheKey(arr, encodeChunkKey, [...chunkCoords])
  const shardKey = encodeChunkKey(shardCoordOf(chunkCoords, sharding))
  const linear = innerLinearIndex(chunkCoords, sharding)
  return `${getStoreId(arr.store)}:${arr.path}:${shardKey}/${linear}`
}

/**
 * Storage-object path for a chunk coordinate, SYNCHRONOUS for both layouts
 * (the shard object's path needs no index — only the byte range inside it
 * does). Sharded: the shard's path; unsharded: the chunk's own path.
 */
export function chunkStoragePathFor<D extends DataType, Store extends Readable>(
  arr: ZarrArray<D, Store>,
  meta: ArrayMetadata,
  chunkCoords: readonly number[],
): `/${string}` {
  const { sharding, encodeChunkKey } = meta
  const key = sharding
    ? encodeChunkKey(shardCoordOf(chunkCoords, sharding))
    : encodeChunkKey([...chunkCoords])
  return arr.resolve(key).path
}

export async function resolveChunkLocation<D extends DataType, Store extends Readable>(
  arr: ZarrArray<D, Store>,
  meta: ArrayMetadata,
  chunkCoords: readonly number[],
  storeOpts?: Parameters<Store["get"]>[1],
): Promise<ChunkLocation> {
  const { sharding } = meta
  const cacheKey = chunkCacheKeyFor(arr, meta, chunkCoords)
  if (!sharding) {
    return { chunkPath: chunkStoragePathFor(arr, meta, chunkCoords), cacheKey, missing: false }
  }
  const shardPath = chunkStoragePathFor(arr, meta, chunkCoords)
  const linear = innerLinearIndex(chunkCoords, sharding)
  const storeId = getStoreId(arr.store)
  const store = arr.store
  if (!isRangeReadableStore(store)) {
    throw new Error(
      `[zarr sharding] store for ${arr.path} has no getRange — cannot read sharded array`,
    )
  }
  const index = await DEFAULT_SHARD_INDEX_CACHE.get(
    store,
    storeId,
    shardPath,
    sharding,
    storeOpts as RequestInit | undefined,
  )
  if (index === null) return { chunkPath: shardPath, cacheKey, missing: true }
  const location = lookupInnerChunk(index, linear)
  if (location === "missing") return { chunkPath: shardPath, cacheKey, missing: true }
  return { chunkPath: shardPath, cacheKey, range: location, missing: false }
}

/**
 * Warm the shard index for a chunk (no-op for unsharded arrays, cache hits,
 * or stores without ranged reads). Fire-and-forget: a failure here just means
 * the real fetch pays the index round trip itself.
 */
export function prefetchShardIndex<D extends DataType, Store extends Readable>(
  arr: ZarrArray<D, Store>,
  meta: ArrayMetadata,
  chunkCoords: readonly number[],
): void {
  const { sharding, encodeChunkKey } = meta
  if (!sharding) return
  const store = arr.store
  if (!isRangeReadableStore(store)) return
  const shardKey = encodeChunkKey(shardCoordOf(chunkCoords, sharding))
  void DEFAULT_SHARD_INDEX_CACHE.get(
    store,
    getStoreId(store),
    arr.resolve(shardKey).path,
    sharding,
  ).catch(() => {})
}

/** `init` for the worker fetch, with the inner-chunk `Range` folded in when sharded. */
function requestInitFor(
  storeOpts: RequestInit | undefined,
  location: ChunkLocation,
): RequestInit | undefined {
  if (!location.range) return storeOpts
  const headers = new Headers(storeOpts?.headers)
  headers.set("Range", rangeHeaderFor(location.range))
  return { ...storeOpts, headers }
}

/**
 * Per-array memo of `readArrayMetadata`. The result (`codecMeta`,
 * `encodeChunkKey`, `fillValue`) is array-invariant, but the uncached reader
 * runs on the MAIN thread for every chunk fetch — a `store.get(zarr.json)` +
 * `TextDecoder` + `JSON.parse` + key-encoder rebuild per chunk. Keyed weakly on
 * the array object; a rejected read (e.g. aborted signal) is evicted so the
 * next caller retries instead of hitting a poisoned promise.
 */
const arrayMetadataCache = new WeakMap<object, Promise<ArrayMetadata>>()

export function readArrayMetadataCached<
  D extends DataType,
  Store extends Readable,
>(
  arr: ZarrArray<D, Store>,
  storeOpts?: Parameters<Store["get"]>[1],
): Promise<ArrayMetadata> {
  const cached = arrayMetadataCache.get(arr)
  if (cached) return cached
  const promise = readArrayMetadata(arr, storeOpts)
  arrayMetadataCache.set(arr, promise)
  promise.then(
    (meta) => effectiveChunkShapes.set(arr, meta.codecMeta.chunk_shape),
    () => {
      if (arrayMetadataCache.get(arr) === promise) arrayMetadataCache.delete(arr)
    },
  )
  return promise
}

export async function readArrayMetadata<
  D extends DataType,
  Store extends Readable,
>(
  arr: ZarrArray<D, Store>,
  storeOpts?: Parameters<Store["get"]>[1],
): Promise<ArrayMetadata> {
  const store = arr.store

  // Try v3 first: read zarr.json
  const v3Path = (
    arr.path === "/" ? "/zarr.json" : `${arr.path}/zarr.json`
  ) as `/${string}`
  const v3Bytes = await store.get(v3Path, storeOpts)
  if (v3Bytes) {
    const metadata = JSON.parse(decoder.decode(v3Bytes))
    const outerChunkShape: number[] = metadata.chunk_grid.configuration.chunk_shape
    // Dynamic per array: a `sharding_indexed` top-level codec is unwrapped so
    // everything downstream (worker pipeline, planner, cache keys) works in
    // INNER chunks; an unsharded array is returned exactly as before.
    const sharding = resolveShardingLayout(outerChunkShape, metadata.codecs)
    return {
      codecMeta: {
        data_type: metadata.data_type,
        chunk_shape: sharding ? sharding.innerChunkShape : outerChunkShape,
        codecs: sharding ? sharding.innerCodecs : metadata.codecs,
      },
      encodeChunkKey: create_chunk_key_encoder(metadata.chunk_key_encoding),
      fillValue: metadata.fill_value ?? null,
      sharding,
    }
  }

  // Fallback: BytesCodec only, default v3 key encoding
  return {
    codecMeta: {
      data_type: arr.dtype,
      chunk_shape: arr.chunks,
      codecs: [{ name: "bytes", configuration: { endian: "little" } }],
    },
    encodeChunkKey: create_chunk_key_encoder({ name: "default" }),
    fillValue: null,
  }
}

// ---------------------------------------------------------------------------
// getChunkGroupWorker — coalesced reads of several chunks of one array
// ---------------------------------------------------------------------------

export interface ChunkGroupOptions<StoreOpts = unknown> extends GetWorkerOptions<StoreOpts> {
  /** Merge rule for inner chunks of one shard (see `rangeCoalesce.ts`). */
  coalesce?: Partial<DenseCoalesceOptions>
  /**
   * Per-coordinate abort signals (same length as the coordinate list). A
   * coalesced worker task is cancelled only when EVERY chunk it carries has
   * aborted; `opts.signal` still aborts everything at once.
   */
  signals?: (AbortSignal | undefined)[]
  /**
   * Called with the number of worker tasks enqueued — possibly MORE THAN
   * ONCE per call (additively): range reads dispatch through the cross-call
   * shard batch, which attributes each physical request once, to the run's
   * lead item, when the batch flushes.
   */
  onDispatch?: (taskCount: number) => void
}

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  promise.catch(() => {}) // consumers attach their own handlers
  return { promise, resolve, reject }
}

/** A signal that fires once EVERY input has aborted (never, if any input is undefined). */
function whenAllAborted(signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  if (signals.length === 0 || signals.some((s) => s === undefined)) return undefined
  const controller = new AbortController()
  let remaining = signals.length
  for (const signal of signals as AbortSignal[]) {
    if (signal.aborted) {
      remaining -= 1
      continue
    }
    signal.addEventListener(
      "abort",
      () => {
        remaining -= 1
        if (remaining === 0) controller.abort()
      },
      { once: true },
    )
  }
  if (remaining === 0) controller.abort()
  return controller.signal
}

/** The non-per-item arguments of one `workerFetchDecodeMulti` call. Everything
 * here is covered by `shardBatchKeyFor`, so all items of a flushed run share
 * one context regardless of which group call contributed them. */
interface ShardRunContext {
  pool: GetWorkerOptions["pool"]
  workerUrl: string | URL | undefined
  workerStore: S3FetchConfig
  shardPath: `/${string}`
  metaId: number
  codecMeta: CodecChunkMeta
  requestInit: SerializedRequestInit | undefined
  textureFidelity: TextureFidelity
  useShared: boolean
}

/**
 * Dispatch one coalesced run (possibly spanning several group calls) as one
 * worker task + one ranged GET. Cancellation: `whenAllAborted` over every
 * member's effective signal — the run dies only when every contributing chunk
 * did. Priority: max of members (WorkerPool runs higher numbers first), so a
 * merged halo part rides at its co-members' priority.
 */
function executeShardRun(ctx: ShardRunContext, run: CoalescedRange<ShardBatchItem>): void {
  const members = run.items.map((entry) => entry.item)
  const parts = run.items.map((entry) => ({
    offset: entry.offset,
    length: entry.length,
    actualChunkShape: entry.item.actualChunkShape,
  }))
  const runSignal = whenAllAborted(members.map((member) => member.signal))
  const handle = enqueueWorkerTask<void>(
    ctx.pool,
    ctx.workerUrl,
    runSignal,
    async (worker, signal) => {
      const result = await workerFetchDecodeMulti(
        worker,
        ctx.workerStore,
        ctx.shardPath,
        { offset: run.offset, length: run.length },
        parts,
        ctx.metaId,
        ctx.codecMeta,
        ctx.requestInit,
        ctx.textureFidelity,
        ctx.useShared,
        signal,
      )
      result.chunks.forEach((chunk, k) => members[k].onChunk(chunk ?? undefined))
      if (zarrTimingEnabled()) logChunkTiming("[zarr run timing]", {
        shardPath: ctx.shardPath,
        parts: run.items.length,
        rangeBytes: run.length,
        workerFetchMs: roundTiming(result.timings.fetchMs),
        workerTotalMs: roundTiming(result.timings.totalWorkerMs),
        fromHttpCache: result.timings.fromHttpCache,
        protocol: result.timings.protocol,
      })
    },
    Math.max(...members.map((member) => member.priority)),
  )
  handle.promise.catch((error) => {
    for (const member of members) member.onError(error)
  })
}

function edgeShapeOf(arr: { shape: readonly number[] }, chunkShape: number[], coords: readonly number[]): number[] {
  return coords.map((coord, dim) => Math.min(chunkShape[dim], arr.shape[dim] - coord * chunkShape[dim]))
}

function fillChunkOf<D extends DataType>(
  shape: number[],
  OutputCtr: ReturnType<typeof getTextureOutputConstructor>,
  fillValue: Scalar<DataType> | null,
): Chunk<D> {
  const size = shape.reduce((a, b) => a * b, 1)
  const data = new OutputCtr(size)
  if (fillValue != null) data.fill(Number(fillValue))
  return { data: data as Chunk<D>["data"], shape, stride: get_strides(shape) }
}

/**
 * Fetch several chunks of one array, coalescing inner chunks that sit close
 * together inside the same shard into ONE ranged GET + worker task (decoded
 * into N chunks by the worker). Returns one promise per coordinate, in order,
 * synchronously — so callers can register them for in-flight sharing before
 * any I/O happens.
 *
 * Unsharded arrays, cache hits, absent inner chunks (fill) and chunks that end
 * up alone in their run all take the exact single-chunk path (`getChunkWorker`).
 */
export function getChunkGroupWorker<D extends DataType, Store extends Readable>(
  arr: ZarrArray<D, Store>,
  coordsList: readonly (readonly number[])[],
  opts: ChunkGroupOptions<Parameters<Store["get"]>[1]>,
): Promise<Chunk<D>>[] {
  const deferreds = coordsList.map(() => createDeferred<Chunk<D>>())
  const signals = opts.signals ?? coordsList.map(() => undefined)
  const single = (index: number): void => {
    getChunkWorker(arr, [...coordsList[index]], { ...opts, signal: signals[index] ?? opts.signal }).then(
      deferreds[index].resolve,
      deferreds[index].reject,
    )
  }

  void (async () => {
    let tasks = 0
    try {
      throwIfAborted(opts.signal)
      const storeOpts = withAbortSignal(opts.opts, opts.signal)
      const meta = await readArrayMetadataCached(arr, storeOpts)
      if (!meta.sharding || coordsList.length < 2) {
        coordsList.forEach((_, i) => single(i))
        tasks = coordsList.length
        return
      }
      const cache = opts.cache ?? DEFAULT_CHUNK_CACHE
      const textureFidelity = opts.textureFidelity ?? "default"
      const OutputCtr = getTextureOutputConstructor(meta.codecMeta.data_type, textureFidelity)
      const chunkShape = meta.codecMeta.chunk_shape
      // Cache FIRST, synchronously: the decoded-chunk key needs no shard index
      // (`chunkCacheKeyFor`), so hits resolve before any index read and a
      // fully-cached group costs zero store round trips.
      const missIndices: number[] = []
      for (let i = 0; i < coordsList.length; i++) {
        const cached = cache.get(chunkCacheKeyFor(arr, meta, coordsList[i]))
        if (cached) {
          deferreds[i].resolve(cached as Chunk<D>)
        } else {
          missIndices.push(i)
        }
      }
      if (missIndices.length === 0) return
      // Index reads only for the misses — parallel, deduped per shard by the
      // index cache's single-flight promises.
      const locations = new Map<number, ChunkLocation>()
      await Promise.all(
        missIndices.map(async (i) => {
          locations.set(i, await resolveChunkLocation(arr, meta, coordsList[i], storeOpts))
        }),
      )
      const byShard = new Map<string, { offset: number; length: number; item: number }[]>()
      for (const i of missIndices) {
        const location = locations.get(i)!
        if (location.missing) {
          const fill = fillChunkOf<D>(edgeShapeOf(arr, chunkShape, coordsList[i]), OutputCtr, meta.fillValue)
          cache.set(location.cacheKey, fill)
          deferreds[i].resolve(fill)
          continue
        }
        if (!location.range) {
          single(i)
          tasks += 1
          continue
        }
        let items = byShard.get(location.chunkPath)
        if (!items) byShard.set(location.chunkPath, (items = []))
        items.push({ offset: location.range.offset, length: location.range.length, item: i })
      }

      if (byShard.size === 0) return
      if (!isWorkerFetchCapableStore(arr.store)) {
        throw new Error("Worker chunk loading requires a worker-fetch-capable store")
      }
      assertSharedArrayBufferAvailable()
      const workerStore = await workerFetchConfigFor(arr.store)
      const metaId = getMetaId(meta.codecMeta)
      const requestInit = serializeRequestInit(storeOpts as RequestInit | undefined)

      // Range reads route through the cross-call shard batch: same-tick group
      // calls (neighbouring bricks) contribute to one pending set per
      // compatible-options key, and the `setTimeout(0)` flush coalesces
      // ACROSS them. Runs of 1 fall back to the single-chunk path there.
      const denseOptions: DenseCoalesceOptions = { ...DEFAULT_DENSE_COALESCE, ...opts.coalesce }
      const useShared = opts.useSharedArrayBuffer !== false
      for (const [shardPath, items] of byShard) {
        const ctx: ShardRunContext = {
          pool: opts.pool,
          workerUrl: opts.workerUrl,
          workerStore,
          shardPath: shardPath as `/${string}`,
          metaId,
          codecMeta: meta.codecMeta,
          requestInit,
          textureFidelity,
          useShared,
        }
        const batchItems = items.map(({ offset, length, item: i }): ShardBatchItem => {
          const edge = edgeShapeOf(arr, chunkShape, coordsList[i])
          const isEdge = edge.some((size, dim) => size !== chunkShape[dim])
          return {
            offset,
            length,
            actualChunkShape: isEdge ? edge : undefined,
            priority: opts.priority ?? 0,
            signal: signals[i] ?? opts.signal,
            dispatchSingle: () => single(i),
            onChunk: (chunk) => {
              const settled: Chunk<D> =
                (chunk as Chunk<D> | undefined) ??
                fillChunkOf<D>(edgeShapeOf(arr, chunkShape, coordsList[i]), OutputCtr, meta.fillValue)
              cache.set(locations.get(i)!.cacheKey, settled)
              deferreds[i].resolve(settled)
            },
            onError: (error) => deferreds[i].reject(error),
            attributeTasks: (count) => opts.onDispatch?.(count),
          }
        })
        contributeShardItems(
          shardBatchKeyFor({
            pool: opts.pool,
            workerUrl: opts.workerUrl,
            storeId: getStoreId(arr.store),
            shardPath,
            metaId,
            textureFidelity,
            useSharedArrayBuffer: useShared,
            serializedRequestInit: requestInit,
            coalesce: denseOptions,
          }),
          batchItems,
          denseOptions,
          (run) => executeShardRun(ctx, run),
        )
      }
    } catch (error) {
      for (const deferred of deferreds) deferred.reject(error)
    } finally {
      opts.onDispatch?.(tasks)
    }
  })()

  return deferreds.map((deferred) => deferred.promise)
}

// ---------------------------------------------------------------------------
// getChunkWorker
// ---------------------------------------------------------------------------

/**
 * Read a single chunk from a zarrita Array with codec decoding offloaded to
 * Web Workers.
 *
 * Mirrors zarrita's `arr.getChunk(chunkCoords)` API but uses the same worker
 * decode pipeline as {@link getWorker}.
 */
export async function getChunkWorker<D extends DataType, Store extends Readable>(
  arr: ZarrArray<D, Store>,
  chunkCoords: number[],
  opts: GetWorkerOptions<Parameters<Store["get"]>[1]>,
): Promise<Chunk<D>> {
  const startedAt = performance.now()
  const { pool, workerUrl } = opts
  const useShared = opts.useSharedArrayBuffer !== false
  const cache = opts.cache ?? DEFAULT_CHUNK_CACHE
  const storeOptsWithSignal = withAbortSignal(opts.opts, opts.signal)

  throwIfAborted(opts.signal)

  if (!useShared) {
    throw new Error("Worker chunk loading requires SharedArrayBuffer output")
  }

  assertSharedArrayBufferAvailable()

  const metadataReadStartedAt = performance.now()
  const arrayMeta = await readArrayMetadataCached(arr, storeOptsWithSignal)
  const { codecMeta, fillValue } = arrayMeta
  const metadataReadMs = performance.now() - metadataReadStartedAt

  const actualChunkShape = codecMeta.chunk_shape
  const correctedCodecMeta = codecMeta
  // 'raw16' and 'default' are the only fidelities a production caller passes;
  // the per-chunk-normalizing 'low'/'high' would break multi-chunk surfaces
  // (see TextureFidelity) and are refused here rather than silently honored.
  const textureFidelity = opts.textureFidelity ?? "default"
  if (textureFidelity === "low" || textureFidelity === "high") {
    throw new Error(
      "getChunkWorker: per-chunk-normalized fidelities ('low'/'high') window each chunk independently and cannot serve multi-chunk consumers",
    )
  }
  const OutputCtr = getTextureOutputConstructor(correctedCodecMeta.data_type, textureFidelity)
  const metaId = getMetaId(correctedCodecMeta)

  // Cache FIRST: the decoded-chunk key is synchronous for both layouts (see
  // `chunkCacheKeyFor`), so a hit skips the store config await AND — for a
  // sharded array — the shard-index read entirely.
  const cacheKey = chunkCacheKeyFor(arr, arrayMeta, chunkCoords)
  const cacheLookupStartedAt = performance.now()
  const cachedChunk = cache.get(cacheKey)
  const cacheLookupMs = performance.now() - cacheLookupStartedAt

  if (cachedChunk) {
    if (zarrTimingEnabled()) logChunkTiming("[zarr chunk timing]", {
      chunkPath: chunkStoragePathFor(arr, arrayMeta, chunkCoords),
      chunkCoords: [...chunkCoords],
      cacheStatus: "hit",
      metadataReadMs: roundTiming(metadataReadMs),
      cacheLookupMs: roundTiming(cacheLookupMs),
      queueWaitMs: 0,
      workerMetaInitMs: 0,
      workerRoundTripMs: 0,
      workerFetchMs: 0,
      workerDecodeMs: 0,
      workerReshapeMs: 0,
      workerPromoteMs: 0,
      workerTotalMs: 0,
      fillChunkMs: 0,
      mainThreadWriteMs: 0,
      totalMs: roundTiming(performance.now() - startedAt),
    })
    if (zarrTimingEnabled()) logChunkTiming("[zarr get timing]", {
      selectionShape: [...cachedChunk.shape],
      chunkCount: 1,
      metadataReadMs: roundTiming(metadataReadMs),
      totalMs: roundTiming(performance.now() - startedAt),
    })
    return cachedChunk as Chunk<D>
  }

  if (!isWorkerFetchCapableStore(arr.store)) {
    throw new Error("Worker chunk loading requires a worker-fetch-capable store")
  }

  const workerStore = await workerFetchConfigFor(arr.store)
  // Sharded: one deduped index read per shard, then a Range inside it. Reached
  // only on a cache miss — the key above did not need the index.
  const location = await resolveChunkLocation(arr, arrayMeta, chunkCoords, storeOptsWithSignal)
  const { chunkPath } = location
  const edgeChunkShape = chunkCoords.map((coord, dim) =>
    Math.min(actualChunkShape[dim], arr.shape[dim] - coord * actualChunkShape[dim]),
  )
  const isEdgeChunk = edgeChunkShape.some((size, index) => size !== actualChunkShape[index])

  const makeFillChunk = (): Chunk<D> => {
    const fillChunkStrides = get_strides(edgeChunkShape)
    const fillChunkSize = edgeChunkShape.reduce(
      (accumulator: number, dimension: number) => accumulator * dimension,
      1,
    )
    const chunkData = new OutputCtr(fillChunkSize)
    if (fillValue != null) {
      chunkData.fill(Number(fillValue))
    }
    return {
      data: chunkData as Chunk<D>["data"],
      shape: edgeChunkShape,
      stride: fillChunkStrides,
    }
  }

  if (location.missing) {
    // The shard index says this inner chunk was never written: fill without
    // a worker round trip (and without the "object missing" warning — absence
    // inside a shard is the normal encoding of an all-fill chunk).
    const fillStartedAt = performance.now()
    const fillChunk = makeFillChunk()
    cache.set(cacheKey, fillChunk)
    if (zarrTimingEnabled()) logChunkTiming("[zarr chunk timing]", {
      chunkPath,
      chunkCoords: [...chunkCoords],
      cacheStatus: "missing-fill",
      metadataReadMs: roundTiming(metadataReadMs),
      cacheLookupMs: roundTiming(cacheLookupMs),
      queueWaitMs: 0,
      workerMetaInitMs: 0,
      workerRoundTripMs: 0,
      workerFetchMs: 0,
      workerDecodeMs: 0,
      workerReshapeMs: 0,
      workerPromoteMs: 0,
      workerTotalMs: 0,
      fillChunkMs: roundTiming(performance.now() - fillStartedAt),
      mainThreadWriteMs: 0,
      totalMs: roundTiming(performance.now() - startedAt),
    })
    return fillChunk
  }

  const enqueuedAt = performance.now()
  const taskPriority = opts.priority ?? 0
  const handle = enqueueWorkerTask(
    pool,
    workerUrl,
    opts.signal,
    async (worker, signal) => {
      const queueWaitMs = performance.now() - enqueuedAt
      const { chunk: fetchedChunk, timings: workerTimings } = await workerFetchDecode<D>(
        worker,
        workerStore,
        chunkPath,
        metaId,
        correctedCodecMeta,
        serializeRequestInit(
          requestInitFor(storeOptsWithSignal as RequestInit | undefined, location),
        ),
        isEdgeChunk ? edgeChunkShape : undefined,
        // Explicit defaults for the trailing positionals: this call previously
        // stopped at 7 args, silently dropping the caller's useSharedArrayBuffer
        // (it defaulted to false and the SAB path never engaged).
        textureFidelity,
        useShared,
        signal,
      )

      let chunkToReturn: Chunk<D>
      let fillChunkMs = 0

      if (fetchedChunk) {
        cache.set(cacheKey, fetchedChunk)
        chunkToReturn = fetchedChunk
      } else {
        warnFillChunk(chunkPath, fillValue)
        const fillStartedAt = performance.now()
        chunkToReturn = makeFillChunk()
        cache.set(cacheKey, chunkToReturn)
        fillChunkMs = performance.now() - fillStartedAt
      }

      if (zarrTimingEnabled()) logChunkTiming("[zarr chunk timing]", {
        chunkPath,
        chunkCoords: [...chunkCoords],
        cacheStatus: fetchedChunk ? "miss" : "missing-fill",
        metadataReadMs: roundTiming(metadataReadMs),
        cacheLookupMs: roundTiming(cacheLookupMs),
        queueWaitMs: roundTiming(queueWaitMs),
        workerMetaInitMs: roundTiming(workerTimings.metaInitMs),
        workerRoundTripMs: roundTiming(workerTimings.roundTripMs),
        workerFetchMs: roundTiming(workerTimings.fetchMs),
        workerDecodeMs: roundTiming(workerTimings.decodeMs),
        workerReshapeMs: roundTiming(workerTimings.reshapeMs),
        workerPromoteMs: roundTiming(workerTimings.promoteMs),
        workerTotalMs: roundTiming(workerTimings.totalWorkerMs),
        fillChunkMs: roundTiming(fillChunkMs),
        mainThreadWriteMs: 0,
        totalMs: roundTiming(performance.now() - startedAt),
        fromHttpCache: workerTimings.fromHttpCache,
        protocol: workerTimings.protocol,
      })

      return chunkToReturn
    },
    taskPriority,
  )

  const [chunk] = await waitForTaskHandles([handle], opts.signal)

  if (zarrTimingEnabled()) logChunkTiming("[zarr get timing]", {
    selectionShape: [...chunk.shape],
    chunkCount: 1,
    metadataReadMs: roundTiming(metadataReadMs),
    totalMs: roundTiming(performance.now() - startedAt),
  })

  return chunk
}

// ---------------------------------------------------------------------------
// getWorker
// ---------------------------------------------------------------------------

/**
 * Read data from a zarrita Array with codec decoding offloaded to Web Workers.
 *
 * Drop-in replacement for zarrita's `get()` with worker acceleration.
 * The main thread fetches raw bytes from the store, then workers handle
 * the (potentially expensive) codec decode operations in parallel.
 *
 * @param arr       - The zarrita Array to read from.
 * @param selection - Index selection (null for full array, or per-dimension slices/indices).
 * @param opts      - Options including the WorkerPool and store options.
 * @returns The result chunk, or a scalar if all dimensions are integer-indexed.
 *
 * @example
 * ```ts
 * import { WorkerPool } from '@fideus-labs/worker-pool'
 * import { getWorker } from '@fideus-labs/fizarrita'
 * import * as zarr from 'zarrita'
 *
 * const pool = new WorkerPool(4)
 * const store = new zarr.FetchStore('https://example.com/data.zarr')
 * const arr = await zarr.open(store, { kind: 'array' })
 * const result = await getWorker(arr, null, { pool })
 *
 * pool.terminateWorkers()
 * ```
 */
export async function getWorker<
  D extends DataType,
  Store extends Readable,
  Sel extends (null | Slice | number)[],
>(
  arr: ZarrArray<D, Store>,
  selection: Sel | null = null,
  opts: GetWorkerOptions<Parameters<Store["get"]>[1]>,
): Promise<
  null extends Sel[number]
    ? Chunk<D>
    : Slice extends Sel[number]
      ? Chunk<D>
      : Scalar<D>
> {
  const startedAt = performance.now()
  const { pool, workerUrl } = opts
  const useShared = opts.useSharedArrayBuffer !== false
  const cache = opts.cache ?? DEFAULT_CHUNK_CACHE
  const storeOptsWithSignal = withAbortSignal(opts.opts, opts.signal)

  throwIfAborted(opts.signal)

  if (!useShared) {
    throw new Error("Worker chunk loading requires SharedArrayBuffer output")
  }

  assertSharedArrayBufferAvailable()

  // Read metadata from store — single read, single parse
  const metadataReadStartedAt = performance.now()
  const arrayMeta = await readArrayMetadataCached(arr, storeOptsWithSignal)
  const { codecMeta, fillValue } = arrayMeta
  const metadataReadMs = performance.now() - metadataReadStartedAt

  const actualChunkShape = codecMeta.chunk_shape

  // Update codecMeta to use the actual chunk shape for codec pipeline
  const correctedCodecMeta = codecMeta

  // getWorker always decodes at 'default' fidelity (its consumers assemble
  // into uint8/float32 outputs); raw16 is a getChunkWorker concern.
  const OutputCtr = getTextureOutputConstructor(correctedCodecMeta.data_type, "default")
  const outputBytesPerElement = OutputCtr.BYTES_PER_ELEMENT

  // Get stable metaId for the codec metadata (used by worker-rpc meta-init)
  const metaId = getMetaId(correctedCodecMeta)

  // Set up the indexer with the actual (possibly corrected) chunk shape
  const indexer = new BasicIndexer({
    selection,
    shape: arr.shape,
    chunk_shape: actualChunkShape,
  })

  // Allocate output — backed by SharedArrayBuffer when requested
  const size = indexer.shape.reduce((a: number, b: number) => a * b, 1)
  const buffer = createBuffer(size * outputBytesPerElement, useShared)
  // `createBuffer` returns a `SharedArrayBuffer` when `useShared` is true,
  // which every JS engine accepts as a TypedArray backing buffer even though
  // the current DOM lib types `ArrayBuffer`/`SharedArrayBuffer` as structurally
  // distinct (missing `resizable`/`resize`/etc.).
  const data = new OutputCtr(buffer as ArrayBuffer, 0, size)
  const outStride = get_strides(indexer.shape)
  // `OutputCtr` is chosen at runtime from `correctedCodecMeta.data_type`, so TS
  // can't statically narrow `data`'s element type to the generic `D`.
  const out = setter.prepare(data as unknown as TypedArray<D>, indexer.shape, outStride) as Chunk<D>

  // Pre-compute chunk invariants (hoisted out of loop)
  const chunkShape = actualChunkShape
  if (!isWorkerFetchCapableStore(arr.store)) {
    throw new Error("Worker chunk loading requires a worker-fetch-capable store")
  }
  const workerStore = await workerFetchConfigFor(arr.store)

  // Build tasks — one per chunk
  const tasks: Array<WorkerPoolTaskHandle<void>> = []
  const taskPriority = opts.priority ?? 0

  // Sync pass first: cache hits copy straight into the output (the key needs
  // no shard index — `chunkCacheKeyFor`); misses are collected and their
  // locations resolved in ONE parallel batch below, so a selection spanning N
  // cold shards costs one round of index reads instead of N serial ones.
  const pending: Array<{
    chunk_coords: number[]
    mapping: Parameters<typeof setter.set_from_chunk>[2]
    cacheKey: string
    chunkStartedAt: number
    cacheLookupMs: number
  }> = []

  for (const { chunk_coords, mapping } of indexer) {
    const chunkStartedAt = performance.now()
    const cacheKey = chunkCacheKeyFor(arr, arrayMeta, chunk_coords)

    // Check cache before building the task — cache hits skip the worker entirely
    const cacheLookupStartedAt = performance.now()
    const cachedChunk = cache.get(cacheKey)
    const cacheLookupMs = performance.now() - cacheLookupStartedAt

    if (cachedChunk) {
      // Cache hit — copy cached decoded chunk into output on main thread.
      // No worker needed, no fetch, no decompression.
      const writeStartedAt = performance.now()
      setter.set_from_chunk(out, cachedChunk as Chunk<D>, mapping)
      const mainThreadWriteMs = performance.now() - writeStartedAt
      if (zarrTimingEnabled()) logChunkTiming("[zarr chunk timing]", {
        chunkPath: chunkStoragePathFor(arr, arrayMeta, chunk_coords),
        chunkCoords: [...chunk_coords],
        cacheStatus: "hit",
        metadataReadMs: roundTiming(metadataReadMs),
        cacheLookupMs: roundTiming(cacheLookupMs),
        queueWaitMs: 0,
        workerMetaInitMs: 0,
        workerRoundTripMs: 0,
        workerFetchMs: 0,
        workerDecodeMs: 0,
        workerReshapeMs: 0,
        workerPromoteMs: 0,
        workerTotalMs: 0,
        fillChunkMs: 0,
        mainThreadWriteMs: roundTiming(mainThreadWriteMs),
        totalMs: roundTiming(performance.now() - chunkStartedAt),
      })
      continue
    }

    pending.push({ chunk_coords, mapping, cacheKey, chunkStartedAt, cacheLookupMs })
  }

  const pendingLocations = await Promise.all(
    pending.map((entry) =>
      resolveChunkLocation(arr, arrayMeta, entry.chunk_coords, storeOptsWithSignal),
    ),
  )

  for (let p = 0; p < pending.length; p++) {
    const { chunk_coords, mapping, cacheKey, chunkStartedAt, cacheLookupMs } = pending[p]
    const location = pendingLocations[p]
    const { chunkPath } = location

    // Compute edge chunk shape: min(chunk_shape[d], array_shape[d] - coord * chunk_shape[d])
    const edgeChunkShape = chunk_coords.map((coord, dim) =>
      Math.min(chunkShape[dim], arr.shape[dim] - coord * chunkShape[dim]),
    )
    const isEdgeChunk = edgeChunkShape.some((s, i) => s !== chunkShape[i])

    if (location.missing) {
      // Sharded array, inner chunk absent from the shard index: fill on the
      // main thread — no object to fetch, so no worker task.
      const fillStartedAt = performance.now()
      const fillChunkSize = edgeChunkShape.reduce((a: number, b: number) => a * b, 1)
      const chunkData = new OutputCtr(fillChunkSize)
      if (fillValue != null) {
        chunkData.fill(Number(fillValue))
      }
      const fillChunk: Chunk<D> = {
        data: chunkData as Chunk<D>["data"],
        shape: edgeChunkShape,
        stride: get_strides(edgeChunkShape),
      }
      cache.set(cacheKey, fillChunk)
      const fillChunkMs = performance.now() - fillStartedAt
      const writeStartedAt = performance.now()
      setter.set_from_chunk(out, fillChunk, mapping)
      if (zarrTimingEnabled()) logChunkTiming("[zarr chunk timing]", {
        chunkPath,
        chunkCoords: [...chunk_coords],
        cacheStatus: "missing-fill",
        metadataReadMs: roundTiming(metadataReadMs),
        cacheLookupMs: roundTiming(cacheLookupMs),
        queueWaitMs: 0,
        workerMetaInitMs: 0,
        workerRoundTripMs: 0,
        workerFetchMs: 0,
        workerDecodeMs: 0,
        workerReshapeMs: 0,
        workerPromoteMs: 0,
        workerTotalMs: 0,
        fillChunkMs: roundTiming(fillChunkMs),
        mainThreadWriteMs: roundTiming(performance.now() - writeStartedAt),
        totalMs: roundTiming(performance.now() - chunkStartedAt),
      })
      continue
    }

    const enqueuedAt = performance.now()

    tasks.push(
      enqueueWorkerTask(
        pool,
        workerUrl,
        opts.signal,
        async (worker, signal) => {
          const queueWaitMs = performance.now() - enqueuedAt
          const { chunk: fetchedChunk, timings: workerTimings } = await workerFetchDecode<D>(
            worker,
            workerStore,
            chunkPath,
            metaId,
            correctedCodecMeta,
            serializeRequestInit(
              requestInitFor(storeOptsWithSignal as RequestInit | undefined, location),
            ),
            isEdgeChunk ? edgeChunkShape : undefined,
            "default",
            false,
            signal,
          )

          let chunkToWrite: Chunk<D>
          let fillChunkMs = 0
          if (fetchedChunk) {
            cache.set(cacheKey, fetchedChunk)
            chunkToWrite = fetchedChunk
          } else {
            warnFillChunk(chunkPath, fillValue)
            const fillStartedAt = performance.now()
            const fillChunkShape = edgeChunkShape
            const fillChunkStrides = get_strides(fillChunkShape)
            const fillChunkSize = fillChunkShape.reduce(
              (a: number, b: number) => a * b,
              1,
            )
            const chunkData = new OutputCtr(fillChunkSize)
            if (fillValue != null) {
              chunkData.fill(Number(fillValue))
            }
            chunkToWrite = {
              data: chunkData as Chunk<D>["data"],
              shape: fillChunkShape,
              stride: fillChunkStrides,
            }
            cache.set(cacheKey, chunkToWrite)
            fillChunkMs = performance.now() - fillStartedAt
          }

          const writeStartedAt = performance.now()
          setter.set_from_chunk(out, chunkToWrite, mapping)
          const mainThreadWriteMs = performance.now() - writeStartedAt
          if (zarrTimingEnabled()) logChunkTiming("[zarr chunk timing]", {
            chunkPath,
            chunkCoords: [...chunk_coords],
            cacheStatus: fetchedChunk ? "miss" : "missing-fill",
            metadataReadMs: roundTiming(metadataReadMs),
            cacheLookupMs: roundTiming(cacheLookupMs),
            queueWaitMs: roundTiming(queueWaitMs),
            workerMetaInitMs: roundTiming(workerTimings.metaInitMs),
            workerRoundTripMs: roundTiming(workerTimings.roundTripMs),
            workerFetchMs: roundTiming(workerTimings.fetchMs),
            workerDecodeMs: roundTiming(workerTimings.decodeMs),
            workerReshapeMs: roundTiming(workerTimings.reshapeMs),
            workerPromoteMs: roundTiming(workerTimings.promoteMs),
            workerTotalMs: roundTiming(workerTimings.totalWorkerMs),
            fillChunkMs: roundTiming(fillChunkMs),
            mainThreadWriteMs: roundTiming(mainThreadWriteMs),
            totalMs: roundTiming(performance.now() - chunkStartedAt),
            fromHttpCache: workerTimings.fromHttpCache,
            protocol: workerTimings.protocol,
          })
        },
        taskPriority,
      ),
    )
  }

  // Execute all tasks with bounded concurrency via WorkerPool
  if (tasks.length > 0) {
    await waitForTaskHandles(tasks, opts.signal)
  }

  if (zarrTimingEnabled()) logChunkTiming("[zarr get timing]", {
    selectionShape: [...indexer.shape],
    chunkCount: tasks.length,
    metadataReadMs: roundTiming(metadataReadMs),
    totalMs: roundTiming(performance.now() - startedAt),
  })

  // If the final shape is empty (all integer selections), return a scalar
  if (indexer.shape.length === 0) {
    const unwrap =
      "get" in out.data
        ? (out.data as unknown as { get(idx: number): Scalar<D> }).get(0)
        : (out.data as unknown as ArrayLike<Scalar<D>>)[0]
    // @ts-expect-error: TS can't narrow conditional type
    return unwrap
  }

  // @ts-expect-error: TS can't narrow conditional type
  return out
}
