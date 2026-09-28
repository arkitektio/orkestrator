/**
 * Shared types for the read-only zarr worker runner.
 */

import { WorkerPool } from '../pool/workerpool'
import type { Chunk, CodecMetadata, DataType } from 'zarrita'

/**
 * Worker-side representation conversion before a chunk returns to the main
 * thread:
 * - 'default': uint8 stays Uint8Array, float32 stays Float32Array, everything
 *   else is widened to Float32Array.
 * - 'raw16': like 'default', but uint16 stays Uint16Array (RAW values, no
 *   rescale) — halves cache/transfer bytes for 16-bit data whose consumers
 *   can read Uint16Array chunks.
 * - 'low' / 'high': per-chunk normalization into uint8/uint16. UNSUITABLE for
 *   multi-chunk surfaces (each chunk gets its own window) — no production
 *   caller passes these.
 * - 'exact': NO conversion — the chunk returns in the array's own dtype
 *   (int64 as BigInt64Array, float64 as Float64Array, …). For reads whose
 *   values are integers that must survive exactly: sparse `indptr`/`indices`
 *   offsets and label ids, which float32 silently rounds past 2^24.
 */
export type TextureFidelity = 'default' | 'low' | 'high' | 'raw16' | 'exact'

export interface TextureChunkBounds {
  localMin: number
  localMax: number
}

export type TexturedChunk<D extends DataType = DataType> = Chunk<D> & {
  textureBounds?: TextureChunkBounds
}

/**
 * Minimal metadata needed to reconstruct a zarrita codec pipeline in a worker.
 */
export interface CodecChunkMeta {
  data_type: DataType
  chunk_shape: number[]
  codecs: CodecMetadata[]
}

/**
 * Interface for a decoded-chunk cache, compatible with `Map`.
 */
export interface ChunkCache {
  get(key: string): Chunk<DataType> | undefined
  set(key: string, value: Chunk<DataType>): void
}

export interface GetWorkerOptions<StoreOpts = unknown> {
  /** The WorkerPool to use for codec decode operations. */
  pool: WorkerPool
  /** Higher values are scheduled ahead of lower values when the pool is saturated. */
  priority?: number
  /** Cancel queued work and abort in-flight worker tasks when aborted. */
  signal?: AbortSignal
  /** Pass-through options for the store's `get` method. */
  opts?: StoreOpts
  /** Optional override for the codec worker script URL. */
  workerUrl?: string | URL
  /** SharedArrayBuffer output is required for the active high-performance read path. */
  useSharedArrayBuffer?: boolean
  /** Optional decoded-chunk cache. Defaults to the shared LRU cache. */
  cache?: ChunkCache
  /** Optional worker-side texture fidelity conversion before the data returns to the main thread. */
  textureFidelity?: TextureFidelity
}
