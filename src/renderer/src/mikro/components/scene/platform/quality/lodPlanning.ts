import type { DataType } from "zarrita";
import { mapDTypeToTextureBytes } from "@/lib/zarr/indexing/dtype";
import { BrickLayerFragment, ImageLayerFragment } from "../model/layerGuards";

/**
 * GPU volume-texture memory budgeting and default per-layer LOD assignment.
 * Extracted from `platform/stores/sceneStore.ts` so the store no longer owns this
 * concern — it just calls `planDefaultVolumeLods(brickLayers)` at construction.
 */

const DEFAULT_VOLUME_TEXTURE_BUDGET_BYTES = 512 * 1024 * 1024;

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
const MIN_VOLUME_TEXTURE_BUDGET_BYTES = 256 * 1024 * 1024;
const MAX_VOLUME_TEXTURE_BUDGET_BYTES = 2 * 1024 * 1024 * 1024;
const DEVICE_MEMORY_TEXTURE_FRACTION = 0.18;

/**
 * User override for the whole-device volume budget
 * (`orkestrator.volumeBudgetMB`, megabytes; absent/invalid = auto).
 *
 * The auto estimate is `deviceMemory x 0.18` clamped to [256 MiB, 2 GiB], which
 * is a guess about a number the browser only reports coarsely (Chromium clamps
 * `deviceMemory` to 8). A user who knows their machine — and knows a dataset
 * needs a bigger working set than the guess allows — can say so.
 *
 * MEMOIZED for the session. Two consumers read this: the planner
 * (`nodePlanTracker`) and the atlas allocator (`ensurePool`), and
 * `maxPlanBytes = atlasBytes - headroom` is a load-bearing coupling — if they
 * read `localStorage` at different times and saw different values, a plan would
 * be sized for a pool that does not exist. The memo makes disagreement
 * impossible within a session; the setter updates it so a live change is still
 * coherent (it takes effect for plans at the next replan and for atlases at the
 * next pool creation, the same rule as `orkestrator.r16Atlas`).
 */
const VOLUME_BUDGET_MB_KEY = "orkestrator.volumeBudgetMB";

/** Override bounds. The upper bound is above the auto clamp on purpose — the
 * whole point is to exceed a conservative estimate — but not unbounded: an
 * atlas is real VRAM and an over-large one fails allocation rather than
 * degrading. */
const MIN_BUDGET_OVERRIDE_BYTES = 256 * 1024 * 1024;
const MAX_BUDGET_OVERRIDE_BYTES = 4 * 1024 * 1024 * 1024;

/** `undefined` = not yet read this session; `null` = read, no override set. */
let volumeBudgetOverrideMemo: number | null | undefined;

export function getVolumeBudgetOverrideBytes(): number | null {
  if (volumeBudgetOverrideMemo !== undefined) return volumeBudgetOverrideMemo;
  volumeBudgetOverrideMemo = readBudgetOverride(VOLUME_BUDGET_MB_KEY, {
    min: MIN_BUDGET_OVERRIDE_BYTES,
    max: MAX_BUDGET_OVERRIDE_BYTES,
  });
  return volumeBudgetOverrideMemo;
}

export function setVolumeBudgetOverrideMB(mb: number | null): void {
  writeBudgetOverride(VOLUME_BUDGET_MB_KEY, mb);
  volumeBudgetOverrideMemo = undefined; // re-read (and re-clamp) on next get
}

/**
 * Shared parse/clamp for the megabyte-valued overrides. Exported so
 * `poolBudget.ts`'s decode-cache override cannot drift from this one.
 */
export function readBudgetOverride(
  key: string,
  bounds: { min: number; max: number },
): number | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return null; // storage unavailable: auto
  }
  if (raw === null || raw === "" || raw === "auto") return null;
  const mb = Number(raw);
  if (!Number.isFinite(mb) || mb <= 0) return null;
  return Math.min(Math.max(mb * 1024 * 1024, bounds.min), bounds.max);
}

export function writeBudgetOverride(key: string, mb: number | null): void {
  try {
    if (mb === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(mb));
  } catch {
    /* storage unavailable: session keeps its current state */
  }
}

export function getInitialVolumeTextureBudgetBytes(): number {
  const override = getVolumeBudgetOverrideBytes();
  if (override !== null) return override;

  const nav = typeof navigator !== "undefined"
    ? (navigator as Navigator & { deviceMemory?: number })
    : undefined;
  const memoryGiB = nav?.deviceMemory;

  if (typeof memoryGiB !== "number" || !Number.isFinite(memoryGiB) || memoryGiB <= 0) {
    return DEFAULT_VOLUME_TEXTURE_BUDGET_BYTES;
  }

  const estimatedBudget = memoryGiB * 1024 * 1024 * 1024 * DEVICE_MEMORY_TEXTURE_FRACTION;
  return Math.min(
    Math.max(estimatedBudget, MIN_VOLUME_TEXTURE_BUDGET_BYTES),
    MAX_VOLUME_TEXTURE_BUDGET_BYTES,
  );
}

/** Raw `navigator.deviceMemory`, for the debug report — the resolved budget
 * alone cannot distinguish "8 GiB machine" from "override set". */
export function getReportedDeviceMemoryGiB(): number | null {
  const nav = typeof navigator !== "undefined"
    ? (navigator as Navigator & { deviceMemory?: number })
    : undefined;
  const memoryGiB = nav?.deviceMemory;
  return typeof memoryGiB === "number" && Number.isFinite(memoryGiB) && memoryGiB > 0
    ? memoryGiB
    : null;
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
  const renderAxes = layer.lens.renderAxes;
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
