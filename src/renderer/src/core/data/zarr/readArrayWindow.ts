import type { Array as ZarrArray, Chunk, DataType, Readable } from "zarrita";
import { effectiveChunkShapeOf, getChunkGroupWorker, getStoreId } from "./runner";
import type { ChunkCache, TextureFidelity } from "./runner/types";
import type { WorkerPool } from "./pool/workerpool";
import { INTERACTIVE_FETCH_PRIORITY } from "./pool/types";
import { chunkIsWindow, copyChunkInto, planWindowRead, resolveRange, stridesFor } from "./windowPlan";

/** A half-open, forward-strided range along one axis. Omitted bounds mean "all of it". */
export type WindowRange = {
  start?: number | null;
  stop?: number | null;
  step?: number | null;
};

/**
 * The one way to read a window of a zarr array anywhere in the renderer.
 *
 * zarrita's own `get()` fetches and decodes on the MAIN thread and plans chunk
 * reads against `arr.chunks`, which for a `sharding_indexed` array is the SHARD
 * shape, so reading a sliver fetches whole shards. This goes through the shared
 * worker runner instead: inner-chunk planning (`effectiveChunkShapeOf`), shard
 * index caching, ranged-read coalescing, and decode on the pool.
 *
 * `ranges` is positional, in the array's own axis order. A null or absent entry
 * reads that axis in full. The result is row-major over the WINDOW's shape.
 *
 * `fidelity` picks the output representation (see `TextureFidelity`):
 *  - `"default"`: uint8 stays uint8, every other dtype arrives as float32. Right
 *    for samples and anything drawn.
 *  - `"exact"`: the array's own dtype, never widened. Required for integers
 *    that must survive exactly: sparse offsets and indices, label ids. float32
 *    rounds them past 2^24.
 *
 * The returned `data` may be the decoded chunk itself (when one chunk is exactly
 * the window) — treat it as READ-ONLY.
 *
 * Each caller passes its OWN `cache`: the decoded-chunk key does not include the
 * fidelity, so an exact reader and a promoting reader must never share one.
 *
 * Throws when the array was not opened through `openZarrArray` (no effective
 * chunk shape). That is not a formality: it is the sharding bug class above.
 */
export type ArrayWindowResult<T> = {
  shape: number[];
  strides: number[];
  data: T;
};

export type ReadArrayWindowOptions = {
  pool: WorkerPool;
  cache: ChunkCache;
  priority?: number;
  signal?: AbortSignal;
  fidelity?: Extract<TextureFidelity, "default" | "exact">;
};

type AnyTypedArray =
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

export async function readArrayWindow(
  array: ZarrArray<DataType, Readable>,
  ranges: readonly (WindowRange | null | undefined)[],
  options: ReadArrayWindowOptions & { fidelity: "exact" },
): Promise<ArrayWindowResult<AnyTypedArray>>;
export async function readArrayWindow(
  array: ZarrArray<DataType, Readable>,
  ranges: readonly (WindowRange | null | undefined)[],
  options: ReadArrayWindowOptions,
): Promise<ArrayWindowResult<Float32Array | Uint8Array>>;
export async function readArrayWindow(
  array: ZarrArray<DataType, Readable>,
  ranges: readonly (WindowRange | null | undefined)[],
  options: ReadArrayWindowOptions,
): Promise<ArrayWindowResult<AnyTypedArray>> {
  const { pool, cache, signal, priority = INTERACTIVE_FETCH_PRIORITY, fidelity = "default" } = options;
  signal?.throwIfAborted();

  const chunkShape = effectiveChunkShapeOf(array);
  if (!chunkShape) {
    throw new Error(
      `[zarr] no effective chunk shape for ${array.path}: the array was opened ` +
        `without reading its metadata. Open it with \`openZarrArray\`.`,
    );
  }

  const resolved = array.shape.map((extent, d) => resolveRange(extent, ranges[d] ?? undefined));
  const plan = planWindowRead(array.shape, chunkShape, resolved);
  if (!plan) {
    // An empty window is not an error: the caller has nothing to draw or join.
    return { shape: resolved.map(() => 0), strides: resolved.map(() => 0), data: new Float32Array(0) };
  }

  const step = resolved.map((r) => r?.step ?? 1);
  const pending = sharedChunkReads(
    array,
    plan.chunks.map((c) => c.coords),
    { pool, priority, cache, fidelity },
  ).map((read) => raceSignal(read, signal));

  const strides = stridesFor(plan.outShape);

  // Zero copy: one chunk that IS the window (a chunk-aligned trace tile) is
  // returned as is. It is the decoded chunk the cache also holds — callers read
  // windows, they never write into them.
  if (pending.length === 1) {
    const chunk = await pending[0];
    signal?.throwIfAborted();
    if (chunkIsWindow(plan, chunk, step)) {
      return { shape: plan.outShape, strides, data: chunk.data as unknown as AnyTypedArray };
    }
  }

  let out: AnyTypedArray | null = null;
  for (let i = 0; i < pending.length; i++) {
    const chunk = await pending[i];
    const data = chunk.data as unknown as AnyTypedArray;
    // Match the worker's output representation rather than guessing it.
    if (!out) out = new (data.constructor as new (length: number) => AnyTypedArray)(plan.outLength);
    copyChunkInto(
      { data: out as unknown as { [i: number]: number }, strides },
      { data: data as ArrayLike<number | bigint>, stride: chunk.stride },
      plan.chunks[i],
      step,
    );
  }
  signal?.throwIfAborted();

  return { shape: plan.outShape, strides, data: out ?? new Float32Array(plan.outLength) };
}

