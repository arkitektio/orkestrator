/**
 * Read-only codec worker for zarr chunk fetching and decoding.
 */

import type { Chunk, DataType } from 'zarrita'

import { create_codec_pipeline } from './internals/codec-pipeline.js'
import { createBuffer, get_ctr, get_strides } from './internals/util.js'
import {
  deserializeRequestInit,
  fetchS3Path,
  type S3FetchConfig,
  type SerializedRequestInit,
} from './s3-request.js'
import type { CodecChunkMeta, TextureChunkBounds } from './types.js'

const ctx = self as unknown as DedicatedWorkerGlobalScope & {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void | Promise<void>) | null
}

type TextureCompatibleDataType = 'uint8' | 'uint16' | 'float32'
type TextureFidelity = 'default' | 'low' | 'high' | 'raw16'

type TextureCompatibleChunk = Chunk<'uint8'> | Chunk<'uint16'> | Chunk<'float32'>

function now(): number {
  return performance.now()
}

// Resource Timing entries are only consulted for the opt-in per-chunk timing
// log (requests carrying `timing: true`). Bound the buffer ONCE here instead
// of scanning `getEntriesByType('resource').length` on every chunk fetch:
// when the buffer fills, the browser fires this event and we drop the
// entries wholesale. A clear can race a concurrent fetch out of its entry,
// which only costs a `null` transport reading in the (opt-in) log.
try {
  performance.setResourceTimingBufferSize(200)
  performance.addEventListener('resourcetimingbufferfull', () => performance.clearResourceTimings())
} catch {
  // Not every worker runtime exposes the Resource Timing buffer API.
}

function fixEdgeChunkShapeStride<D extends DataType>(
  chunk: Chunk<D>,
  actualChunkShape?: number[],
): Chunk<D> {
  if (actualChunkShape) {
    const expectedElements = actualChunkShape.reduce((a, b) => a * b, 1)
    const actualElements = (chunk.data as unknown as ArrayLike<unknown>).length
    if (actualElements === expectedElements) {
      return {
        data: chunk.data,
        shape: actualChunkShape,
        stride: get_strides(actualChunkShape, 'C'),
      }
    }
    if (actualElements > expectedElements) {
      const src = chunk.data as unknown as { readonly [i: number]: unknown; readonly length: number }
      const Ctr = (chunk.data as unknown as { constructor: new (n: number) => typeof chunk.data }).constructor
      const dst = new Ctr(expectedElements)
      const srcStrides = get_strides(chunk.shape, 'C')
      copySubRegion(src, srcStrides, dst as unknown as { [i: number]: unknown; length: number }, actualChunkShape)
      return {
        data: dst,
        shape: actualChunkShape,
        stride: get_strides(actualChunkShape, 'C'),
      }
    }
  }
  return chunk
}

function convertChunkToTexturePrecision(
  chunk: Chunk<DataType>,
  targetType: 'uint8' | 'uint16',
  useSharedArrayBuffer: boolean,
): {
  chunk: Chunk<'uint8'> | Chunk<'uint16'>
  promotedType: TextureCompatibleDataType
  textureBounds: TextureChunkBounds
} {
  const source = chunk.data as ArrayLike<number | bigint>
  const outputMax = targetType === 'uint8' ? 255 : 65535
  const outputBuffer = createBuffer(
    source.length * (targetType === 'uint8' ? Uint8Array.BYTES_PER_ELEMENT : Uint16Array.BYTES_PER_ELEMENT),
    useSharedArrayBuffer,
  )
  const output = targetType === 'uint8'
    ? new Uint8Array(outputBuffer)
    : new Uint16Array(outputBuffer)
  let localMin = Number.POSITIVE_INFINITY
  let localMax = Number.NEGATIVE_INFINITY

  for (let i = 0; i < source.length; i++) {
    const numericValue = Number(source[i])
    if (!Number.isFinite(numericValue)) {
      continue
    }

    localMin = Math.min(localMin, numericValue)
    localMax = Math.max(localMax, numericValue)
  }

  if (!Number.isFinite(localMin) || !Number.isFinite(localMax)) {
    localMin = 0
    localMax = 0
  }

  const sourceRange = localMax - localMin

  for (let i = 0; i < source.length; i++) {
    const numericValue = Number(source[i])
    if (!Number.isFinite(numericValue)) {
      output[i] = 0
      continue
    }

    const normalized = sourceRange <= 0
      ? 0
      : Math.min(1, Math.max(0, (numericValue - localMin) / sourceRange))
    output[i] = Math.round(normalized * outputMax)
  }

  return {
    chunk: {
      data: output,
      shape: chunk.shape,
      stride: chunk.stride,
    } as Chunk<'uint8'> | Chunk<'uint16'>,
    promotedType: targetType,
    textureBounds: {
      localMin,
      localMax,
    },
  }
}

