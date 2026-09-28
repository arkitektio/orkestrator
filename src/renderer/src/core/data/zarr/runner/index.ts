/**
 * @fideus-labs/fizarrita — Worker-pool-accelerated chunk reads for zarrita.
 *
 * Provides worker-backed chunk reads that offload fetch and decode to a
 * persistent WorkerPool queue with bounded concurrency.
 */

export type { ArrayMetadata, ChunkLocation } from "./get-worker"
export {
  chunkCacheKeyFor,
  createCacheKey,
  createDefaultWorker,
  effectiveChunkShapeOf,
  getChunkGroupWorker,
  getChunkWorker,
  prefetchShardIndex,
  resolveChunkLocation,
  getStoreId,
  getWorker,
  readArrayMetadata,
  readArrayMetadataCached,
} from "./get-worker.js"
// Internals — exported for building custom workers that extend the codec worker
export { create_codec_pipeline } from "./internals/codec-pipeline.js"
export type { ChunkProjection, IndexerProjection } from "./internals/indexer.js"
export {
  BasicIndexer,
  normalize_selection,
  slice,
  slice_indices,
} from "./internals/indexer.js"
export {
  compat_chunk,
  set_from_chunk_binary,
  setter,
} from "./internals/setter.js"
export type { ChunkKeyEncoding } from "./internals/util.js"
export {
  assertSharedArrayBufferAvailable,
  create_chunk_key_encoder,
  createBuffer,
  get_ctr,
  get_strides,
} from "./internals/util.js"
export type {
  ChunkCache,
  CodecChunkMeta,
  GetWorkerOptions,
} from "./types.js"
// Worker RPC helpers — for composing custom workers
export {
  getMetaId,
  workerFetchDecode,
} from "./worker-rpc.js"
