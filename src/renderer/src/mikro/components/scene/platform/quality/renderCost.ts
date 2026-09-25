import type { DataType } from "zarrita";
import { mapDTypeToTextureBytes } from "@/lib/zarr/indexing/dtype";
import { estimateLayerVolumeBytes } from "./lodPlanning";
import type { ImageLayerFragment } from "../model/layerGuards";

/**
 * Predictable per-layer render-cost estimation (GPU texture bytes as a
 * deterministic function of dtype + shape + display mode) and the byte-budget
 * layer selection that replaces the old fixed "first 10 layers" display cap.
 */

/** Matches ChunkPlane's MAX_CHANNELS — more channels never upload. */
const MAX_INTENSITY_CHANNELS = 16;

/**
 * Viewport-limited loading bounds a 2D layer's resident detail textures by
 * the screen, not the image: cap the detail estimate at a 4096² viewport's
 * worth of voxels (per channel), so a gigapixel slide costs a bounded amount
 * instead of being culled outright.
 */
const VIEWPORT_DETAIL_VOXELS = 4096 * 4096;

type CostLayer = ImageLayerFragment & {
  fixedLOD?: number | null;
  defaultVolumeLOD?: number | null;
};

const axisLength = (layer: CostLayer, lodIndex: number, dim: string | null | undefined): number => {
  if (!dim) return 1;
  const position = layer.lens.dataset.axisNames.indexOf(dim);
  if (position === -1) return 1;
  return layer.lens.dataset.dataArrays[lodIndex]?.store.shape[position] ?? 1;
};

const bytesPerVoxel = (layer: CostLayer, lodIndex: number): number => {
  const dtype = layer.lens.dataset.dataArrays[lodIndex]?.store.dtype;
  return dtype ? mapDTypeToTextureBytes(dtype as DataType) : 4;
};

/** Full x×y×intensity slice bytes at a pyramid level (non-spatial axes count 1). */
const sliceBytesAtLevel = (layer: CostLayer, lodIndex: number): number => {
  const renderAxes = layer.lens.renderAxes;
  const intensityLength = Math.min(
    MAX_INTENSITY_CHANNELS,
    Math.max(1, axisLength(layer, lodIndex, renderAxes?.intensity)),
  );
  return (
    axisLength(layer, lodIndex, renderAxes?.x) *
    axisLength(layer, lodIndex, renderAxes?.y) *
    intensityLength *
    bytesPerVoxel(layer, lodIndex)
  );
};

/** Mirror of VolumeLayer's resolvedVolumeLod. */
const resolveVolumeLod = (layer: CostLayer): number => {
  const maxLod = Math.max(0, layer.lens.dataset.dataArrays.length - 1);
  return (
    [layer.fixedLOD, layer.defaultVolumeLOD].find(
      (lod) => typeof lod === "number" && lod >= 0 && lod <= maxLod,
    ) ?? maxLod
  );
};

/**
 * Estimated resident GPU texture bytes for an image layer in the given
 * display mode. Deterministic in the layer's dtype, shape and pyramid.
 */
export function estimateImageLayerRenderCostBytes(layer: CostLayer, mode: "2D" | "3D"): number {
  const numLevels = layer.lens.dataset.dataArrays.length;
  if (numLevels === 0) return 0;

  if (mode === "3D") {
    const bytes = estimateLayerVolumeBytes(layer, resolveVolumeLod(layer));
    return Number.isFinite(bytes) ? bytes : 0;
  }

  // 2D: viewport-capped detail at the finest level, plus — for pyramids —
  // the coarsest level's full slice (always resident as the pan backdrop).
  const intensityLength = Math.min(
    MAX_INTENSITY_CHANNELS,
    Math.max(1, axisLength(layer, 0, layer.lens.renderAxes?.intensity)),
  );
  const detailCap = VIEWPORT_DETAIL_VOXELS * intensityLength * bytesPerVoxel(layer, 0);
  const detailBytes = Math.min(sliceBytesAtLevel(layer, 0), detailCap);
  const backdropBytes = numLevels > 1 ? sliceBytesAtLevel(layer, numLevels - 1) : 0;

  return detailBytes + backdropBytes;
}

export type LayerBudgetSelection<T> = {
  displayed: T[];
  culled: T[];
  usedBytes: number;
};

/**
 * Greedy in-order selection: admit layers while the accumulated cost fits the
 * budget and the draw-call backstop isn't hit. The first layer is always
 * admitted (never render an empty scene). Later cheaper layers may still fit
 * after an expensive one was culled — predictable beats knapsack-optimal.
 */
export function selectLayersWithinBudget<T extends { id: string; costBytes: number }>(
  entries: readonly T[],
  budgetBytes: number,
  maxLayers: number,
): LayerBudgetSelection<T> {
  const displayed: T[] = [];
  const culled: T[] = [];
  let usedBytes = 0;

  for (const entry of entries) {
    const isFirst = displayed.length === 0 && culled.length === 0;
    const fitsBudget = usedBytes + entry.costBytes <= budgetBytes;
    const fitsCount = displayed.length < maxLayers;

    if (isFirst || (fitsBudget && fitsCount)) {
      displayed.push(entry);
      usedBytes += entry.costBytes;
    } else {
      culled.push(entry);
    }
  }

  return { displayed, culled, usedBytes };
}