function promoteChunkForTexture(
  chunk: Chunk<DataType>,
  _sourceDataType: DataType,
  textureFidelity: TextureFidelity,
  useSharedArrayBuffer: boolean,
): {
  chunk: TextureCompatibleChunk
  promotedType: TextureCompatibleDataType
  textureBounds?: TextureChunkBounds
} {
  if (textureFidelity === 'low') {
    return convertChunkToTexturePrecision(chunk, 'uint8', useSharedArrayBuffer)
  }

  if (textureFidelity === 'high') {
    return convertChunkToTexturePrecision(chunk, 'uint16', useSharedArrayBuffer)
  }

  if (chunk.data instanceof Uint8Array || chunk.data instanceof Uint8ClampedArray) {
    const uint8Data =
      chunk.data instanceof Uint8Array
        ? chunk.data
        : new Uint8Array(chunk.data.buffer, chunk.data.byteOffset, chunk.data.byteLength)
    return {
      chunk: ensureSharedChunkIfNeeded(
        {
          data: uint8Data,
          shape: chunk.shape,
          stride: chunk.stride,
        } as Chunk<'uint8'>,
        useSharedArrayBuffer,
      ),
      promotedType: 'uint8',
    }
  }

  if (chunk.data instanceof Float32Array) {
    return {
      chunk: ensureSharedChunkIfNeeded(chunk as Chunk<'float32'>, useSharedArrayBuffer),
      promotedType: 'float32',
    }
  }

  // 'raw16': uint16 passes through unwidened (RAW values — no rescale), so a
  // 16-bit chunk costs 2 B/voxel in caches and transfers instead of the
  // promoted float32's 4. Every other dtype falls through to the default
  // widening below. Consumers opting in MUST read Uint16Array chunk data.
  if (textureFidelity === 'raw16' && chunk.data instanceof Uint16Array) {
    return {
      chunk: ensureSharedChunkIfNeeded(chunk as Chunk<'uint16'>, useSharedArrayBuffer),
      promotedType: 'uint16',
    }
  }

  const source = chunk.data as ArrayLike<number | bigint>
  const promoted = new Float32Array(
    createBuffer(source.length * Float32Array.BYTES_PER_ELEMENT, useSharedArrayBuffer),
  )
  if (
    typeof BigInt64Array !== 'undefined' &&
    (source instanceof BigInt64Array || source instanceof BigUint64Array)
  ) {
    // BigInt sources need the explicit Number() per element.
    for (let i = 0; i < source.length; i++) {
      promoted[i] = Number(source[i])
    }
  } else {
    // Native typed-array widening (uint16/int16/uint32/int32/float64 → f32):
    // dramatically faster than the scalar loop for large microscopy chunks.
    promoted.set(source as ArrayLike<number>)
  }

  return {
    chunk: {
      data: promoted,
      shape: chunk.shape,
      stride: chunk.stride,
    } as Chunk<'float32'>,
    promotedType: 'float32',
  }
}

