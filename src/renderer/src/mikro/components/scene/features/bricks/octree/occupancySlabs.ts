/**
 * Per-slab occupancy (`orkestrator.occPerSlab`) — the pure decisions.
 *
 * A pool's occupancy and aggregate sidecars are RG8 3D textures with the page
 * table's layout. With per-slab occupancy they carry `occSlabs` PLANES stacked
 * along the texture's own z (slab `s` of page texel `(x, y, z)` lives at
 * `(x, y, z + s · depth)`), one per atlas slab, so a multi-channel brick can be
 * skipped per channel instead of only when EVERY channel is dark.
 */

/** Slabs per sidecar plane set — bounded by the RG8 planes a page-table
 * depth can carry and by what a shader will plausibly read per step. */
export const MAX_OCC_SLABS = 8;

/**
 * How many occupancy planes a pool gets: one per slab when the flag is on
 * and the stacked sidecar still fits the 3D-texture extent, else ONE (the
 * union — exactly the pre-flag behaviour, byte-identical).
 */
export function occSlabCountFor(
  channelCount: number,
  layoutDepth: number,
  maxExtent: number,
  enabled: boolean,
): number {
  if (!enabled) return 1;
  if (!(channelCount > 1) || channelCount > MAX_OCC_SLABS) return 1;
  if (layoutDepth * channelCount > maxExtent) return 1;
  return channelCount;
}

export type Range = readonly [number, number];

/** Conservative union of finite ranges; null when none is finite. */
export function unionRanges(ranges: readonly Range[]): [number, number] | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const [lo, hi] of ranges) {
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) continue;
    if (lo < min) min = lo;
    if (hi > max) max = hi;
  }
  return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : null;
}

/**
 * The per-slab ranges a brick lands with, normalized to exactly `slabCount`
 * entries: a slab the scan never saw (non-finite) takes the UNION — the
 * conservative bracket — so a missing measurement can only ever under-skip.
 * Returns null when nothing finite was measured at all.
 */
export function normalizeSlabRanges(
  ranges: readonly Range[] | null | undefined,
  slabCount: number,
): [number, number][] | null {
  if (!ranges) return null;
  const union = unionRanges(ranges);
  if (!union) return null;
  const out: [number, number][] = [];
  for (let s = 0; s < slabCount; s++) {
    const range = ranges[s];
    out.push(
      range && Number.isFinite(range[0]) && Number.isFinite(range[1])
        ? [range[0], range[1]]
        : [union[0], union[1]],
    );
  }
  return out;
}
