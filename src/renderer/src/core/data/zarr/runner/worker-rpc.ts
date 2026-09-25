/**
 * Main-thread helpers for communicating with the read-only codec worker.
 */

import { zarrTimingEnabled } from './timing.js'
import type { DataType, TypedArray } from 'zarrita'
import { get_ctr } from './internals/util.js'
import type { CodecChunkMeta, TextureChunkBounds, TexturedChunk } from './types.js'
import type { TextureFidelity } from './types.js'
import type { S3FetchConfig, SerializedRequestInit } from './s3-request.js'

type TextureCompatibleDataType = 'uint8' | 'uint16' | 'float32'

export interface WorkerDecodeTimings {
  metaInitMs: number
  roundTripMs: number
  fetchMs: number
  decodeMs: number
  reshapeMs: number
  promoteMs: number
  totalWorkerMs: number
  /** Served without network transfer; `null` = Resource Timing was opaque
   * (cross-origin without `Timing-Allow-Origin`), i.e. "cannot tell". */
  fromHttpCache: boolean | null
  /** Negotiated protocol (`http/1.1`, `h2`); `null` when opaque. */
  protocol: string | null
}

export interface WorkerFetchDecodeResult<D extends DataType> {
  chunk: TexturedChunk<D> | undefined
  timings: WorkerDecodeTimings
}

function createPromotedArray<D extends DataType>(
  promotedType: TextureCompatibleDataType | undefined,
  buffer: ArrayBufferLike,
  byteOffset: number,
  byteLength: number,
  meta: CodecChunkMeta,
): TypedArray<D> {
  if (promotedType === 'uint8') {
    return new Uint8Array(buffer, byteOffset, byteLength) as TypedArray<D>
  }

  if (promotedType === 'float32') {
    return new Float32Array(buffer, byteOffset, byteLength / Float32Array.BYTES_PER_ELEMENT) as TypedArray<D>
  }

  if (promotedType === 'uint16') {
    return new Uint16Array(buffer, byteOffset, byteLength / Uint16Array.BYTES_PER_ELEMENT) as TypedArray<D>
  }

  const Ctr = get_ctr(meta.data_type) as unknown as {
    new (buf: ArrayBufferLike, off: number, len: number): TypedArray<D>
    BYTES_PER_ELEMENT: number
  }
  return new Ctr(buffer, byteOffset, byteLength / Ctr.BYTES_PER_ELEMENT)
}

interface PendingRequest {
  resolve: (data: unknown) => void
  reject: (err: Error) => void
}

/**
 * The worker itself failed (uncaught error / script load failure) as opposed
 * to one request failing — the ONLY error class that should retire a worker.
 * Several requests share one worker, so a per-request failure (a 403, a
 * corrupt chunk) must not terminate the siblings in flight beside it.
 */
export class WorkerCrashedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkerCrashedError'
  }
}

export const isWorkerCrashedError = (error: unknown): error is WorkerCrashedError =>
  error instanceof Error && error.name === 'WorkerCrashedError'

function createAbortError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Aborted', 'AbortError')
  }
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

class WorkerDispatcher {
  private pending = new Map<number, PendingRequest>()
  private sentMetas = new Set<number>()

  constructor(private worker: Worker) {
    worker.addEventListener('message', this.onMessage)
    worker.addEventListener('error', this.onError)
  }

  private onMessage = (event: MessageEvent): void => {
    const { id } = event.data
    const req = this.pending.get(id)
    if (!req) return
    this.pending.delete(id)

    if (event.data.error) {
      req.reject(new Error(event.data.error))
    } else {
      req.resolve(event.data)
    }
  }

  private onError = (err: ErrorEvent): void => {
    this.rejectAll(new WorkerCrashedError(err.message ?? 'Worker error'))
  }