function ensureSharedChunkIfNeeded<D extends 'uint8' | 'uint16' | 'float32'>(
  chunk: Chunk<D>,
  useSharedArrayBuffer: boolean,
): Chunk<D> {
  if (!useSharedArrayBuffer) {
    return chunk
  }

  const dataView = chunk.data as unknown as {
    buffer: ArrayBufferLike
    byteOffset: number
    byteLength: number
  }

  if (typeof SharedArrayBuffer !== 'undefined' && dataView.buffer instanceof SharedArrayBuffer) {
    return chunk
  }

  const Ctr = get_ctr(DTYPE_BY_PROMOTED_ARRAY.get((chunk.data as unknown as { constructor: Function }).constructor) ?? 'float32') as unknown as {
    new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): Chunk<D>['data']
    BYTES_PER_ELEMENT: number
  }
  const sharedBuffer = createBuffer(dataView.byteLength, true)
  const sharedData = new Ctr(sharedBuffer, 0, dataView.byteLength / Ctr.BYTES_PER_ELEMENT)
  sharedData.set(chunk.data as unknown as ArrayLike<number>)

  return {
    data: sharedData,
    shape: chunk.shape,
    stride: chunk.stride,
  }
}

const DTYPE_BY_PROMOTED_ARRAY = new Map<Function, 'uint8' | 'uint16' | 'float32'>([
  [Uint8Array, 'uint8'],
  [Uint16Array, 'uint16'],
  [Float32Array, 'float32'],
])

function copySubRegion(
  src: { readonly [i: number]: unknown; readonly length: number },
  srcStrides: number[],
  dst: { [i: number]: unknown; length: number },
  subShape: number[],
  srcOffset = 0,
  dstOffset = 0,
  dim = 0,
): void {
  if (dim === subShape.length - 1) {
    for (let i = 0; i < subShape[dim]; i++) {
      dst[dstOffset + i] = src[srcOffset + i]
    }
    return
  }

  const dstStride = subShape.slice(dim + 1).reduce((a, b) => a * b, 1)
  for (let i = 0; i < subShape[dim]; i++) {
    copySubRegion(
      src,
      srcStrides,
      dst,
      subShape,
      srcOffset + i * srcStrides[dim],
      dstOffset + i * dstStride,
      dim + 1,
    )
  }
}

const pipelineByMetaId = new Map<number, ReturnType<typeof create_codec_pipeline>>()
const metaByMetaId = new Map<number, CodecChunkMeta>()

function getPipeline(metaId: number): ReturnType<typeof create_codec_pipeline> {
  const pipeline = pipelineByMetaId.get(metaId)
  if (!pipeline) {
    throw new Error(`No pipeline for metaId ${metaId}. Send an 'init' message first.`)
  }
  return pipeline
}

/** `bytes=start-end` (inclusive) → `[start, end)`; `null` for any other form. */
function parseAbsoluteRange(header: string | null | undefined): { start: number; end: number } | null {
  const match = header?.match(/^bytes=(\d+)-(\d+)$/)
  if (!match) return null
  return { start: Number(match[1]), end: Number(match[2]) + 1 }
}

/**
 * How the bytes arrived, off the Resource Timing entry: `fromHttpCache` when
 * the response was served without network transfer, and the negotiated
 * protocol (`http/1.1` / `h2`). Both `null` when the entry is opaque —
 * cross-origin resources report zero sizes unless the server sends
 * `Timing-Allow-Origin` — so null means "cannot tell", not "not cached".
 */
interface TransportInfo {
  fromHttpCache: boolean | null
  protocol: string | null
}

const UNKNOWN_TRANSPORT: TransportInfo = Object.freeze({ fromHttpCache: null, protocol: null })

/**
 * Only called when the request asked for timing: `getEntriesByName` walks the
 * whole Resource Timing buffer, which is real per-chunk work on a worker that
 * is otherwise saturated with fetch + decode.
 */
