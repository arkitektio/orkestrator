import {
  Box,
  Boxes,
  Clock,
  Hash,
  Image,
  Layers,
  LineChart,
  Waves,
  Zap,
  type LucideIcon
} from 'lucide-react'
import { ArrayDatasetSpec } from './api/graphql'

/**
 * The presentable form of ArrayDatasetSpec — what a dataset structurally IS, derived
 * server-side from the axes of its intrinsic coordinate system. One entry per
 * enum member, and the single source for both the sidebar sections and the
 * filtered list pages behind them.
 *
 * `kind` mirrors the schema's own split, and is not cosmetic: a dataset carries
 * exactly one SPATIAL spec (by its SPACE axis count) plus a MODIFIER per
 * acquisition axis present. So two spatial specs together match nothing, while
 * modifiers stack — VOLUME + TIMESERIES + MULTICHANNEL is one 3D timelapse.
 */
export type ArrayDatasetSpecKind = 'spatial' | 'modifier'

export type ArrayDatasetSpecEntry = {
  spec: ArrayDatasetSpec
  /** URL segment under /mikro/arraydatasets/spec/. */
  slug: string
  /** Plural, for a section listing many. */
  label: string
  /** Lowercase, for a badge on a card. */
  short: string
  description: string
  icon: LucideIcon
  kind: ArrayDatasetSpecKind
  /**
   * How many SPACE axes this spatial spec denotes. Undefined for a modifier, and
   * for HYPERVOLUME — "four or more" does not pin a number. Usable to split a
   * shape because RFC-5 orders axes time → channel/custom → space, so the
   * spatial axes are always the trailing `spatialRank` of them.
   */
  spatialRank?: number
}

/** Spatial first, in ascending rank, then the modifiers — the reading order the
 *  schema's own docs use, and the order the sidebar renders. */
export const ADATASET_SPECS: readonly ArrayDatasetSpecEntry[] = [
  {
    spec: ArrayDatasetSpec.Scalar,
    slug: 'scalar',
    short: 'scalar',
    label: 'Scalars',
    description: 'Datasets with no spatial extent: the array carries no SPACE axis at all.',
    icon: Hash,
    kind: 'spatial',
    spatialRank: 0
  },
  {
    spec: ArrayDatasetSpec.Profile,
    slug: 'profile',
    short: 'profile',
    label: 'Profiles',
    description: 'Datasets with one spatial axis — a line profile, a depth trace.',
    icon: LineChart,
    kind: 'spatial',
    spatialRank: 1
  },
  {
    spec: ArrayDatasetSpec.Image,
    slug: 'image',
    short: '2d',
    label: 'Images',
    description: 'Datasets with two spatial axes: a plane. The ordinary micrograph.',
    icon: Image,
    kind: 'spatial',
    spatialRank: 2
  },
  {
    spec: ArrayDatasetSpec.Volume,
    slug: 'volume',
    short: '3d',
    label: 'Volumes',
    description:
      'Datasets with three spatial axes: a stack. Holds whenever a z axis is present, even if it carries a single plane.',
    icon: Box,
    kind: 'spatial',
    spatialRank: 3
  },
  {
    spec: ArrayDatasetSpec.Hypervolume,
    slug: 'hypervolume',
    short: 'nd',
    label: 'Hypervolumes',
    description: 'Datasets with four or more spatial axes.',
    icon: Boxes,
    kind: 'spatial'
  },
  {
    spec: ArrayDatasetSpec.Multichannel,
    slug: 'multichannel',
    short: 'multichannel',
    label: 'Multichannel',
    description:
      'Datasets carrying a CHANNEL axis. Presence only: a one-channel axis still counts.',
    icon: Layers,
    kind: 'modifier'
  },
  {
    spec: ArrayDatasetSpec.Timeseries,
    slug: 'timeseries',
    short: 'timeseries',
    label: 'Timeseries',
    description:
      'Datasets carrying a TIME axis — a timelapse. Presence only: a single-frame time axis still counts.',
    icon: Clock,
    kind: 'modifier'
  },
  {
    spec: ArrayDatasetSpec.Spectral,
    slug: 'spectral',
    short: 'spectral',
    label: 'Spectral',
    description:
      'Datasets carrying a SPECTRUM axis: a spectrally resolved acquisition, a lambda stack.',
    icon: Waves,
    kind: 'modifier'
  },
  {
    spec: ArrayDatasetSpec.Flim,
    slug: 'flim',
    short: 'flim',
    label: 'FLIM',
    description: 'Datasets carrying a MICROTIME axis: fluorescence-lifetime arrival-time bins.',
    icon: Zap,
    kind: 'modifier'
  }
]

