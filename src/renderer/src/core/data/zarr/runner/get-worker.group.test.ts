import { describe, expect, it, vi } from 'vitest'
import type { ByteRange } from '@/core/data/zarr/store/types'
import { MISSING_INNER_CHUNK } from './sharding'

const workerFetchDecodeMulti = vi.hoisted(() => vi.fn())
const workerFetchDecode = vi.hoisted(() => vi.fn())
vi.mock('./worker-rpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./worker-rpc')>()),
  workerFetchDecodeMulti,
  workerFetchDecode,
}))

const { getChunkGroupWorker } = await import('./get-worker')

const encoder = new TextEncoder()
const bytes = { name: 'bytes', configuration: { endian: 'little' } }

/** 2 shards of 2×2 inner chunks over a 16×8 array (shard 8×8, inner 4×4). */
function shardedJson() {
  return {
    zarr_format: 3,
    node_type: 'array',
    shape: [16, 8],
    data_type: 'uint16',
    chunk_grid: { name: 'regular', configuration: { chunk_shape: [8, 8] } },
    chunk_key_encoding: { name: 'default', configuration: { separator: '/' } },
    fill_value: 0,
    codecs: [
      {
        name: 'sharding_indexed',
        configuration: { chunk_shape: [4, 4], codecs: [bytes], index_codecs: [bytes], index_location: 'end' },
      },
    ],
  }
}

/** Shard: 4 inner chunks — 0,1 contiguous at 0/100; 2 far away at 5000; 3 missing. */
function shardObject(): Uint8Array {
  const payload = new Uint8Array(6000)
  const index = new BigUint64Array([0n, 100n, 100n, 100n, 5000n, 100n, MISSING_INNER_CHUNK, MISSING_INNER_CHUNK])
  const out = new Uint8Array(payload.byteLength + index.byteLength)
  out.set(new Uint8Array(index.buffer), payload.byteLength)
  return out
}

function fakeArray(objects: Record<string, Uint8Array>) {
  const getRange = vi.fn(async (key: string, range: ByteRange) => {
    const body = objects[key]
    if (!body) return undefined
    return 'suffixLength' in range
      ? body.subarray(body.byteLength - range.suffixLength)
      : body.subarray(range.offset, range.offset + range.length)
  })
  const store = {
    url: 'mem://',
    get: vi.fn(async (key: string) => (key === '/zarr.json' ? encoder.encode(JSON.stringify(shardedJson())) : objects[key])),
    getRange,
    getWorkerFetchConfig: () => ({ accessKey: '', baseUrl: 'mem://', expiresAt: Infinity, region: '', secretKey: '', sessionToken: '', storeId: 's' }),
  }
  const arr = { store, path: '/', shape: [16, 8], chunks: [8, 8], dtype: 'uint16', resolve: (key: string) => ({ path: `/${key}` }) }
  return { arr: arr as never, getRange }
}

/** A pool that runs each task immediately on a dummy worker. */
const fakePool = {
  enqueue<T>(input: { task: (w: unknown) => Promise<{ worker: unknown; result: T }> }) {
    const promise = input.task({ terminate() {} } as unknown as Worker).then((r) => r.result)
    return { id: 0, promise, cancel: () => false, updatePriority: () => false }
  },
} as never

const chunkOf = (v: number) => ({ data: new Uint16Array(16).fill(v), shape: [4, 4], stride: [4, 1] })

