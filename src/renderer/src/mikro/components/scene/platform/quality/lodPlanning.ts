import type { DataType } from "zarrita";
import { mapDTypeToTextureBytes } from "@/core/data/zarr/indexing/dtype";
import {
  getRendererBudget,
  reportedDeviceMemoryGiB,
  writeRendererSettings,
} from "@/core/settings/renderer/rendererBudget";
import { BrickLayerFragment, ImageLayerFragment } from "../model/layerGuards";

/**
 * GPU volume-texture memory budgeting and default per-layer LOD assignment.
 * Extracted from `platform/stores/sceneStore.ts` so the store no longer owns this
 * concern — it just calls `planDefaultVolumeLods(brickLayers)` at construction.
 */

/**
 * Per-pool slot-budget FLOOR (atlas bytes AND the node plan's slot-byte budget —
 * they must agree so a plan always fits its pool).
 *
 * This was a hard CEILING (`MIN_LAYER_POOL_BYTES`), which meant a machine with a
 * 2 GiB device budget planned exactly as coarsely as one with 512 MiB: the flat
 * cap bound first and the device estimate was never consulted. On a
 * plane-chunked pyramid that pinned the LOD floor permanently — see
 * `resolvePoolBudget`. It is now the floor of a device-scaled share, so small
 * devices behave exactly as before and large ones get what they paid for.
 */
export const MIN_LAYER_POOL_BYTES = 128 * 1024 * 1024;

/**
 * The user's own whole-device volume budget, or null when it is automatic.
 *
 * A SETTING now (Settings → Renderer, `rendererGpuBudgetMB`), no longer a
 * `localStorage` key of the scene's own: it is derived from the detected
 * graphics card and overruled there — see `core/settings/renderer`.
 */
export function getVolumeBudgetOverrideBytes(): number | null {
  const budget = getRendererBudget();
  return budget.gpuSource.kind === "custom" ? budget.gpuBudgetBytes : null;
}

export function setVolumeBudgetOverrideMB(mb: number | null): void {
  writeRendererSettings({ rendererGpuBudgetMB: mb });
}

/**
 * GPU memory brick atlases may take, all pools together.
 *
 * Two consumers read this — the planner (`nodePlanTracker`) and the atlas
 * allocator (`ensurePool`) — and `maxPlanBytes = atlasBytes - headroom` is a
 * load-bearing coupling: if they saw different values a plan would be sized
 * for a pool that does not exist. Both read the ONE resolved value
 * `getRendererBudget` holds, so they cannot disagree; a change takes effect for
 * plans at the next replan and for atlases at the next pool creation.
 */
export function getInitialVolumeTextureBudgetBytes(): number {
  return getRendererBudget().gpuBudgetBytes;
}

/** Raw `navigator.deviceMemory`, for the debug report — the resolved budget
 * alone cannot distinguish "8 GiB machine" from "override set". */
export function getReportedDeviceMemoryGiB(): number | null {
  return reportedDeviceMemoryGiB();
}

function getSliceLength(
  axisLength: number,
  slice: ImageLayerFragment["lens"]["slices"][number] | undefined,
): number {
  const step = Math.max(1, slice?.step ?? 1);
  const start = Math.max(0, Math.min(axisLength, slice?.start ?? 0));
  const stop = Math.max(start, Math.min(axisLength, slice?.stop ?? axisLength));

  if (stop <= start) return 0;
  return Math.max(1, Math.ceil((stop - start) / step));
}

export function estimateLayerVolumeBytes(layer: BrickLayerFragment, lodIndex: number): number {
  const dataArray = layer.lens.dataset.dataArrays[lodIndex];
  if (!dataArray) return Number.POSITIVE_INFINITY;

  const dtype = dataArray.store.dtype;
  const bytesPerVoxel = dtype ? mapDTypeToTextureBytes(dtype as DataType) : 4;
  const sliceMap = layer.lens.slices.reduce<Record<string, ImageLayerFragment["lens"]["slices"][number]>>((acc, slice) => {
    acc[slice.axis] = slice;
    return acc;
  }, {});

  // The volume loader collapses every non-spatial axis (t, c, …) to a single
  // index, so only the x/y/z slice lengths contribute to texture memory.
  const renderAxes = layer.renderAxes;
  const spatialDims = new Set([renderAxes?.x, renderAxes?.y, renderAxes?.z].filter(Boolean));

  const selectedVoxelCount = dataArray.store.shape.reduce((total, axisLength, axisIndex) => {
    const dim = layer.lens.dataset.axisNames[axisIndex];
    if (!dim || !spatialDims.has(dim)) return total;
    return total * Math.max(getSliceLength(axisLength, sliceMap[dim]), 1);
  }, 1);

  return selectedVoxelCount * bytesPerVoxel;
}

/**
 * Assign each image layer a default volume LOD that keeps the total volume
 * texture memory within a device-derived budget (coarsest first, then greedily
 * upgrade the cheapest layers).
 */
export function planDefaultVolumeLods(brickLayers: readonly BrickLayerFragment[]): Map<string, number> {
  const budgetBytes = getInitialVolumeTextureBudgetBytes();
  const candidates = brickLayers
    .filter((layer) => layer.lens.dataset.dataArrays.length > 0)
    .map((layer) => ({
      layerId: layer.id,
      bytesByLod: layer.lens.dataset.dataArrays.map((_, lodIndex) =>
        estimateLayerVolumeBytes(layer, lodIndex),
      ),
    }));

  const chosenLods = new Map<string, number>();
  let usedBytes = 0;

  for (const candidate of candidates) {
    const coarsestLod = Math.max(0, candidate.bytesByLod.length - 1);
    chosenLods.set(candidate.layerId, coarsestLod);
    usedBytes += candidate.bytesByLod[coarsestLod] ?? 0;
  }

  while (true) {
    let bestUpgrade: { layerId: string; nextLod: number; addedBytes: number } | null = null;

    for (const candidate of candidates) {
      const currentLod = chosenLods.get(candidate.layerId);
      if (currentLod == null || currentLod <= 0) continue;

      const nextLod = currentLod - 1;
      const addedBytes = (candidate.bytesByLod[nextLod] ?? Number.POSITIVE_INFINITY) - (candidate.bytesByLod[currentLod] ?? 0);
      if (!Number.isFinite(addedBytes)) continue;
      if (usedBytes + addedBytes > budgetBytes) continue;

      if (!bestUpgrade || addedBytes < bestUpgrade.addedBytes) {
        bestUpgrade = { layerId: candidate.layerId, nextLod, addedBytes };
      }
    }

    if (!bestUpgrade) {
      break;
    }

    chosenLods.set(bestUpgrade.layerId, bestUpgrade.nextLod);
    usedBytes += bestUpgrade.addedBytes;
  }

  return chosenLods;
}
