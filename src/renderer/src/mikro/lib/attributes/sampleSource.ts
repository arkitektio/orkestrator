import type { HeldValue } from "./planExec";

/**
 * How a plan's field array gets sampled. Two implementations live in the
 * managers layer:
 *
 *  - a RESIDENT source, when the sample system is a rendered layer — reads
 *    the atlas CPU mirror synchronously (free on the hover path) and upgrades
 *    through the exact level-0 chunk read, the probe's own two-phase shape;
 *  - a ZARR source, when the field is not on screen — chunk fetches through
 *    the shared zarr worker + LRU, always async.
 *
 * `index` is the FULL array index in the sample system's axis order (from
 * `resolveSampleIndex`). Values stay `number | bigint` end-to-end: label ids
 * from a (Big)Int64 mask may exceed 2^53 and are lookup KEYS, so they must
 * never be forced through `Number()`.
 */
export interface SampleSource {
  /** Synchronous read; null = not resident / not supported by this source. */
  sampleSync(index: readonly number[]): HeldValue | null;
  /** Exact read (decoded chunk); null when unavailable or out of bounds. */
  sampleExact(index: readonly number[]): Promise<HeldValue | null>;
}

/** Read one element of a decoded chunk without losing bigint precision. */
export const readTypedValue = (
  data: ArrayLike<number> | ArrayLike<bigint>,
  offset: number,
): HeldValue | null => {
  const value = (data as ArrayLike<number | bigint>)[offset];
  if (value === undefined) return null;
  return value;
};
