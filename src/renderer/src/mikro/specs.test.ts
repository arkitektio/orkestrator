// @vitest-environment jsdom
// (ArrayDatasetSpec is a runtime enum, and importing the generated `graphql.ts`
// pulls in the Apollo hooks barrel, which touches `window` on load)
import { describe, expect, it } from 'vitest'
import { ArrayDatasetSpec } from './api/graphql'
import {
  ADATASET_SPECS,
  arrayNbytes,
  baseDtypeOf,
  datasetNbytes,
  datasetStoredBytes,
  dtypeBytes,
  formatAxes,
  formatBytes,
  formatShape,
  modifierSpecsOf,
  spatialSpecOf,
  splitAxesBySpec,
  xyAspectOf
} from './specs'

describe('the spec catalogue', () => {
  it('covers every enum member exactly once', () => {
    const covered = ADATASET_SPECS.map((entry) => entry.spec).sort()
    expect(covered).toEqual(Object.values(ArrayDatasetSpec).sort())
  })

  it('gives every spec a unique slug', () => {
    const slugs = ADATASET_SPECS.map((entry) => entry.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('puts a spatialRank only on spatial specs, and never on HYPERVOLUME', () => {
    for (const entry of ADATASET_SPECS) {
      if (entry.kind === 'modifier') expect(entry.spatialRank).toBeUndefined()
    }
    // "four or more" does not pin a number, so it must stay unranked.
    expect(spatialSpecOf([ArrayDatasetSpec.Hypervolume])?.spatialRank).toBeUndefined()
  })
})

describe('spatialSpecOf', () => {
  it('finds the one spatial spec among stacked modifiers', () => {
    const spec = spatialSpecOf([
      ArrayDatasetSpec.Volume,
      ArrayDatasetSpec.Timeseries,
      ArrayDatasetSpec.Multichannel
    ])
    expect(spec?.spec).toBe(ArrayDatasetSpec.Volume)
  })

  it('is undefined for a dataset with no spec yet', () => {
    expect(spatialSpecOf([])).toBeUndefined()
    expect(spatialSpecOf(undefined)).toBeUndefined()
  })
})

describe('modifierSpecsOf', () => {
  it('returns modifiers in catalogue order, never the spatial spec', () => {
    const modifiers = modifierSpecsOf([
      ArrayDatasetSpec.Timeseries,
      ArrayDatasetSpec.Volume,
      ArrayDatasetSpec.Multichannel
    ]).map((entry) => entry.spec)
    expect(modifiers).toEqual([ArrayDatasetSpec.Multichannel, ArrayDatasetSpec.Timeseries])
  })
})

describe('splitAxesBySpec', () => {
  it('splits a 3D timelapse into acquisition and spatial axes', () => {
    const { acquisition, spatial } = splitAxesBySpec(
      ['t', 'c', 'z', 'y', 'x'],
      [20, 3, 8, 512, 512],
      [ArrayDatasetSpec.Volume, ArrayDatasetSpec.Timeseries, ArrayDatasetSpec.Multichannel]
    )
    expect(acquisition).toEqual([
      { name: 't', extent: 20 },
      { name: 'c', extent: 3 }
    ])
    expect(spatial).toEqual([
      { name: 'z', extent: 8 },
      { name: 'y', extent: 512 },
      { name: 'x', extent: 512 }
    ])
  })

  it('treats a plain image as all-spatial', () => {
    const { acquisition, spatial } = splitAxesBySpec(['y', 'x'], [512, 512], [ArrayDatasetSpec.Image])
    expect(acquisition).toEqual([])
    expect(spatial).toHaveLength(2)
  })

  it('gives a SCALAR no spatial axes', () => {
    const { acquisition, spatial } = splitAxesBySpec(
      ['t'],
      [100],
      [ArrayDatasetSpec.Scalar, ArrayDatasetSpec.Timeseries]
    )
    expect(spatial).toEqual([])
    expect(acquisition).toEqual([{ name: 't', extent: 100 }])
  })

  it('falls back to all-spatial when the rank is unknown', () => {
    const { acquisition, spatial } = splitAxesBySpec(
      ['a', 'b', 'c', 'd', 'e'],
      [1, 2, 3, 4, 5],
      [ArrayDatasetSpec.Hypervolume]
    )
    expect(acquisition).toEqual([])
    expect(spatial).toHaveLength(5)
  })

  it('falls back rather than split wrongly when the shape is shorter than the rank', () => {
    // A VOLUME claims 3 spatial axes; a 2-axis shape contradicts that, and
    // slicing at a negative boundary would silently mangle the readout.
    const { acquisition, spatial } = splitAxesBySpec(['y', 'x'], [512, 512], [ArrayDatasetSpec.Volume])
    expect(acquisition).toEqual([])
    expect(spatial).toHaveLength(2)
  })

  it("names an axis '?' when axisNames is shorter than shape", () => {
    const { spatial } = splitAxesBySpec(['y'], [512, 512], [ArrayDatasetSpec.Image])
    expect(spatial.map((axis) => axis.name)).toEqual(['y', '?'])
  })
})

describe('formatShape', () => {
  it('glues each extent to its axis', () => {
    expect(formatShape(['x', 'y', 'z'], [1024, 1024, 5])).toBe('1024x 1024y 5z')
  })

  it("marks an extent '?' when axisNames is shorter than shape", () => {
    expect(formatShape(['y'], [512, 512])).toBe('512y 512?')
  })

  it('ignores axis names the shape does not reach', () => {
    expect(formatShape(['t', 'y', 'x'], [512, 512])).toBe('512t 512y')
  })

  it('is empty for a scalar with no axes', () => {
    expect(formatShape([], [])).toBe('')
  })
})

describe('formatAxes', () => {
  it('reads a group of already-paired axes the same way formatShape does', () => {
    const axes = [
      { name: 'x', extent: 1024 },
      { name: 'y', extent: 1024 },
      { name: 'z', extent: 5 }
    ]
    expect(formatAxes(axes)).toBe(formatShape(['x', 'y', 'z'], [1024, 1024, 5]))
  })

  it('is empty for an empty group', () => {
    expect(formatAxes([])).toBe('')
  })

  /* The reason the helper exists: a caller splitting a group back into two
     parallel arrays can transpose them, and this pins the order. */
  it('puts the extent before the axis name', () => {
    expect(formatAxes([{ name: 'y', extent: 512 }])).toBe('512y')
  })
})

describe('baseDtypeOf', () => {
  const level = (n: number, dtype: string | null) => ({
    level: n,
    store: { dtype }
  })

  it('reads the base level, not the first element', () => {
    expect(baseDtypeOf([level(2, 'uint8'), level(0, 'uint16')])).toBe('uint16')
  })

  it('falls back to the first array when nothing is level 0', () => {
    expect(baseDtypeOf([level(1, 'float32')])).toBe('float32')
  })

  it('is undefined for no arrays, and for an array that has no dtype', () => {
    expect(baseDtypeOf([])).toBeUndefined()
    expect(baseDtypeOf([level(0, null)])).toBeUndefined()
  })
})

describe('dtypeBytes', () => {
  it('reads the width off the name, including the wide types', () => {
    expect(dtypeBytes('uint8')).toBe(1)
    expect(dtypeBytes('int16')).toBe(2)
    expect(dtypeBytes('float32')).toBe(4)
    expect(dtypeBytes('int64')).toBe(8)
    expect(dtypeBytes('complex128')).toBe(16)
  })

  it('stores bool as one byte per element', () => {
    expect(dtypeBytes('bool')).toBe(1)
  })

  it('is undefined for a missing or unreadable name', () => {
    expect(dtypeBytes(null)).toBeUndefined()
    expect(dtypeBytes(undefined)).toBeUndefined()
    expect(dtypeBytes('|u1')).toBeUndefined()
  })
})

describe('arrayNbytes and datasetNbytes', () => {
  const array = (shape: number[], dtype: string | null) => ({
    shape,
    store: { dtype }
  })

  it('multiplies element count by dtype width', () => {
    expect(arrayNbytes(array([512, 512], 'uint16'))).toBe(512 * 512 * 2)
  })

  it('sums every level of a pyramid', () => {
    expect(
      datasetNbytes([array([1024, 1024], 'uint8'), array([512, 512], 'uint8')])
    ).toBe(1024 * 1024 + 512 * 512)
  })

  it('refuses a partial sum when any level has an unreadable dtype', () => {
    expect(
      datasetNbytes([array([1024, 1024], 'uint8'), array([512, 512], null)])
    ).toBeUndefined()
  })

  it('is undefined for no arrays at all', () => {
    expect(datasetNbytes([])).toBeUndefined()
  })
})

describe('datasetStoredBytes', () => {
  const array = (sizeBytes: unknown) => ({ store: { sizeBytes } })

  it('sums the measured size of every level', () => {
    expect(datasetStoredBytes([array(1000), array(250)])).toBe(1250)
  })

  it('accepts ByteCount serialized as a numeric string', () => {
    expect(datasetStoredBytes([array('5000000000'), array(1)])).toBe(5000000001)
  })

  it('refuses a partial sum when any level is unmeasured', () => {
    expect(datasetStoredBytes([array(1000), array(null)])).toBeUndefined()
  })

  it('is undefined for no arrays at all', () => {
    expect(datasetStoredBytes([])).toBeUndefined()
  })
})

describe('formatBytes', () => {
  it('steps through binary-1024 units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(3 * 1024 ** 3)).toBe('3 GB')
  })

  it('stays in the top unit rather than inventing one past PB', () => {
    expect(formatBytes(1024 ** 6)).toBe('1024 PB')
  })
})

describe('xyAspectOf', () => {
  it('reads the aspect off the named axes, not their position', () => {
    expect(xyAspectOf(['t', 'c', 'y', 'x'], [10, 3, 512, 1024])).toBe(2)
    // The same plane with the spatial axes transposed must not flip the tile.
    expect(xyAspectOf(['x', 'y'], [1024, 512])).toBe(2)
  })

  it('falls back to square when either axis is unnamed', () => {
    expect(xyAspectOf(['a', 'b'], [1024, 512])).toBe(1)
    expect(xyAspectOf(['y'], [512])).toBe(1)
  })

  it('is square when the shape does not reach the named axis', () => {
    expect(xyAspectOf(['t', 'c', 'y', 'x'], [10, 3, 512])).toBe(1)
  })

  it('clamps a shape no tile could hold', () => {
    expect(xyAspectOf(['y', 'x'], [64, 4096])).toBe(3)
    expect(xyAspectOf(['y', 'x'], [4096, 64])).toBe(1 / 3)
  })
})
