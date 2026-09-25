import { describe, expect, it, vi } from 'vitest'
import type { ByteRange } from '@/core/lib/zarr/store/types'
import {
  effectiveChunkShapeOf,
  readArrayMetadataCached,
  resolveChunkLocation,
} from './get-worker'
import { MISSING_INNER_CHUNK } from './sharding'

const encoder = new TextEncoder()

/** A fake store + array pair that answers zarr.json and ranged reads from memory. */
function fakeArray(zarrJson: object, objects: Record<string, Uint8Array>) {
  const getRange = vi.fn(async (key: string, range: ByteRange) => {
    const body = objects[key]
    if (!body) return undefined
    return 'suffixLength' in range
      ? body.subarray(body.byteLength - range.suffixLength)
      : body.subarray(range.offset, range.offset + range.length)
  })
  const get = vi.fn(async (key: string) =>
    key === '/zarr.json' ? encoder.encode(JSON.stringify(zarrJson)) : objects[key],
  )
  const store = { url: 'mem://', get, getRange }
  const arr = {
    store,
    path: '/',
    shape: (zarrJson as { shape: number[] }).shape,
    chunks: (zarrJson as { chunk_grid: { configuration: { chunk_shape: number[] } } }).chunk_grid
      .configuration.chunk_shape,
    dtype: 'uint16',
    resolve: (key: string) => ({ path: `/${key}` }),
  }
  return { arr: arr as never, store, getRange, get }
}

const bytes = { name: 'bytes', configuration: { endian: 'little' } }

function shardedJson(shape = [16, 16], shard = [8, 8], inner = [4, 4]) {
  return {
    zarr_format: 3,
    node_type: 'array',
    shape,
    data_type: 'uint16',
    chunk_grid: { name: 'regular', configuration: { chunk_shape: shard } },
    chunk_key_encoding: { name: 'default', configuration: { separator: '/' } },
    fill_value: 0,
    codecs: [
      {
        name: 'sharding_indexed',
        configuration: {
          chunk_shape: inner,
          codecs: [bytes],
          index_codecs: [bytes],
          index_location: 'end',
        },
      },
    ],
  }
}

/** A shard object: arbitrary payload followed by a 2×2 index with inner #3 missing. */
function shardObject(): Uint8Array {
  const payload = new Uint8Array(300)
  const index = new BigUint64Array([
    0n, 100n,
    100n, 100n,
    200n, 100n,
    MISSING_INNER_CHUNK, MISSING_INNER_CHUNK,
  ])
  const out = new Uint8Array(payload.byteLength + index.byteLength)
  out.set(payload, 0)
  out.set(new Uint8Array(index.buffer), payload.byteLength)
  return out
}

describe('sharded array metadata', () => {
  it('unwraps sharding into inner chunk shape + inner codecs and exposes the effective chunk shape', async () => {
    const { arr } = fakeArray(shardedJson(), {})
    const meta = await readArrayMetadataCached(arr)
    expect(meta.sharding?.shardShape).toEqual([8, 8])
    expect(meta.codecMeta.chunk_shape).toEqual([4, 4])
    expect(meta.codecMeta.codecs).toEqual([bytes])
    expect(effectiveChunkShapeOf(arr)).toEqual([4, 4])
  })

  it('leaves an unsharded array untouched', async () => {
    const json = { ...shardedJson(), codecs: [bytes] }
    const { arr } = fakeArray(json, {})
    const meta = await readArrayMetadataCached(arr)
    expect(meta.sharding).toBeUndefined()
    expect(meta.codecMeta.chunk_shape).toEqual([8, 8])
    expect(effectiveChunkShapeOf(arr)).toEqual([8, 8])
  })
})

describe('resolveChunkLocation', () => {
  it('unsharded: whole-object path, no range', async () => {
    const { arr } = fakeArray({ ...shardedJson(), codecs: [bytes] }, {})
    const meta = await readArrayMetadataCached(arr)
    const loc = await resolveChunkLocation(arr, meta, [1, 0])
    expect(loc).toMatchObject({ chunkPath: '/c/1/0', missing: false })
    expect(loc.range).toBeUndefined()
  })

  it('sharded: one index read per shard, a Range per inner chunk, missing sentinel → fill', async () => {
    const { arr, getRange } = fakeArray(shardedJson(), { '/c/0/1': shardObject() })
    const meta = await readArrayMetadataCached(arr)

    // Inner chunks [0,2],[0,3],[1,2],[1,3] all live in shard [0,1].
    const a = await resolveChunkLocation(arr, meta, [0, 2])
    const b = await resolveChunkLocation(arr, meta, [0, 3])
    const c = await resolveChunkLocation(arr, meta, [1, 2])
    const d = await resolveChunkLocation(arr, meta, [1, 3])

    expect(a).toMatchObject({ chunkPath: '/c/0/1', range: { offset: 0, length: 100 }, missing: false })
    expect(b.range).toEqual({ offset: 100, length: 100 })
    expect(c.range).toEqual({ offset: 200, length: 100 })
    expect(d).toMatchObject({ missing: true })
    expect(d.range).toBeUndefined()

    // Distinct cache keys per inner chunk, sharing the shard half.
    expect(new Set([a.cacheKey, b.cacheKey, c.cacheKey, d.cacheKey]).size).toBe(4)
    expect(a.cacheKey).toContain('c/0/1/0')

    // The index was read exactly once (suffix), never a whole-shard GET.
    expect(getRange).toHaveBeenCalledTimes(1)
    expect(getRange.mock.calls[0][1]).toEqual({ suffixLength: 64 })
  })

  it('sharded: a 404 shard makes every inner chunk fill', async () => {
    const { arr } = fakeArray(shardedJson(), {})
    const meta = await readArrayMetadataCached(arr)
    expect((await resolveChunkLocation(arr, meta, [3, 3])).missing).toBe(true)
  })
})