export const ADATASET_SPEC_BY_SLUG: Record<string, ArrayDatasetSpecEntry> = Object.fromEntries(
  ADATASET_SPECS.map((entry) => [entry.slug, entry])
)

export const arrayDatasetSpecLink = (slug: string) => `/mikro/arraydatasets/spec/${slug}`

export const ADATASET_SPEC_INFO = Object.fromEntries(
  ADATASET_SPECS.map((entry) => [entry.spec, entry])
) as Record<ArrayDatasetSpec, ArrayDatasetSpecEntry>

/**
 * The single spatial spec a dataset carries. Undefined only while its intrinsic
 * system does not exist yet — `spec` is empty then, and nothing structural is
 * known about it.
 */
export const spatialSpecOf = (specs: readonly ArrayDatasetSpec[] | undefined) =>
  specs?.map((spec) => ADATASET_SPEC_INFO[spec]).find((entry) => entry?.kind === 'spatial')

/** The acquisition modifiers a dataset carries, in catalogue order. */
export const modifierSpecsOf = (specs: readonly ArrayDatasetSpec[] | undefined) =>
  ADATASET_SPECS.filter((entry) => entry.kind === 'modifier' && specs?.includes(entry.spec))

export type ArrayDatasetAxis = { name: string; extent: number }

/**
 * Splits a shape into its acquisition axes and its spatial ones, using the
 * spatial spec's rank. Safe because RFC-5 pins the axis order (time, then
 * channel and custom, then space), so the spatial axes are the trailing ones.
 *
 * Falls back to treating every axis as spatial when the rank is unknown (a
 * HYPERVOLUME, or a dataset with no spec yet) or when the shape is shorter than
 * the rank claims — better to show the axes plainly than to split them wrongly.
 */
export const splitAxesBySpec = (
  axisNames: readonly string[],
  shape: readonly number[],
  specs: readonly ArrayDatasetSpec[] | undefined
): { acquisition: ArrayDatasetAxis[]; spatial: ArrayDatasetAxis[] } => {
  const axes: ArrayDatasetAxis[] = shape.map((extent, index) => ({
    name: axisNames[index] ?? '?',
    extent
  }))

  const rank = spatialSpecOf(specs)?.spatialRank
  if (rank === undefined || rank > axes.length) {
    return { acquisition: [], spatial: axes }
  }

  const boundary = axes.length - rank
  return { acquisition: axes.slice(0, boundary), spatial: axes.slice(boundary) }
}

// Promoted to `@/lib/arrays` (elektro reads shapes the same way); re-exported so
// mikro's callers keep their import.
export { formatShape } from '@/core/lib/arrays/formatShape'

/**
 * The same reading, for axes that have already been paired up — which is what
 * `splitAxesBySpec` hands back. Saves every caller splitting a group back into
 * two parallel arrays just to have `formatShape` zip them together again, and
 * removes the chance of transposing them on the way.
 */
export const formatAxes = (axes: readonly ArrayDatasetAxis[]): string =>
  axes.map((axis) => `${axis.extent}${axis.name}`).join(' ')

/**
 * The dtype the dataset is stored in, off the base level — a multiscale
 * pyramid's levels are the same array at different resolutions, so they share
 * one. `level` is a field, not a position, and the API does not promise the
 * arrays come back in order, so this looks level 0 up rather than taking
 * `[0]`; the first array is only the fallback for a set that has no level 0.
 */