  /**
   * Post `message` and await the reply for `id`. With `signal`, an abort
   * rejects locally at once and posts `{type:'cancel', id}` so the worker
   * aborts that one fetch — the worker stays alive for its other requests.
   */
  send(id: number, message: unknown, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) return Promise.reject(createAbortError())
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        if (!this.pending.delete(id)) return
        this.worker.postMessage({ type: 'cancel', id })
        reject(createAbortError())
      }
      const settle = <T>(fn: (value: T) => void) => (value: T) => {
        signal?.removeEventListener('abort', onAbort)
        fn(value)
      }
      this.pending.set(id, { resolve: settle(resolve), reject: settle(reject) })
      signal?.addEventListener('abort', onAbort, { once: true })
      this.worker.postMessage(message)
    })
  }

  hasMeta(metaId: number): boolean {
    return this.sentMetas.has(metaId)
  }

  markMeta(metaId: number): void {
    this.sentMetas.add(metaId)
  }

  rejectAll(error: Error): void {
    for (const req of this.pending.values()) {
      req.reject(error)
    }
    this.pending.clear()
  }

  destroy(): void {
    this.worker.removeEventListener('message', this.onMessage)
    this.worker.removeEventListener('error', this.onError)
    this.pending.clear()
    this.sentMetas.clear()
  }
}

const dispatchers = new WeakMap<Worker, WorkerDispatcher>()

function getDispatcher(worker: Worker): WorkerDispatcher {
  let dispatcher = dispatchers.get(worker)
  if (!dispatcher) {
    dispatcher = new WorkerDispatcher(worker)
    dispatchers.set(worker, dispatcher)
  }
  return dispatcher
}

export function disposeWorker(
  worker: Worker,
  error: Error = new Error('Worker terminated'),
): void {
  const dispatcher = dispatchers.get(worker)
  if (dispatcher) {
    dispatcher.rejectAll(error)
    dispatcher.destroy()
    dispatchers.delete(worker)
  }
  worker.terminate()
}

let nextMetaId = 0
const metaKeyToId = new Map<string, number>()
// Identity fast path: codec metadata objects come from the per-array
// metadata cache and are reused across every chunk of that array, so the
// stringify (main thread, once per chunk request) only runs on a new object.
const metaObjectToId = new WeakMap<CodecChunkMeta, number>()

export function getMetaId(meta: CodecChunkMeta): number {
  const cached = metaObjectToId.get(meta)
  if (cached !== undefined) return cached
  const key = JSON.stringify(meta)
  let id = metaKeyToId.get(key)
  if (id === undefined) {
    id = nextMetaId++
    metaKeyToId.set(key, id)
  }
  metaObjectToId.set(meta, id)
  return id
}

let nextRequestId = 0

/** One inner chunk of a coalesced shard read (absolute byte offsets). */
export interface WorkerFetchPart {
  offset: number
  length: number
  actualChunkShape?: number[]
}

export interface WorkerFetchDecodeMultiResult<D extends DataType> {
  /** Per part, in request order; `undefined` = the shard object was missing. */
  chunks: (TexturedChunk<D> | undefined)[]
  timings: {
    roundTripMs: number
    fetchMs: number
    totalWorkerMs: number
    fromHttpCache: boolean | null
    protocol: string | null
  }
}

/**
 * Coalesced read: one ranged GET over `range`, decoded into `parts.length`
 * chunks by the worker. Same meta piggybacking as `workerFetchDecode`.
 */
export async function workerFetchDecodeMulti<D extends DataType>(
  worker: Worker,
  store: S3FetchConfig,
  path: `/${string}`,
  range: { offset: number; length: number },
  parts: WorkerFetchPart[],
  metaId: number,
  meta: CodecChunkMeta,
  requestInit?: SerializedRequestInit,
  textureFidelity: TextureFidelity = 'default',
  useSharedArrayBuffer = false,
  signal?: AbortSignal,
): Promise<WorkerFetchDecodeMultiResult<D>> {
  const dispatcher = getDispatcher(worker)
  let inlineMeta: CodecChunkMeta | undefined
  if (!dispatcher.hasMeta(metaId)) {
    inlineMeta = meta
    dispatcher.markMeta(metaId)
  }
  const id = nextRequestId++
  const roundTripStartedAt = performance.now()
  const response = (await dispatcher.send(id, {
    type: 'fetch_decode_multi' as const,
    id,
    store,
    path,
    range,
    parts,
    metaId,
    meta: inlineMeta,
    requestInit,
    textureFidelity,
    useSharedArrayBuffer,
    timing: zarrTimingEnabled(),
  }, signal)) as {
    parts: ({
      promotedType?: TextureCompatibleDataType
      textureBounds?: TextureChunkBounds
      data?: ArrayBufferLike
      byteOffset?: number
      byteLength?: number
      shape?: number[]
      stride?: number[]
    } | null)[]
    timings?: { fetchMs?: number; totalMs?: number; fromHttpCache?: boolean | null; protocol?: string | null }
  }
  return {
    chunks: response.parts.map((part) => {
      if (!part) return undefined
      const data = createPromotedArray<D>(
        part.promotedType,
        part.data!,
        part.byteOffset ?? 0,
        part.byteLength ?? part.data!.byteLength,
        meta,
      )
      return {
        data,
        shape: part.shape!,
        stride: part.stride!,
        textureBounds: part.textureBounds,
      } as TexturedChunk<D>
    }),
    timings: {
      roundTripMs: performance.now() - roundTripStartedAt,
      fetchMs: response.timings?.fetchMs ?? 0,
      totalWorkerMs: response.timings?.totalMs ?? 0,
      fromHttpCache: response.timings?.fromHttpCache ?? null,
      protocol: response.timings?.protocol ?? null,
    },
  }
}