function transportInfoFor(responseUrl: string): TransportInfo {
  try {
    const entries = performance.getEntriesByName(responseUrl) as PerformanceResourceTiming[]
    const entry = entries[entries.length - 1]
    if (!entry) return UNKNOWN_TRANSPORT
    const opaque = entry.transferSize === 0 && entry.decodedBodySize === 0
    return {
      fromHttpCache: opaque ? null : entry.transferSize === 0,
      protocol: entry.nextHopProtocol || null,
    }
  } catch {
    return UNKNOWN_TRANSPORT
  }
}

async function fetchChunkBytes(
  store: S3FetchConfig,
  path: `/${string}`,
  requestInit?: SerializedRequestInit,
  timing = false,
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array | undefined; transport: TransportInfo }> {
  const init: RequestInit = { ...(deserializeRequestInit(requestInit) ?? {}), signal }
  const response = await fetchS3Path(store, path, init)

  if (response.status === 404) {
    return { bytes: undefined, transport: timing ? transportInfoFor(response.url) : UNKNOWN_TRANSPORT }
  }

  if (response.status !== 200 && response.status !== 206) {
    throw new Error(`Unexpected response status ${response.status} ${response.statusText}`)
  }

  const body = new Uint8Array(await response.arrayBuffer())
  const transport = timing ? transportInfoFor(response.url) : UNKNOWN_TRANSPORT

  // Sharded inner chunk: the main thread asked for `bytes=a-b` inside a shard.
  // A gateway that ignores Range answers 200 with the WHOLE shard — slice
  // locally rather than decode the shard's first bytes as this chunk.
  const range = parseAbsoluteRange(new Headers(init.headers).get('range'))
  if (range) {
    if (response.status === 200 && !response.headers.get('Content-Range')) {
      return { bytes: body.subarray(range.start, range.end), transport }
    }
    const expected = range.end - range.start
    if (body.byteLength !== expected) {
      throw new Error(
        `Ranged chunk read returned ${body.byteLength} bytes, expected ${expected} (${path})`,
      )
    }
  }

  return { bytes: body, transport }
}

interface FetchDecodeCommon {
  id: number
  store: S3FetchConfig
  path: `/${string}`
  metaId: number
  /** Piggybacked codec meta on this worker's FIRST request for a metaId —
   * replaces the separate serial `init` round-trip (cold-start cost). */
  meta?: CodecChunkMeta
  requestInit?: SerializedRequestInit
  textureFidelity?: TextureFidelity
  useSharedArrayBuffer?: boolean
  /** Main thread has `__ZARR_TIMING__` on: also read the Resource Timing
   * entry for transport info (`fromHttpCache` / `protocol`). Default false —
   * that lookup is per-chunk work that only feeds the opt-in log. */
  timing?: boolean
}

/** One inner chunk inside a coalesced shard range (absolute byte offsets). */
export interface FetchDecodePart {
  offset: number
  length: number
  actualChunkShape?: number[]
}

type WorkerMessage =
  | { type: 'init'; id: number; metaId: number; meta: CodecChunkMeta }
  /** Abort the in-flight request `id` (its fetch, and the decode if it has
   * not started). Several requests share one worker now, so cancellation is
   * per request — the main thread never terminates a worker to cancel one. */
  | { type: 'cancel'; id: number }
  | (FetchDecodeCommon & { type: 'fetch_decode'; actualChunkShape?: number[] })
  | (FetchDecodeCommon & {
      /** Coalesced read: ONE ranged GET covering `range`, sliced into
       * `parts` (each an inner chunk), decoded and promoted individually. */
      type: 'fetch_decode_multi'
      range: { offset: number; length: number }
      parts: FetchDecodePart[]
    })

interface DecodedPartMessage {
  promotedType: TextureCompatibleDataType
  textureBounds?: TextureChunkBounds
  data: ArrayBufferLike
  byteOffset: number
  byteLength: number
  shape: number[]
  stride: number[]
  timings: { decodeMs: number; reshapeMs: number; promoteMs: number }
}