export const baseDtypeOf = (
  dataArrays: readonly { level: number; store: { dtype?: string | null } }[]
): string | undefined =>
  (dataArrays.find((array) => array.level === 0) ?? dataArrays[0])?.store.dtype ?? undefined

/**
 * Storage bytes per element of a zarr dtype name (`uint8`, `float64`, …), read
 * off the bit width in the name so `int64` and `complex128` work without being
 * enumerated. `bool` stores one byte per element. Undefined for a name that
 * does not carry its width — the callers treat that as "size unknown" rather
 * than guessing.
 */
export const dtypeBytes = (dtype: string | null | undefined): number | undefined => {
  if (!dtype) return undefined
  if (dtype === 'bool') return 1
  const bits = /^(?:u?int|float|complex)(\d+)$/.exec(dtype)?.[1]
  return bits ? Number(bits) / 8 : undefined
}

type SizedArray = { shape: readonly number[]; store: { dtype?: string | null } }

/** Uncompressed bytes of one array: element count × dtype width. */
export const arrayNbytes = (array: SizedArray): number | undefined => {
  const width = dtypeBytes(array.store.dtype)
  if (width === undefined) return undefined
  return array.shape.reduce((total, extent) => total * extent, 1) * width
}

/**
 * Uncompressed bytes across every pyramid level — what the dataset costs to
 * hold, not what zarr's compression left on disk (the store does not report
 * that). Undefined as soon as ANY level's dtype is unreadable: a partial sum
 * shown as "the size" would be a plausible wrong number, which is worse than
 * no number.
 */
export const datasetNbytes = (dataArrays: readonly SizedArray[]): number | undefined => {
  let total = 0
  for (const array of dataArrays) {
    const nbytes = arrayNbytes(array)
    if (nbytes === undefined) return undefined
    total += nbytes
  }
  return dataArrays.length > 0 ? total : undefined
}

/**
 * Bytes the dataset actually holds on disk: the sum of every level's measured
 * `store.sizeBytes`, i.e. after compression — unlike `datasetNbytes`. The
 * `ByteCount` scalar may arrive as a numeric string, so it is coerced. Same
 * rule as `datasetNbytes`: undefined as soon as any level is unmeasured (older
 * stores never recorded it), never a partial sum.
 */
export const datasetStoredBytes = (
  dataArrays: readonly { store: { sizeBytes?: unknown } }[]
): number | undefined => {
  let total = 0
  for (const array of dataArrays) {
    const raw = array.store.sizeBytes
    if (raw === null || raw === undefined || raw === '') return undefined
    const bytes = Number(raw)
    if (!Number.isFinite(bytes)) return undefined
    total += bytes
  }
  return dataArrays.length > 0 ? total : undefined
}

/** `1.5 GB`-style rendering, binary-1024 steps like the file pages use. */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${units[i]}`
}

/**
 * How wide a plane is relative to how tall — `x / y`, for laying a tile out at
 * the shape of the thing it shows rather than in a square that crops it.
 *
 * Keyed on the axis NAMES, never on position. RFC-5 pins the order, but a
 * transposed tile reads as plausible rather than as broken, so a dataset that
 * does not name both axes gets the square fallback instead of a guess.
 *
 * Clamped, because the column width is fixed and the height follows from this:
 * a `64x 4096y` sliver would otherwise be a tile twenty screens tall, and its
 * transpose a few pixels of nothing. Wide enough to leave an ordinary
 * micrograph — anything up to 3:1 — at exactly its own shape.
 */
export const xyAspectOf = (
  axisNames: readonly string[],
  shape: readonly number[]
): number => {
  const extentOf = (name: string) => {
    const index = axisNames.findIndex((axis) => axis.toLowerCase() === name)
    return index >= 0 ? shape[index] : undefined
  }

  const x = extentOf('x')
  const y = extentOf('y')
  if (!x || !y) return 1

  return Math.min(Math.max(x / y, 1 / 3), 3)
}