describe('getChunkGroupWorker', () => {
  it('coalesces contiguous inner chunks of one shard into one multi task, keeps far ones single, fills missing', async () => {
    workerFetchDecodeMulti.mockReset()
    workerFetchDecode.mockReset()
    workerFetchDecodeMulti.mockImplementation(async (_w, _s, _p, _range, parts: unknown[]) => ({
      chunks: parts.map((_, i) => chunkOf(i + 1)),
      timings: { roundTripMs: 0, fetchMs: 0, totalWorkerMs: 0 },
    }))
    workerFetchDecode.mockImplementation(async () => ({ chunk: chunkOf(99), timings: { metaInitMs: 0, roundTripMs: 0, fetchMs: 0, decodeMs: 0, reshapeMs: 0, promoteMs: 0, totalWorkerMs: 0 } }))

    const { arr, getRange } = fakeArray({ '/c/0/0': shardObject() })
    const cache = new Map()
    let dispatched = 0
    const promises = getChunkGroupWorker(
      arr,
      [
        [0, 0], // inner 0 @0
        [0, 1], // inner 1 @100 — contiguous with 0
        [1, 0], // inner 2 @5000 — far → single
        [1, 1], // inner 3 — missing → fill
      ],
      { pool: fakePool, cache, useSharedArrayBuffer: true, textureFidelity: 'raw16', coalesce: { maxGap: 64, maxBytes: 1 << 20 }, onDispatch: (n) => (dispatched += n) },
    )
    expect(promises).toHaveLength(4)
    const chunks = await Promise.all(promises)

    // One coalesced task for [0,1], one single for [2], none for the fill.
    expect(workerFetchDecodeMulti).toHaveBeenCalledTimes(1)
    const [, , path, range, parts] = workerFetchDecodeMulti.mock.calls[0]
    expect(path).toBe('/c/0/0')
    expect(range).toEqual({ offset: 0, length: 200 })
    expect(parts.map((p: { offset: number }) => p.offset)).toEqual([0, 100])
    expect(workerFetchDecode).toHaveBeenCalledTimes(1)
    expect(dispatched).toBe(2)

    expect((chunks[0].data as Uint16Array)[0]).toBe(1)
    expect((chunks[1].data as Uint16Array)[0]).toBe(2)
    expect((chunks[2].data as Uint16Array)[0]).toBe(99)
    expect((chunks[3].data as Uint16Array)[0]).toBe(0) // fill
    expect(chunks[3].shape).toEqual([4, 4])
    // Index read once (suffix), never a whole-shard GET.
    expect(getRange.mock.calls.filter(([, r]) => 'suffixLength' in (r as object))).toHaveLength(1)
    // All four landed in the decoded-chunk cache under distinct keys.
    expect(cache.size).toBe(4)
  })

  it('serves cached chunks without any worker task', async () => {
    workerFetchDecodeMulti.mockReset()
    workerFetchDecode.mockReset()
    workerFetchDecodeMulti.mockImplementation(async (_w, _s, _p, _range, parts: unknown[]) => ({
      chunks: parts.map((_, i) => chunkOf(i + 1)),
      timings: { roundTripMs: 0, fetchMs: 0, totalWorkerMs: 0 },
    }))
    workerFetchDecode.mockImplementation(async () => ({ chunk: chunkOf(99), timings: { metaInitMs: 0, roundTripMs: 0, fetchMs: 0, decodeMs: 0, reshapeMs: 0, promoteMs: 0, totalWorkerMs: 0 } }))
    const { arr } = fakeArray({ '/c/0/0': shardObject() })
    const cache = new Map()
    await Promise.all(
      getChunkGroupWorker(arr, [[0, 0], [0, 1]], { pool: fakePool, cache, useSharedArrayBuffer: true, textureFidelity: 'raw16' }),
    )
    expect(workerFetchDecodeMulti).toHaveBeenCalledTimes(1)
    workerFetchDecodeMulti.mockClear()
    workerFetchDecode.mockClear()
    let dispatched = 0
    await Promise.all(
      getChunkGroupWorker(arr, [[0, 0], [0, 1]], { pool: fakePool, cache, useSharedArrayBuffer: true, textureFidelity: 'raw16', onDispatch: (n) => (dispatched += n) }),
    )
    expect(workerFetchDecodeMulti).not.toHaveBeenCalled()
    expect(workerFetchDecode).not.toHaveBeenCalled()
    expect(dispatched).toBe(0)
  })

  it('merges same-shard ranges ACROSS group calls issued in the same tick', async () => {
    workerFetchDecodeMulti.mockReset()
    workerFetchDecode.mockReset()
    workerFetchDecodeMulti.mockImplementation(async (_w, _s, _p, _range, parts: unknown[]) => ({
      chunks: parts.map((_, i) => chunkOf(i + 1)),
      timings: { roundTripMs: 0, fetchMs: 0, totalWorkerMs: 0 },
    }))
    workerFetchDecode.mockImplementation(async () => ({ chunk: chunkOf(99), timings: { metaInitMs: 0, roundTripMs: 0, fetchMs: 0, decodeMs: 0, reshapeMs: 0, promoteMs: 0, totalWorkerMs: 0 } }))

    const { arr } = fakeArray({ '/c/0/0': shardObject() })
    const cache = new Map()
    let dispatched = 0
    const shared = { pool: fakePool, cache, useSharedArrayBuffer: true, textureFidelity: 'raw16', coalesce: { maxGap: 64, maxBytes: 1 << 20 }, onDispatch: (n: number) => (dispatched += n) } as const
    // Call A holds inner 0 (@0) + far inner 2 (@5000); call B holds inner 1
    // (@100, contiguous with A's inner 0) + missing inner 3. Only a
    // cross-call merge can put 0 and 1 into one request.
    const callA = getChunkGroupWorker(arr, [[0, 0], [1, 0]], { ...shared })
    const callB = getChunkGroupWorker(arr, [[0, 1], [1, 1]], { ...shared })
    const [a, b] = await Promise.all([Promise.all(callA), Promise.all(callB)])

    expect(workerFetchDecodeMulti).toHaveBeenCalledTimes(1)
    const [, , path, range, parts] = workerFetchDecodeMulti.mock.calls[0]
    expect(path).toBe('/c/0/0')
    expect(range).toEqual({ offset: 0, length: 200 })
    expect(parts.map((p: { offset: number }) => p.offset)).toEqual([0, 100])
    expect(workerFetchDecode).toHaveBeenCalledTimes(1) // far inner 2 only
    expect(dispatched).toBe(2) // one merged request + one single, counted once across both calls

    expect((a[0].data as Uint16Array)[0]).toBe(1)
    expect((b[0].data as Uint16Array)[0]).toBe(2)
    expect((a[1].data as Uint16Array)[0]).toBe(99)
    expect((b[1].data as Uint16Array)[0]).toBe(0) // fill
  })

  it('does not merge calls with incompatible options (textureFidelity)', async () => {
    workerFetchDecodeMulti.mockReset()
    workerFetchDecode.mockReset()
    workerFetchDecodeMulti.mockImplementation(async (_w, _s, _p, _range, parts: unknown[]) => ({
      chunks: parts.map((_, i) => chunkOf(i + 1)),
      timings: { roundTripMs: 0, fetchMs: 0, totalWorkerMs: 0 },
    }))
    workerFetchDecode.mockImplementation(async () => ({ chunk: chunkOf(99), timings: { metaInitMs: 0, roundTripMs: 0, fetchMs: 0, decodeMs: 0, reshapeMs: 0, promoteMs: 0, totalWorkerMs: 0 } }))

    const { arr } = fakeArray({ '/c/0/0': shardObject() })
    const coalesce = { maxGap: 64, maxBytes: 1 << 20 }
    const callA = getChunkGroupWorker(arr, [[0, 0], [1, 0]], { pool: fakePool, cache: new Map(), useSharedArrayBuffer: true, textureFidelity: 'raw16', coalesce })
    const callB = getChunkGroupWorker(arr, [[0, 1], [1, 1]], { pool: fakePool, cache: new Map(), useSharedArrayBuffer: true, textureFidelity: 'default', coalesce })
    await Promise.all([...callA, ...callB])

    // No shared run: inner 0 and inner 1 stay in separate batches, so every
    // fetched chunk goes out as a single (0, 2 from A; 1 from B; 3 fills).
    expect(workerFetchDecodeMulti).not.toHaveBeenCalled()
    expect(workerFetchDecode).toHaveBeenCalledTimes(3)
  })

  it('enqueues a merged run at the max priority of its members', async () => {
    workerFetchDecodeMulti.mockReset()
    workerFetchDecode.mockReset()
    workerFetchDecodeMulti.mockImplementation(async (_w, _s, _p, _range, parts: unknown[]) => ({
      chunks: parts.map((_, i) => chunkOf(i + 1)),
      timings: { roundTripMs: 0, fetchMs: 0, totalWorkerMs: 0 },
    }))
    workerFetchDecode.mockImplementation(async () => ({ chunk: chunkOf(99), timings: { metaInitMs: 0, roundTripMs: 0, fetchMs: 0, decodeMs: 0, reshapeMs: 0, promoteMs: 0, totalWorkerMs: 0 } }))

    const priorities: (number | undefined)[] = []
    const recordingPool = {
      enqueue<T>(input: { priority?: number; task: (w: unknown) => Promise<{ worker: unknown; result: T }> }) {
        priorities.push(input.priority)
        const promise = input.task({ terminate() {} } as unknown as Worker).then((r) => r.result)
        return { id: 0, promise, cancel: () => false, updatePriority: () => false }
      },
    } as never

    const { arr } = fakeArray({ '/c/0/0': shardObject() })
    const cache = new Map()
    const coalesce = { maxGap: 64, maxBytes: 1 << 20 }
    // Low-priority call A carries inner 1 (@100) + far inner 2; high-priority
    // call B carries inner 0 (@0) + missing inner 3. The merged 0+1 run must
    // ride at B's priority.
    const callA = getChunkGroupWorker(arr, [[0, 1], [1, 0]], { pool: recordingPool, cache, useSharedArrayBuffer: true, textureFidelity: 'raw16', coalesce, priority: -1 })
    const callB = getChunkGroupWorker(arr, [[0, 0], [1, 1]], { pool: recordingPool, cache, useSharedArrayBuffer: true, textureFidelity: 'raw16', coalesce, priority: 5 })
    await Promise.all([...callA, ...callB])

    expect(workerFetchDecodeMulti).toHaveBeenCalledTimes(1)
    // Runs flush in offset order: the merged run (offset 0) at max(-1, 5),
    // then A's far single at its own -1.
    expect(priorities).toEqual([5, -1])
  })

  it('rejects without fetching when every member aborts before the flush', async () => {
    workerFetchDecodeMulti.mockReset()
    workerFetchDecode.mockReset()

    const { arr, getRange } = fakeArray({ '/c/0/0': shardObject() })
    const controllers = [new AbortController(), new AbortController()]
    const promises = getChunkGroupWorker(arr, [[0, 0], [0, 1]], {
      pool: fakePool,
      cache: new Map(),
      useSharedArrayBuffer: true,
      textureFidelity: 'raw16',
      coalesce: { maxGap: 64, maxBytes: 1 << 20 },
      signals: controllers.map((c) => c.signal),
    })
    // Let the index read resolve and the batch form, then abort both members
    // before the setTimeout(0) flush dispatches the run.
    await Promise.resolve()
    for (const c of controllers) c.abort()

    const settled = await Promise.allSettled(promises)
    expect(settled.map((s) => s.status)).toEqual(['rejected', 'rejected'])
    expect(workerFetchDecodeMulti).not.toHaveBeenCalled()
    expect(workerFetchDecode).not.toHaveBeenCalled()
    // Only the shard-index suffix read went out — never the payload range.
    expect(getRange.mock.calls.every(([, r]) => 'suffixLength' in (r as object))).toBe(true)
  })
})
