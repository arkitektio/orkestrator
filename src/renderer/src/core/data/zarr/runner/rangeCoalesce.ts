/**
 * Byte-range coalescing for sharded reads: several inner chunks of one shard
 * become one HTTP `Range` when they sit close together in the object. Pure.
 *
 * Rule (after zarr-python 3.3's `sharding_coalesce_*`): sort by offset, then
 * greedily extend the current run while the gap to the next range is at most
 * `maxGap` bytes and the merged span stays within `maxBytes`. Gap bytes are
 * fetched and discarded, so `maxGap` trades request count against wasted
 * bandwidth — small on S3 (billed per byte, cheap per request on HTTP/2).
 */

export interface RangeItem<T> {
  offset: number
  length: number
  item: T
}

export interface CoalescedRange<T> {
  offset: number
  length: number
  items: RangeItem<T>[]
}

export interface CoalesceOptions {
  /** Largest gap (bytes) between two ranges that is still bridged. */
  maxGap: number
  /** Largest merged span (bytes). */
  maxBytes: number
}

/**
 * Defaults tuned for 64³ uint16 inner chunks (~0.5 MB compressed each) against
 * the typical deployment: MinIO on the local network, where the scarce
 * resource is REQUESTS (HTTP/1.1 caps the browser at 6 connections per
 * origin), not bytes — 256 KB of discarded gap costs far less than another
 * queued round trip. Still caller-overridable per fetch.
 */
export const DEFAULT_COALESCE: CoalesceOptions = {
  maxGap: 256 * 1024,
  maxBytes: 8 * 1024 * 1024,
}

export interface DenseCoalesceOptions extends CoalesceOptions {
  /**
   * Whole-shard rule: when union(needed bytes) / span(min..max) reaches this,
   * ALL items merge into one run regardless of `maxGap`. A `maxGap`-sized span
   * is already bridged by the gap rule, so no separate small-span knob exists.
   */
  denseMergeDensity: number
  /** Dense merge applies only when the whole span fits under this cap. */
  denseMergeMaxBytes: number
}

/**
 * At density ≥ 0.5 the discarded gap bytes are at most the needed bytes while
 * one request replaces at least two — the same requests-over-bytes trade as
 * `DEFAULT_COALESCE`. The span cap reuses `maxBytes` so the worst-case bytes
 * per worker task (and per request) stay one story.
 */
export const DEFAULT_DENSE_COALESCE: DenseCoalesceOptions = {
  ...DEFAULT_COALESCE,
  denseMergeDensity: 0.5,
  denseMergeMaxBytes: DEFAULT_COALESCE.maxBytes,
}

export function coalesceRanges<T>(
  items: readonly RangeItem<T>[],
  options: CoalesceOptions = DEFAULT_COALESCE,
): CoalescedRange<T>[] {
  if (items.length === 0) return []
  const sorted = [...items].sort((a, b) => a.offset - b.offset)
  const out: CoalescedRange<T>[] = []
  let current: CoalescedRange<T> = {
    offset: sorted[0].offset,
    length: sorted[0].length,
    items: [sorted[0]],
  }
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    const currentEnd = current.offset + current.length
    const nextEnd = next.offset + next.length
    const gap = next.offset - currentEnd
    const mergedLength = Math.max(currentEnd, nextEnd) - current.offset
    if (gap <= options.maxGap && mergedLength <= options.maxBytes) {
      current.length = mergedLength
      current.items.push(next)
    } else {
      out.push(current)
      current = { offset: next.offset, length: next.length, items: [next] }
    }
  }
  out.push(current)
  return out
}

/**
 * `coalesceRanges` plus the whole-shard density rule: if the items cover at
 * least `denseMergeDensity` of their min..max span (union of intervals, so
 * overlaps don't inflate the ratio) and that span fits `denseMergeMaxBytes`,
 * fetch the whole span as ONE run. Otherwise identical to `coalesceRanges`.
 */
export function coalesceRangesDense<T>(
  items: readonly RangeItem<T>[],
  options: DenseCoalesceOptions = DEFAULT_DENSE_COALESCE,
): CoalescedRange<T>[] {
  if (items.length <= 1) return coalesceRanges(items, options)
  const sorted = [...items].sort((a, b) => a.offset - b.offset)
  const spanStart = sorted[0].offset
  let spanEnd = 0
  let needed = 0
  let coveredEnd = spanStart
  for (const range of sorted) {
    const end = range.offset + range.length
    if (end > spanEnd) spanEnd = end
    if (end > coveredEnd) {
      needed += end - Math.max(range.offset, coveredEnd)
      coveredEnd = end
    }
  }
  const span = spanEnd - spanStart
  if (span <= options.denseMergeMaxBytes && needed / span >= options.denseMergeDensity) {
    return [{ offset: spanStart, length: span, items: sorted }]
  }
  return coalesceRanges(sorted, options)
}
