import { describe, expect, it } from 'vitest'
import { nextDimIndex } from './DimPlayButton'

describe('nextDimIndex', () => {
  it('steps forward and loops at the end', () => {
    expect(nextDimIndex(0, 3)).toBe(1)
    expect(nextDimIndex(2, 3)).toBe(3)
    expect(nextDimIndex(3, 3)).toBe(0)
  })

  it('returns to the start from an index the dim no longer has', () => {
    expect(nextDimIndex(9, 3)).toBe(0)
    expect(nextDimIndex(-1, 3)).toBe(0)
    expect(nextDimIndex(0, 0)).toBe(0)
  })
})
