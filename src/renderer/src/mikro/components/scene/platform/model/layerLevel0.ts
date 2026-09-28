import type { LayerState } from "./layerModel";

/**
 * A brick-backed layer's LEVEL-0 data array, and the coordinate system its
 * voxels live in.
 *
 * Shared because three callers need exactly this and must not disagree on it:
 * the attribute probe (whose `voxelIndex` is expressed in this frame, so the
 * server-resolved plan path has to start here), the resident sampler, and the
 * label colour LUT (which asks "which ARRAY-sampled plan is about MY mask?" and
 * answers it with this store's id).
 *
 * `dataArrays` is NOT ordered by level — the reduction is the only correct way to
 * find level 0.
 */
export const level0Of = (
  layer: LayerState,
): LayerState["lens"]["dataset"]["dataArrays"][number] | null =>
  layer.lens.dataset.dataArrays.reduce<
    LayerState["lens"]["dataset"]["dataArrays"][number] | null
  >((best, da) => (best === null || da.level < best.level ? da : best), null);

/**
 * The layer's level-0 coordinate system id — the frame a probe's `voxelIndex` and
 * a plan's path both start in. Falls back to the dataset's intrinsic system when
 * the array declares none.
 */
export const systemIdOf = (layer: LayerState): string | null =>
  level0Of(layer)?.coordinateSystem?.id ??
  layer.lens.dataset.intrinsicSystem?.id ??
  null;

/**
 * The zarr store holding the layer's level 0 — what identifies WHICH mask an
 * array-sampled attribute plan is about. A scene can hold several masks keyed
 * into one table, so this is the difference between reading this mask's rows and
 * another's.
 */
export const level0StoreIdOf = (layer: LayerState): string | null =>
  level0Of(layer)?.store?.id ?? null;
