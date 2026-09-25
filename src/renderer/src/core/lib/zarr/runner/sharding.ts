/**
 * Zarr v3 `sharding_indexed` (ZEP 2) — pure helpers.
 *
 * A shard is one storage object holding a C-order grid of fixed-size INNER
 * chunks plus an index of `(offset, nbytes)` uint64 pairs (one per inner
 * chunk) that lives at the end (default) or start of the object. An inner
 * chunk whose pair is `(2^64-1, 2^64-1)` is absent — it holds the fill value.
 *
 * The renderer treats INNER chunks as "the chunks" everywhere (planner, cache
 * keys, edge shapes); shard coordinates only appear when a key is built. This
 * module is the only place the spec's byte layout is known. Mirrors zarrita's
 * `create_sharded_chunk_getter` (node_modules/zarrita/dist/src/codecs/sharding.js).
 */

import type { CodecMetadata } from 'zarrita'
import { create_codec_pipeline } from './internals/codec-pipeline'

export const SHARDING_CODEC_NAME = 'sharding_indexed'

/** `2^64 - 1`: the spec's "inner chunk not present" sentinel. */
export const MISSING_INNER_CHUNK = 0xffffffffffffffffn

export type ShardIndexLocation = 'start' | 'end'

export interface ShardingLayout {
  /** Outer chunk (= storage object) shape, from `chunk_grid.configuration.chunk_shape`. */
  shardShape: number[]
  /** Inner chunk shape, from the sharding codec's `chunk_shape`. */
  innerChunkShape: number[]
  /** `shardShape / innerChunkShape` per axis — the index grid. */
  indexShape: number[]
  /** Codec chain applied to each inner chunk. */
  innerCodecs: CodecMetadata[]
  /** Codec chain applied to the index (`bytes` + optional `crc32c`). */
  indexCodecs: CodecMetadata[]
  indexLocation: ShardIndexLocation
}

interface ShardingCodecConfig {
  chunk_shape: number[]
  codecs: CodecMetadata[]
  index_codecs: CodecMetadata[]
  index_location?: ShardIndexLocation
}

/**
 * Detect and unwrap a `sharding_indexed` outer codec. Returns `undefined` for
 * unsharded arrays. Throws on layouts the renderer cannot serve (non-integral
 * shard/inner ratio, nested sharding).
 */
export function resolveShardingLayout(
  shardShape: number[],
  codecs: CodecMetadata[] | undefined,
): ShardingLayout | undefined {
  const outer = codecs?.[0]
  if (!outer || outer.name !== SHARDING_CODEC_NAME) return undefined
  if (codecs && codecs.length > 1) {
    throw new Error(
      `[zarr sharding] '${SHARDING_CODEC_NAME}' must be the only top-level codec (got ${codecs.length})`,
    )
  }
  const cfg = outer.configuration as unknown as ShardingCodecConfig | undefined
  if (!cfg || !Array.isArray(cfg.chunk_shape) || !Array.isArray(cfg.codecs)) {
    throw new Error(`[zarr sharding] malformed '${SHARDING_CODEC_NAME}' configuration`)
  }
  if (cfg.chunk_shape.length !== shardShape.length) {
    throw new Error(
      `[zarr sharding] inner chunk rank ${cfg.chunk_shape.length} != shard rank ${shardShape.length}`,
    )
  }
  if (cfg.codecs.some((c) => c.name === SHARDING_CODEC_NAME)) {
    throw new Error('[zarr sharding] nested sharding is not supported')
  }
  const indexShape = shardShape.map((s, i) => {
    const inner = cfg.chunk_shape[i]
    if (!(inner > 0) || s % inner !== 0) {
      throw new Error(
        `[zarr sharding] shard shape ${JSON.stringify(shardShape)} is not a multiple of inner chunk shape ${JSON.stringify(cfg.chunk_shape)}`,
      )
    }
    return s / inner
  })
  const indexLocation = cfg.index_location ?? 'end'
  if (indexLocation !== 'start' && indexLocation !== 'end') {
    throw new Error(`[zarr sharding] unknown index_location '${String(indexLocation)}'`)
  }
  return {
    shardShape: [...shardShape],
    innerChunkShape: [...cfg.chunk_shape],
    indexShape,
    innerCodecs: cfg.codecs,
    indexCodecs: cfg.index_codecs ?? [{ name: 'bytes', configuration: { endian: 'little' } }],
    indexLocation,
  }
}

/** Shard (outer chunk) coordinate containing an inner chunk coordinate. */
export function shardCoordOf(inner: readonly number[], layout: ShardingLayout): number[] {
  return inner.map((c, i) => Math.floor(c / layout.indexShape[i]))
}

/** C-order position of an inner chunk within its shard's index grid. */
export function innerLinearIndex(inner: readonly number[], layout: ShardingLayout): number {
  let linear = 0
  for (let i = 0; i < inner.length; i++) {
    linear = linear * layout.indexShape[i] + (inner[i] % layout.indexShape[i])
  }
  return linear
}

/** Bytes of the DECODED index: 16 per inner chunk. */
export function indexByteLength(layout: ShardingLayout): number {
  return 16 * layout.indexShape.reduce((a, b) => a * b, 1)
}

/**
 * Bytes of the ENCODED index as stored — the decoded size plus 4 for each
 * `crc32c` in the index codec chain. This is what the ranged read must cover.
 */
export function encodedIndexByteLength(layout: ShardingLayout): number {
  const checksums = layout.indexCodecs.filter((c) => c.name === 'crc32c').length
  return indexByteLength(layout) + 4 * checksums
}

/** The byte range of the index inside the shard object. */
export function indexRange(
  layout: ShardingLayout,
): { offset: number; length: number } | { suffixLength: number } {
  const length = encodedIndexByteLength(layout)
  return layout.indexLocation === 'start' ? { offset: 0, length } : { suffixLength: length }
}

/**
 * Decode the raw index bytes through the index codec chain into the flat
 * `[..., 2]` uint64 grid. Runs `crc32c` verification when present.
 */
export async function decodeShardIndex(
  bytes: Uint8Array,
  layout: ShardingLayout,
): Promise<BigUint64Array> {
  const pipeline = create_codec_pipeline<'uint64'>({
    data_type: 'uint64',
    shape: [...layout.indexShape, 2],
    codecs: layout.indexCodecs,
  })
  // A suffix read (or a locally sliced whole-object response) can be a view at
  // an arbitrary byte offset; `BigUint64Array` needs 8-byte alignment.
  const aligned = bytes.byteOffset % 8 === 0 ? bytes : bytes.slice()
  const chunk = await pipeline.decode(aligned)
  const data = chunk.data as unknown as BigUint64Array
  if (!(data instanceof BigUint64Array)) {
    throw new Error('[zarr sharding] index did not decode to uint64')
  }
  return data
}

export type InnerChunkLocation = { offset: number; length: number } | 'missing'

/** Look an inner chunk up in a decoded index. */
export function lookupInnerChunk(index: BigUint64Array, linear: number): InnerChunkLocation {
  const offset = index[linear * 2]
  const length = index[linear * 2 + 1]
  if (offset === MISSING_INNER_CHUNK && length === MISSING_INNER_CHUNK) return 'missing'
  if (offset > BigInt(Number.MAX_SAFE_INTEGER) || length > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('[zarr sharding] inner chunk offset/length exceeds 2^53')
  }
  return { offset: Number(offset), length: Number(length) }
}

/** HTTP `Range` header value for an inner chunk. */
export function rangeHeaderFor(location: { offset: number; length: number }): string {
  return `bytes=${location.offset}-${location.offset + location.length - 1}`
}