// --- single flight ------------------------------------------------------------

/**
 * Chunk reads in flight, per cache, by chunk identity.
 *
 * The runner checks the decoded-chunk cache when a read is ISSUED, so N readers
 * asking for one chunk before the first read lands all miss — and each fetches
 * and decodes it. That is exactly what a window-tiled reader does when its tiles
 * are smaller than the storage chunks (hundreds of trace tiles over one 20 MB
 * chunk). Keyed per cache because the cache key carries no fidelity; the key here
 * adds it anyway.
 */
const inFlight = new WeakMap<object, Map<string, Promise<Chunk<DataType>>>>();

const sharedChunkReads = (
  array: ZarrArray<DataType, Readable>,
  coordsList: readonly number[][],
  options: {
    pool: WorkerPool;
    priority: number;
    cache: ChunkCache;
    fidelity: NonNullable<ReadArrayWindowOptions["fidelity"]>;
  },
): Promise<Chunk<DataType>>[] => {
  let byKey = inFlight.get(options.cache);
  if (!byKey) {
    byKey = new Map();
    inFlight.set(options.cache, byKey);
  }
  const prefix = `${getStoreId(array.store)}:${array.path}:${options.fidelity}:`;
  const keys = coordsList.map((coords) => prefix + coords.join(","));

  const out: (Promise<Chunk<DataType>> | null)[] = keys.map((key) => byKey!.get(key) ?? null);
  const missing = keys.map((_, i) => i).filter((i) => out[i] === null);
  if (missing.length > 0) {
    // One group read for every chunk nobody is reading yet — within a shard this
    // still coalesces the ranged GETs. It runs WITHOUT a caller's signal: it is
    // shared, and a read another caller abandons still lands in the cache.
    const reads = getChunkGroupWorker(
      array,
      missing.map((i) => coordsList[i]),
      {
        pool: options.pool,
        priority: options.priority,
        useSharedArrayBuffer: true,
        cache: options.cache,
        textureFidelity: options.fidelity,
      },
    );
    missing.forEach((i, k) => {
      const key = keys[i];
      const read = reads[k] as Promise<Chunk<DataType>>;
      byKey!.set(key, read);
      const clear = () => {
        if (byKey!.get(key) === read) byKey!.delete(key);
      };
      read.then(clear, clear);
      out[i] = read;
    });
  }
  return out as Promise<Chunk<DataType>>[];
};

/** A shared read, abandoned by THIS caller when its signal aborts. */
const raceSignal = <T>(read: Promise<T>, signal: AbortSignal | undefined): Promise<T> => {
  if (!signal) return read;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    read.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
};

/** Test seam: how many chunk reads are in flight for a cache. */
export const inFlightChunkReads = (cache: ChunkCache): number => inFlight.get(cache)?.size ?? 0;
