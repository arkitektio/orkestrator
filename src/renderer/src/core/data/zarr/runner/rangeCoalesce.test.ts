import { describe, expect, it } from 'vitest'
import { coalesceRanges, coalesceRangesDense, type DenseCoalesceOptions } from './rangeCoalesce'

const r = (offset: number, length: number, item = `${offset}`) => ({ offset, length, item })

describe('coalesceRanges', () => {
  it('merges adjacent and near ranges within the gap, in offset order', () => {
    const out = coalesceRanges([r(200, 100), r(0, 100), r(100, 100), r(350, 50)], {
      maxGap: 64,
      maxBytes: 1 << 20,
    })
    expect(out.map((g) => [g.offset, g.length, g.items.map((i) => i.item)])).toEqual([
      [0, 400, ['0', '100', '200', '350']],
    ])
  })

  it('splits on a gap larger than maxGap', () => {
    const out = coalesceRanges([r(0, 100), r(1000, 100)], { maxGap: 64, maxBytes: 1 << 20 })
    expect(out).toHaveLength(2)
    expect(out[1]).toMatchObject({ offset: 1000, length: 100 })
  })

  it('splits when the merged span would exceed maxBytes', () => {
    const out = coalesceRanges([r(0, 600), r(600, 600), r(1200, 600)], {
      maxGap: 0,
      maxBytes: 1200,
    })
    expect(out.map((g) => g.items.length)).toEqual([2, 1])
  })

  it('handles overlapping ranges without shrinking the span', () => {
    const out = coalesceRanges([r(0, 100), r(50, 100)], { maxGap: 0, maxBytes: 1 << 20 })
    expect(out).toEqual([{ offset: 0, length: 150, items: [r(0, 100), r(50, 100)] }])
  })

  it('returns [] for no input', () => {
    expect(coalesceRanges([])).toEqual([])
  })
})

describe('coalesceRangesDense', () => {
  const opts = (over: Partial<DenseCoalesceOptions> = {}): DenseCoalesceOptions => ({
    maxGap: 64,
    maxBytes: 1 << 20,
    denseMergeDensity: 0.5,
    denseMergeMaxBytes: 1 << 20,
    ...over,
  })

  it('merges across gaps larger than maxGap when density reaches the threshold', () => {
    // Three 200-byte chunks over a 1000-byte span: density 0.6, gaps of 200 > maxGap 64.
    const items = [r(0, 200), r(400, 200), r(800, 200)]
    const out = coalesceRangesDense(items, opts())
    expect(out).toEqual([{ offset: 0, length: 1000, items }])
  })

  it('falls back to coalesceRanges below the density threshold', () => {
    const items = [r(0, 100), r(900, 100)]
    const out = coalesceRangesDense(items, opts())
    expect(out).toEqual(coalesceRanges(items, opts()))
    expect(out).toHaveLength(2)
  })

  it('falls back when the span exceeds denseMergeMaxBytes, even at density 1', () => {
    const items = [r(0, 500), r(500, 501)]
    const out = coalesceRangesDense(items, opts({ maxGap: 0, denseMergeMaxBytes: 1000 }))
    expect(out).toEqual(coalesceRanges(items, opts({ maxGap: 0 })))
  })

  it('measures density as the union of intervals, not the sum', () => {
    // Two fully-overlapping 300-byte ranges + a far 100-byte one over a 1000-byte
    // span: sum 700 (≥ 0.5·1000) but union 400 < 500 ⇒ no dense merge.
    const items = [r(0, 300), r(0, 300, 'dup'), r(900, 100)]
    const out = coalesceRangesDense(items, opts())
    expect(out).toHaveLength(2)
  })

  it('passes single and empty inputs through', () => {
    expect(coalesceRangesDense([])).toEqual([])
    expect(coalesceRangesDense([r(10, 5)])).toEqual([{ offset: 10, length: 5, items: [r(10, 5)] }])
  })
})