function ensurePipeline(metaId: number, meta: CodecChunkMeta | undefined): void {
  if (meta && !pipelineByMetaId.has(metaId)) {
    metaByMetaId.set(metaId, meta)
    pipelineByMetaId.set(
      metaId,
      create_codec_pipeline({
        data_type: meta.data_type,
        shape: meta.chunk_shape,
        codecs: meta.codecs,
      }),
    )
  }
}

/** Decode + edge-fix + texture-promote one chunk's raw bytes. */
async function decodeOne(
  rawBytes: Uint8Array,
  metaId: number,
  actualChunkShape: number[] | undefined,
  textureFidelity: TextureFidelity,
  useSharedArrayBuffer: boolean,
): Promise<DecodedPartMessage> {
  const pipeline = getPipeline(metaId)
  const decodeStartedAt = now()
  let chunk = (await pipeline.decode(rawBytes)) as Chunk<DataType>
  const decodeMs = now() - decodeStartedAt

  const reshapeStartedAt = now()
  chunk = fixEdgeChunkShapeStride(chunk, actualChunkShape)
  const reshapeMs = now() - reshapeStartedAt

  const promoteStartedAt = now()
  const meta = metaByMetaId.get(metaId)
  if (!meta) {
    throw new Error(`No metadata registered for metaId ${metaId}`)
  }
  const promoted = promoteChunkForTexture(chunk, meta.data_type, textureFidelity, useSharedArrayBuffer)
  const promoteMs = now() - promoteStartedAt

  const dataView = promoted.chunk.data as unknown as {
    buffer: ArrayBuffer
    byteOffset: number
    byteLength: number
  }
  return {
    promotedType: promoted.promotedType,
    textureBounds: promoted.textureBounds,
    data: dataView.buffer,
    byteOffset: dataView.byteOffset,
    byteLength: dataView.byteLength,
    shape: promoted.chunk.shape,
    stride: promoted.chunk.stride,
    timings: { decodeMs, reshapeMs, promoteMs },
  }
}

/** Buffers that must be TRANSFERRED (non-shared) — deduped by identity. */
function transferListOf(parts: (DecodedPartMessage | null)[]): ArrayBufferLike[] {
  const out: ArrayBufferLike[] = []
  for (const part of parts) {
    if (!part) continue
    const buffer = part.data
    if (typeof SharedArrayBuffer !== 'undefined' && buffer instanceof SharedArrayBuffer) continue
    if (!out.includes(buffer)) out.push(buffer)
  }
  return out
}

/** In-flight fetch/decode requests by id — the target of `cancel`. */
const inFlight = new Map<number, AbortController>()