export async function workerFetchDecode<D extends DataType>(
  worker: Worker,
  store: S3FetchConfig,
  path: `/${string}`,
  metaId: number,
  meta: CodecChunkMeta,
  requestInit?: SerializedRequestInit,
  actualChunkShape?: number[],
  textureFidelity: TextureFidelity = 'default',
  useSharedArrayBuffer = false,
  signal?: AbortSignal,
): Promise<WorkerFetchDecodeResult<D>> {
  const dispatcher = getDispatcher(worker)
  // Piggyback the codec meta on the first fetch_decode this worker sees for
  // this metaId instead of a separate serial `init` round-trip (which used to
  // cost one full worker RT per cold worker — the dominant fixed cost on a
  // cold pool). Marking BEFORE the send is race-free even though several
  // requests are now in flight per worker: `postMessage` order is preserved
  // and the worker registers a piggybacked meta synchronously, before its
  // first `await` — so a later request sent without the meta always finds it
  // registered.
  let inlineMeta: CodecChunkMeta | undefined
  if (!dispatcher.hasMeta(metaId)) {
    inlineMeta = meta
    dispatcher.markMeta(metaId)
  }
  const metaInitMs = 0 // meta rides the fetch_decode message now

  const id = nextRequestId++
  const roundTripStartedAt = performance.now()
  const response = await dispatcher.send(id, {
    type: 'fetch_decode' as const,
    id,
    store,
    path,
    metaId,
    meta: inlineMeta,
    requestInit,
    actualChunkShape,
    textureFidelity,
    useSharedArrayBuffer,
    timing: zarrTimingEnabled(),
  }, signal) as {
    missing?: boolean
    promotedType?: TextureCompatibleDataType
    textureBounds?: TextureChunkBounds
    data?: ArrayBufferLike
    byteOffset?: number
    byteLength?: number
    shape?: number[]
    stride?: number[]
    timings?: {
      fetchMs?: number
      decodeMs?: number
      reshapeMs?: number
      promoteMs?: number
      totalMs?: number
      fromHttpCache?: boolean | null
      protocol?: string | null
    }
  }

  const timings: WorkerDecodeTimings = {
    metaInitMs,
    roundTripMs: performance.now() - roundTripStartedAt,
    fetchMs: response.timings?.fetchMs ?? 0,
    decodeMs: response.timings?.decodeMs ?? 0,
    reshapeMs: response.timings?.reshapeMs ?? 0,
    promoteMs: response.timings?.promoteMs ?? 0,
    totalWorkerMs: response.timings?.totalMs ?? 0,
    fromHttpCache: response.timings?.fromHttpCache ?? null,
    protocol: response.timings?.protocol ?? null,
  }

  if (response.missing) {
    return {
      chunk: undefined,
      timings,
    }
  }

  const data = createPromotedArray<D>(
    response.promotedType,
    response.data!,
    response.byteOffset ?? 0,
    response.byteLength ?? response.data!.byteLength,
    meta,
  )
  return {
    chunk: {
      data,
      shape: response.shape!,
      stride: response.stride!,
      textureBounds: response.textureBounds,
    } as TexturedChunk<D>,
    timings,
  }
}

