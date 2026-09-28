import { describe, expect, it } from 'vitest'
import type { CodecMetadata } from 'zarrita'
import {
  MISSING_INNER_CHUNK,
  decodeShardIndex,
  encodedIndexByteLength,
  indexByteLength,
  indexRange,
  innerLinearIndex,
  lookupInnerChunk,
  rangeHeaderFor,
  resolveShardingLayout,
  shardCoordOf,
} from './sharding'

const bytesCodec: CodecMetadata = { name: 'bytes', configuration: { endian: 'little' } }
const crc32c: CodecMetadata = { name: 'crc32c' } as CodecMetadata

const shardedCodecs = (overrides: Record<string, unknown> = {}): CodecMetadata[] => [
  {
    name: 'sharding_indexed',
    configuration: {
      chunk_shape: [1, 64, 64, 64],
      codecs: [bytesCodec, { name: 'zstd', configuration: { level: 3 } }],
      index_codecs: [bytesCodec, crc32c],
      ...overrides,
    },
  } as CodecMetadata,
]

describe('resolveShardingLayout', () => {
  it('returns undefined for an unsharded codec chain', () => {
    expect(resolveShardingLayout([1, 256, 256, 256], [bytesCodec])).toBeUndefined()
    expect(resolveShardingLayout([1, 256, 256, 256], undefined)).toBeUndefined()
  })

  it('unwraps a sharding_indexed codec into inner shape, inner codecs, index grid', () => {
    const layout = resolveShardingLayout([1, 512, 512, 256], shardedCodecs())!
    expect(layout.innerChunkShape).toEqual([1, 64, 64, 64])
    expect(layout.indexShape).toEqual([1, 8, 8, 4])
    expect(layout.innerCodecs.map((c) => c.name)).toEqual(['bytes', 'zstd'])
    expect(layout.indexLocation).toBe('end')
  })

  it('honours index_location start', () => {
    const layout = resolveShardingLayout([64, 64], shardedCodecs({ chunk_shape: [32, 32], index_location: 'start' }))!
    expect(indexRange(layout)).toEqual({ offset: 0, length: 16 * 4 + 4 })
  })

  it('rejects non-integral shard/inner ratios and nested sharding', () => {
    expect(() => resolveShardingLayout([1, 100, 64, 64], shardedCodecs())).toThrow(/multiple/)
    expect(() =>
      resolveShardingLayout([1, 64, 64, 64], shardedCodecs({ codecs: shardedCodecs() })),
    ).toThrow(/nested/)
  })
})

describe('coordinate math', () => {
  const layout = resolveShardingLayout([1, 512, 512, 256], shardedCodecs())!

  it('maps inner chunk coords to the containing shard', () => {
    expect(shardCoordOf([0, 0, 0, 0], layout)).toEqual([0, 0, 0, 0])
    expect(shardCoordOf([0, 7, 8, 3], layout)).toEqual([0, 0, 1, 0])
    expect(shardCoordOf([3, 17, 9, 4], layout)).toEqual([3, 2, 1, 1])
  })

  it('linearises inner coords in C order within the shard', () => {
    expect(innerLinearIndex([0, 0, 0, 0], layout)).toBe(0)
    expect(innerLinearIndex([0, 0, 0, 3], layout)).toBe(3)
    expect(innerLinearIndex([0, 0, 1, 0], layout)).toBe(4)
    expect(innerLinearIndex([0, 1, 0, 0], layout)).toBe(32)
    // Wraps: inner [0, 9, 0, 0] sits in shard [0,1,0,0] at local y=1.
    expect(innerLinearIndex([0, 9, 0, 0], layout)).toBe(32)
    expect(innerLinearIndex([5, 7, 7, 3], layout)).toBe(8 * 8 * 4 - 1)
  })

  it('sizes the index (16 B per inner chunk, +4 per crc32c)', () => {
    expect(indexByteLength(layout)).toBe(16 * 256)
    expect(encodedIndexByteLength(layout)).toBe(16 * 256 + 4)
    expect(indexRange(layout)).toEqual({ suffixLength: 16 * 256 + 4 })
  })

  it('formats an inclusive byte range header', () => {
    expect(rangeHeaderFor({ offset: 100, length: 50 })).toBe('bytes=100-149')
  })
})

describe('index decode + lookup', () => {
  it('decodes a little-endian uint64 index and reports the missing sentinel', async () => {
    const layout = resolveShardingLayout([4, 4], shardedCodecs({ chunk_shape: [2, 2], index_codecs: [bytesCodec] }))!
    const raw = new BigUint64Array([
      0n, 100n, // inner 0
      100n, 250n, // inner 1
      MISSING_INNER_CHUNK, MISSING_INNER_CHUNK, // inner 2 absent
      350n, 7n, // inner 3
    ])
    const index = await decodeShardIndex(new Uint8Array(raw.buffer), layout)
    expect(lookupInnerChunk(index, 0)).toEqual({ offset: 0, length: 100 })
    expect(lookupInnerChunk(index, 1)).toEqual({ offset: 100, length: 250 })
    expect(lookupInnerChunk(index, 2)).toBe('missing')
    expect(lookupInnerChunk(index, 3)).toEqual({ offset: 350, length: 7 })
  })
})