function beginRequest(id: number): AbortSignal {
  const controller = new AbortController()
  inFlight.set(id, controller)
  return controller.signal
}

ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data

  if (msg.type === 'cancel') {
    // The request's own `finally` removes the entry; keeping it until then
    // lets the catch below tell an abort from a real failure.
    inFlight.get(msg.id)?.abort()
    return
  }

  try {
    if (msg.type === 'init') {
      metaByMetaId.set(msg.metaId, msg.meta)
      pipelineByMetaId.set(
        msg.metaId,
        create_codec_pipeline({
          data_type: msg.meta.data_type,
          shape: msg.meta.chunk_shape,
          codecs: msg.meta.codecs,
        }),
      )
      ctx.postMessage({ type: 'init_ok', id: msg.id })
      return
    }

    if (msg.type === 'fetch_decode') {
      const workerStartedAt = now()
      // Register a piggybacked meta (same effect as an `init` message).
      ensurePipeline(msg.metaId, msg.meta)
      getPipeline(msg.metaId)
      const signal = beginRequest(msg.id)
      const fetchStartedAt = now()
      const { bytes: rawBytes, transport } = await fetchChunkBytes(
        msg.store,
        msg.path,
        msg.requestInit,
        msg.timing === true,
        signal,
      )
      const fetchMs = now() - fetchStartedAt
      // Canceled while the bytes were in transit: the main thread already
      // dropped its pending entry, so decoding would only burn worker time.
      if (signal.aborted) return
      if (!rawBytes) {
        ctx.postMessage({
          type: 'fetch_decode_ok',
          id: msg.id,
          missing: true,
          timings: {
            fetchMs,
            decodeMs: 0,
            reshapeMs: 0,
            promoteMs: 0,
            totalMs: now() - workerStartedAt,
            ...transport,
          },
        })
        return
      }

      const part = await decodeOne(
        rawBytes,
        msg.metaId,
        msg.actualChunkShape,
        msg.textureFidelity ?? 'default',
        msg.useSharedArrayBuffer === true,
      )
      const message = {
        type: 'fetch_decoded' as const,
        id: msg.id,
        promotedType: part.promotedType,
        textureBounds: part.textureBounds,
        data: part.data,
        byteOffset: part.byteOffset,
        byteLength: part.byteLength,
        shape: part.shape,
        stride: part.stride,
        timings: {
          fetchMs,
          ...part.timings,
          totalMs: now() - workerStartedAt,
          ...transport,
        },
      }
      ctx.postMessage(message, transferListOf([part]))
      return
    }

    if (msg.type === 'fetch_decode_multi') {
      const workerStartedAt = now()
      ensurePipeline(msg.metaId, msg.meta)
      getPipeline(msg.metaId)
      const init = deserializeRequestInit(msg.requestInit) ?? {}
      const headers = new Headers(init.headers)
      headers.set('Range', `bytes=${msg.range.offset}-${msg.range.offset + msg.range.length - 1}`)
      const signal = beginRequest(msg.id)
      const fetchStartedAt = now()
      const { bytes: body, transport } = await fetchChunkBytes(
        msg.store,
        msg.path,
        {
          ...msg.requestInit,
          headers: Array.from(headers.entries()),
        },
        msg.timing === true,
        signal,
      )
      const fetchMs = now() - fetchStartedAt
      if (signal.aborted) return
      if (!body) {
        // The shard vanished between index read and chunk read: every part
        // is missing (fill) — the caller treats it like a 404 per chunk.
        ctx.postMessage({
          type: 'fetch_decoded_multi',
          id: msg.id,
          parts: msg.parts.map(() => null),
          timings: { fetchMs, totalMs: now() - workerStartedAt, ...transport },
        })
        return
      }
      const parts: (DecodedPartMessage | null)[] = []
      for (const part of msg.parts) {
        // A multi-part decode can be long; bail between parts once canceled.
        if (signal.aborted) return
        const start = part.offset - msg.range.offset
        const slice = body.subarray(start, start + part.length)
        if (slice.byteLength !== part.length) {
          throw new Error(
            `Coalesced read short: part at ${part.offset} wanted ${part.length} bytes, got ${slice.byteLength} (${msg.path})`,
          )
        }
        parts.push(
          await decodeOne(
            slice,
            msg.metaId,
            part.actualChunkShape,
            msg.textureFidelity ?? 'default',
            msg.useSharedArrayBuffer === true,
          ),
        )
      }
      ctx.postMessage(
        {
          type: 'fetch_decoded_multi',
          id: msg.id,
          parts,
          timings: { fetchMs, totalMs: now() - workerStartedAt, ...transport },
        },
        transferListOf(parts),
      )
      return
    }
  } catch (error) {
    // A canceled request's rejection is expected (its fetch was aborted) and
    // the main thread no longer listens for this id — stay silent.
    if (inFlight.get(msg.id)?.signal.aborted) return
    ctx.postMessage({
      type: 'init_ok',
      id: msg.id,
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    inFlight.delete(msg.id)
  }
}
