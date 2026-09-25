/**
 * Pure viewport-driven load planning for the 2D plane path: turn the
 * per-layer visible voxel ranges reported by `VisibilityManager`
 * (`viewerStore.layerViewRanges`) into narrowed zarr slice selections and an
 * LOD choice, so chunks outside the viewport are never generated or fetched.
 */

export type VoxelRange = [number, number];

/** Fraction of the visible extent prefetched on each side of the viewport. */
export const PREFETCH_MARGIN = 0.25;

/**
 * The 3D twin of `PREFETCH_MARGIN`: how far a node's own box is grown, as a
 * fraction of its extent per axis, before the camera-frustum test.
 *
 * The frustum test is geometrically EXACT — a ray only ever samples inside the
 * frustum, so an undilated test culls nothing that is being drawn *this* frame.
 * What it lacks is HYSTERESIS. A node straddling a side plane flips
 * visible↔culled on sub-pixel camera motion, and each flip evicts its brick and
 * refetches it a frame or two later, which reads as flicker along the edges of
 * the viewport while orbiting or panning.
 *
 * Growing the node rather than the frustum keeps the margin scale-free and
 * costs no plane math: a coarse node (which is expensive to refetch and covers
 * more screen) gets a proportionally larger margin than a fine one. Nodes that
 * survive only because of this margin are tagged `fetchBand: 2`, exactly as the
 * 2D margin's are, so they are fetched LAST and never delay a visible brick.
 */
export const FRUSTUM_CULL_MARGIN = 0.25;

/** Expand a voxel range by a fraction of its extent on each side. */
export function expandVoxelRange(range: VoxelRange, marginFraction: number): VoxelRange {
  const extent = Math.max(0, range[1] - range[0]);
  const margin = extent * marginFraction;
  return [range[0] - margin, range[1] + margin];
}

/**
 * Convert a base-resolution voxel range to a level-resolution `{start, stop}`
 * slice, intersected with the axis' configured slice (level coords, matching
 * how `PlaneLayer` already applies `lens.slices` per level). Returns null when
 * nothing of the axis is visible at this level.
 */
export function viewRangeToLevelSlice(
  baseRange: VoxelRange,
  levelScaleFactor: number,
  axisLength: number,
  baseSlice?: { start?: number | null; stop?: number | null } | null,
): { start: number; stop: number } | null {
  const factor = levelScaleFactor > 0 ? levelScaleFactor : 1;
  const sliceStart = Math.max(0, baseSlice?.start ?? 0);
  const sliceStop = Math.min(axisLength, baseSlice?.stop ?? axisLength);

  const start = Math.max(sliceStart, Math.floor(baseRange[0] / factor));
  const stop = Math.min(sliceStop, Math.ceil(baseRange[1] / factor));

  if (stop <= start) return null;
  return { start, stop };
}

/**
 * Pick the finest (lowest) LOD whose voxels still cover >= 1 screen pixel —
 * anything finer fetches detail the screen cannot show. When even the finest
 * level is below a pixel everywhere (zoomed far out), pick the coarsest.
 *
 * @param pxPerBaseVoxel screen pixels covered by one base-resolution voxel
 *   (`layerViewRanges[id].scale`).
 * @param levelScaleFactors per-level downsampling factor along x (1, 2, 4, …).
 * @param lodBias multiplier on the 1 px/voxel threshold; < 1 tolerates
 *   blockier levels (fewer fetches), > 1 demands finer ones.
 */
export function chooseLodForScale(
  pxPerBaseVoxel: number,
  levelScaleFactors: number[],
  lodBias = 1,
): number {
  if (levelScaleFactors.length === 0) return 0;

  for (let level = 0; level < levelScaleFactors.length; level++) {
    if (pxPerBaseVoxel * levelScaleFactors[level] * lodBias >= 1) {
      return level;
    }
  }
  return levelScaleFactors.length - 1;
}
