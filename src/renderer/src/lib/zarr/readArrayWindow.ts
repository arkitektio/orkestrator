import type { Array as ZarrArray, DataType, Readable } from "zarrita";
import { effectiveChunkShapeOf, getChunkGroupWorker } from "./runner";
import type { ChunkCache, TextureFidelity } from "./runner/types";
import type { WorkerPool } from "./pool/workerpool";
import { INTERACTIVE_FETCH_PRIORITY } from "./pool/types";
import { copyChunkInto, planWindowRead, resolveRange, stridesFor } from "./windowPlan";

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
  // Group read: within one shard this coalesces the ranged GETs, which is the
  // difference between one request and one per inner chunk.
  const pending = getChunkGroupWorker(
    array,
    plan.chunks.map((c) => c.coords),
    {
      pool,
      priority,
      signal,
      useSharedArrayBuffer: true,
      cache,
      textureFidelity: fidelity,
    },
  );

  const strides = stridesFor(plan.outShape);
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
