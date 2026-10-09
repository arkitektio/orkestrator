import {
  buildLayerLevelGeometry,
  buildLevelSources,
  hasPhasorSlabs,
  type LayerLevelGeometry,
  type LevelSource,
} from "../../../platform/coords/levelGeometry";
import { getMax3DTextureSize, type SceneRenderer } from "../../../platform/gpu/sceneRenderer";
import { resolveLayerDataRange } from "../../../platform/model/dataRange";
import type { LayerState } from "../../../platform/model/layerModel";
import { getInitialVolumeTextureBudgetBytes } from "../../../platform/quality/lodPlanning";
import type { ViewerState } from "../../../platform/stores/viewerStore";
import { createBrickAtlas } from "../gpu/brickAtlas";
import {
  clearPageTable,
  createPageTableTexture,
  ensureAggregate,
} from "../gpu/pageTableTexture";
import { atlasKindForGeometry, atlasSlotBytes } from "../octree/atlasFormat";
import { BrickPoolState } from "../octree/brickPoolState";
import { resolveBrickSpec, type BrickSpec } from "../octree/brickSpec";
import { brickGridForLevel, totalBrickCount } from "../octree/nodeAddress";
import { createNodeKeyMemo } from "../octree/nodeKeyMemo";
import type { LayerNodePlan } from "../octree/nodePlanning";
import { occSlabCountFor } from "../octree/occupancySlabs";
import { buildPageTableLayout } from "../octree/pageTableLayout";
import { MIN_POOL_HEADROOM_SLOTS, resolvePoolBudget } from "../octree/poolBudget";
import { buildPoolKey, buildStructureSignature, poolValueSemantics } from "../octree/poolKey";
import { assessPoolViability } from "../octree/poolViability";
import { computeFixedIndices } from "./brickChunks";
import { resolveReusedAutoRange, shouldAutoRange } from "./rangeEncoding";
import type { LayerBrickPool, PoolDerivation } from "./residencyTypes";

/**
 * Pool lifecycle, split out of the residency manager: deriving a layer's
 * structure and pool key, allocating a fresh pool, retargeting a reused one,
 * and emptying one for a new slice. These build and mutate pool RECORDS only;
 * the manager keeps the pool map, membership and every notification (drain
 * wake-ups, `poolsVersion`, `volumeInputs`, frames).
 */

/** Page-table texture extent cap — also the WebGPU spec MINIMUM for
 * `maxTextureDimension3D`, so it doubles as the detached-renderer fallback. */
export const PAGE_TEXTURE_MAX_EXTENT = 2048;

/** Geometry, spec, viability and structure signature of one layer — the
 * pool-independent half of a derivation. */
export type LayerStructure = {
  layer: LayerState;
  dataArrays: unknown;
  mode: "2D" | "3D";
  levels: LevelSource[];
  geometry: LayerLevelGeometry;
  spec: BrickSpec;
  structureSignature: string;
  viability: ReturnType<typeof assessPoolViability>;
};

/**
 * One layer's structure, memoized in `cache` on the input identities the
 * derivation actually reads (see the manager's `layerDerivationCache`). Null
 * when the store is not resolvable yet or the layer has no usable geometry —
 * only successes are cached, so a store that opens late retries naturally.
 */
export function deriveLayerStructure(
  layer: LayerState,
  mode: "2D" | "3D",
  cache: Map<string, LayerStructure>,
  getArrayForStoreId: Parameters<typeof buildLevelSources>[2],
): LayerStructure | null {
  const dataset = layer.lens.dataset;
  const cached = cache.get(layer.id);
  if (
    cached &&
    cached.layer === layer &&
    cached.dataArrays === dataset.dataArrays &&
    cached.mode === mode
  ) {
    return cached;
  }

  let levels: LevelSource[];
  try {
    levels = buildLevelSources(
      dataset.dataArrays,
      dataset.axisNames.length,
      getArrayForStoreId,
    );
  } catch {
    return null;
  }

  const built = buildLayerLevelGeometry(dataset.axisNames, layer, levels);
  if (!built) return null;
  const geometry = built;
  const spec = resolveBrickSpec(geometry, mode);
  const viability = assessPoolViability(geometry, spec);
  const structureSignature = buildStructureSignature({
    mode,
    spec,
    geometry,
    levels,
  });
  const structure: LayerStructure = {
    layer,
    dataArrays: dataset.dataArrays,
    mode,
    levels,
    geometry,
    spec,
    structureSignature,
    viability,
  };
  cache.set(layer.id, structure);
  return structure;
}

/** Key a viable layer structure into the derivation `ensurePool` groups by. */
export function buildPoolDerivation(
  layer: LayerState,
  plan: LayerNodePlan,
  structure: LayerStructure,
): PoolDerivation {
  const { levels, geometry, spec, structureSignature } = structure;
  const dtype = geometry.levels[0].dtype;
  const dataRange = resolveLayerDataRange(layer, dtype);
  const valueSemantics = poolValueSemantics(layer);
  return {
    layer,
    mode: plan.mode,
    levels,
    geometry,
    spec,
    structureSignature,
    sliceSignature: plan.sliceSignature,
    dataRange,
    valueSemantics,
    poolKey: buildPoolKey({
      mode: plan.mode,
      spec,
      geometry,
      levels,
      sliceSignature: plan.sliceSignature,
      dataRange,
      valueSemantics,
    }),
  };
}

/**
 * Retarget a REUSED pool (`ensurePool`'s movable path — same structure, new
 * key) at its new derivation, after any flush: the auto-range carry-over,
 * the range move, the re-captured creation-time flags and the new key.
 * Returns whether the range moved (the caller wakes the drain for the EMPTY
 * re-encode).
 */
export function retargetMovedPool(
  movable: LayerBrickPool,
  derivation: PoolDerivation,
  flushed: boolean,
): boolean {
  const { geometry, layer } = derivation;
  let rangeMoved = false;
  const nextAutoRange = shouldAutoRange(
    derivation.valueSemantics,
    geometry.levels[0].dtype,
    layer,
  );
  const reuse = resolveReusedAutoRange(movable, nextAutoRange, flushed);
  // See `resolveReusedAutoRange`. Keeping the range is safe on every
  // invariant the reset was protecting: the range does not move, so no
  // EMPTY entry needs re-encoding; the caller's `flushPool` already reset
  // `occObserved*`/`occEncode*` against this same range and cleared the
  // page table; and a pool key holding the dtype range while the live range
  // has drifted is the NORMAL auto-range state, exactly as it is for a
  // fresh pool (see the `poolKey.ts` module doc).
  if (reuse.keepRange) {
    // Kept as a SEED: a flushed pool re-fits from its first brick rather
    // than unioning the previous slice's range forever.
    movable.autoRangeInitialized = reuse.autoRangeInitialized;
  } else if (
    movable.minValue !== derivation.dataRange[0] ||
    movable.maxValue !== derivation.dataRange[1]
  ) {
    // EMPTY page entries quantize against the pool range, so a range move
    // invalidates every one of them (see reencodeEmptyEntries).
    movable.minValue = derivation.dataRange[0];
    movable.maxValue = derivation.dataRange[1];
    movable.autoRangeEncodeDirty = true;
    // A range move also restarts the auto-range fit and the occupancy
    // encode/observed state, which must re-derive from the NEW pool range
    // (the caller's flushPool reset it against the OLD one — ordering matters).
    // Encode ≡ decode stays intact because the decode uniforms ride the
    // caller's poolsVersion bump. (The auto-range POLICY is re-derived below,
    // outside this branch — it can flip without the range moving.)
    movable.autoRangeInitialized = false;
    movable.occObservedInitialized = false;
    movable.occEncodeMin = movable.minValue;
    movable.occEncodeMax = movable.maxValue;
    movable.occReencodePending = false;
    rangeMoved = true;
  }
  // Outside the range branch: the policy can flip without the range moving
  // (a pool seeded at the dtype range whose histogram arrives before any
  // brick lands has autoRange to turn OFF while `dataRange` still matches).
  movable.autoRange = nextAutoRange;
  // Re-capture the pool-creation-time flags: a toggle followed by a
  // slice/range change would otherwise pin this pool on the old policy
  // for its whole life.
  movable.occObservedRange =
    derivation.valueSemantics === "intensity";
  movable.occHierarchy = true;
  movable.poolKey = derivation.poolKey;
  return rangeMoved;
}

/**
 * Allocate a FRESH pool for one derivation group: page-table layout, the
 * budgeted atlas (see the budget notes inline), its eagerly created backend
 * texture, and the pool record. Null when the geometry has no page-table
 * layout. The caller registers it, warms the probe encoders and bumps.
 */
export function createLayerBrickPool(input: {
  derivation: PoolDerivation;
  members: readonly LayerState[];
  /** DISTINCT pools this reconcile (divides the device budget). */
  planCount: number;
  renderer: SceneRenderer | null;
  /** Atlas bytes every existing pool already holds. */
  allocatedAtlasBytes: number;
  ensureGpuRepacker: () => void;
  dimSelections: () => ViewerState["dimSelections"];
}): LayerBrickPool | null {
  const {
    derivation,
    members,
    planCount,
    renderer,
    allocatedAtlasBytes,
    ensureGpuRepacker,
    dimSelections,
  } = input;
  const { levels, geometry, spec, structureSignature, poolKey } = derivation;
  const layer = derivation.layer;

  const layout = buildPageTableLayout(geometry, spec.payload, PAGE_TEXTURE_MAX_EXTENT);
  if (!layout) return null;

  // Shared with the planner's byte accounting (see atlasKindForGeometry):
  // the two MUST agree on bytes-per-slot or plans request more slots than
  // the pool holds. `resolvePoolBudget` is the shared call that also reserves
  // the cache headroom the plan is not allowed to spend — without it a plan
  // that maxes the budget leaves zero free slots and the pool thrashes.
  const atlasKind = atlasKindForGeometry(geometry);
  const slotBytes = atlasSlotBytes(spec, atlasKind);
  const maxUsefulSlotsForBudget = totalBrickCount(geometry, spec);
  const deviceBudgetBytes = getInitialVolumeTextureBudgetBytes();
  const { atlasBytes } = resolvePoolBudget({
    deviceBudgetBytes,
    poolCount: planCount,
    slotBytes,
    totalBrickBytes: maxUsefulSlotsForBudget * slotBytes,
  });
  const coarsestGrid = brickGridForLevel(geometry, spec, geometry.levels.length - 1);
  // `PAGE_TEXTURE_MAX_EXTENT` is 2048 and 2048 is also the WebGPU spec
  // MINIMUM for `maxTextureDimension3D`, so the detached fallback below is
  // not a guess — it is the same number the min would have produced anyway.
  const maxTextureExtent = Math.min(
    PAGE_TEXTURE_MAX_EXTENT,
    renderer === null ? PAGE_TEXTURE_MAX_EXTENT : getMax3DTextureSize(renderer),
  );
  // The pool can never need more slots than the pyramid has bricks — cap
  // there so small datasets get small atlases (the budget share only binds
  // for genuinely large pyramids).
  const maxUsefulSlots = totalBrickCount(geometry, spec);
  const minSlots = Math.min(
    maxUsefulSlots,
    coarsestGrid[0] * coarsestGrid[1] * coarsestGrid[2] + MIN_POOL_HEADROOM_SLOTS,
  );
  // Creation-order overshoot guard: shares divide by the CURRENT pool count
  // and existing atlases are never resized, so pools created when few
  // existed keep their large allocations and the SUM across pools could
  // exceed the device budget as layers open.
  // Cap this pool's allocation to what the device budget has LEFT, never
  // below the coarsest floor (the shader's fallback invariant, P18 —
  // `assessPoolViability` already vetted the floor itself as affordable).
  const remainingBudgetBytes = Math.max(0, deviceBudgetBytes - allocatedAtlasBytes);
  const cappedAtlasBytes = Math.min(
    atlasBytes,
    Math.max(remainingBudgetBytes, minSlots * slotBytes),
  );
  const desiredSlots = Math.min(
    maxUsefulSlots,
    Math.max(minSlots, Math.floor(cappedAtlasBytes / slotBytes)),
  );

  // Called for its side effect only — build the repacker now, while we are
  // already off the hot path. Its RESULT must not decide the atlas usage
  // flags (see `computeStorage` below).
  ensureGpuRepacker();
  const atlas = createBrickAtlas({
    spec,
    dtype: geometry.levels[0].dtype,
    kind: atlasKind,
    desiredSlots,
    // The P16 floor travels with the request so the grid factorization can
    // tell "under budget" from "cannot hold the coarsest level".
    minSlots,
    maxExtent: maxTextureExtent,
    filter: spec.border > 0 ? "linear" : "nearest",
    // A phasor layer never repacks on the GPU (the kernel cannot reduce), so
    // it has no use for the storage-binding usage flag either.
    // MUST NOT be `gpuRepacker !== null`: a pool created before the
    // renderer attaches would see null and allocate an atlas WITHOUT the
    // storage binding — permanently, silently disabling GPU repack for this
    // pool's whole life. Decide from the flag + geometry, which do not
    // depend on whether the device exists yet. (OCTREE_RENDERER.md P23.)
    computeStorage: !hasPhasorSlabs(geometry),
  });
  // One occupancy plane per slab where the flag and the texture extent
  // allow it (intensity pools only — a label's id-space has no windowing).
  const occSlabs = occSlabCountFor(
    spec.channelCount,
    layout.size[2],
    PAGE_TEXTURE_MAX_EXTENT,
    derivation.valueSemantics === "intensity",
  );
  const pageTable = createPageTableTexture(layout, occSlabs);

  // Create the backend GPUTexture now, for EVERY pool (it used to be
  // compute-repack pools only): compute dispatches must not race the first
  // draw's lazy texture creation, and with no CPU mirror (roadmap R3)
  // `uploadTexSubImage3D`'s needsUpdate fallback has no CPU data to
  // re-spec from, so `writeTexture` must always find the texture
  // already created. WebGPU textures are zero-initialized by spec, so the
  // eager creation costs no upload.
  // No-op while detached; `attachRenderer` re-runs it for every pool that
  // was created before the device existed.
  (
    renderer as unknown as { initTexture?: (texture: unknown) => void } | null
  )?.initTexture?.(atlas.texture);

  const { fixedChunkCoords, fixedOffsets } = computeFixedIndices(
    layer,
    geometry,
    levels as LevelSource[],
    dimSelections(),
  );

  const dtype = geometry.levels[0].dtype;
  const [minValue, maxValue] = derivation.dataRange;
  // Weak-proxy dtypes without a server histogram normalize against a dtype
  // fallback that does not describe the data: floats whites-out anything
  // valued >1, and signed integers put raw 0 at mid-gray. Accumulate the real
  // range from decoded bricks instead (see `accumulateAutoRange`).
  //
  // Not a pool-key field: it is implied by dtype (keyed) plus "the range fell
  // back to the dtype's" (keyed as dataRange), so members always agree — see
  // the poolKey module doc.
  const autoRange = shouldAutoRange(derivation.valueSemantics, dtype, layer);

  const pool: LayerBrickPool = {
    poolKey,
    // Ids must survive the page table EXACTLY (a mask is mostly uniform
    // bricks); an intensity is about to be normalized anyway. See
    // `EmptyValueBits`.
    emptyBits: derivation.valueSemantics === "labelIds" ? 24 : 8,
    members: new Set(members.map((m) => m.id)),
    mode: derivation.mode,
    sliceSignature: derivation.sliceSignature,
    structureSignature,
    geometry,
    spec,
    atlas,
    pageTable,
    pool: new BrickPoolState(atlas.slotGrid),
    protectedKeys: new Set(),
    coarsestResident: new Set(),
    inFlight: new Map(),
    pendingFetch: [],
    provisionalKeys: new Set(),
    pendingHalo: [],
    fetchRetries: new Map(),
    queue: [],
    queuedKeys: new Set(),
    emptyValues: new Map(),
    gpuIneligibleKeys: new Set(),
    brickRanges: new Map(),
    fixedChunkCoords,
    fixedOffsets,
    minValue,
    maxValue,
    autoRange,
    autoRangeEncodeDirty: false,
    autoRangeInitialized: false,
    // Occupancy encode range starts at the pool range (legacy behavior)
    // and, when the flag is on, tightens to the observed union as bricks
    // land. NEVER for label pools: their occupancy is id-space where
    // "range" has no windowing meaning, exactly like autoRange.
    occObservedRange:
      derivation.valueSemantics === "intensity",
    occObservedMin: 0,
    occObservedMax: 0,
    occObservedInitialized: false,
    occEncodeMin: minValue,
    occEncodeMax: maxValue,
    occReencodePending: false,
    flushEpoch: 0,
    occHierarchy: true,
    measuredRanges: new Map(),
    aggregateRanges: new Map(),
    occSlabs,
    brickSlabRanges: new Map(),
    measuredSlabRanges: new Map(),
    aggregateSlabRanges: new Map(),
    // (aggregate sidecar is allocated below only when the flag is on)
    minTargetLevel: 0,
    lastRepackPath: null,
    nodeKeys: createNodeKeyMemo(geometry.levels.length),
  };
  if (pool.occHierarchy) ensureAggregate(pool.pageTable);
  return pool;
}

/**
 * Empty a pool in place for a new slice signature (`flushPool`): abort its
 * fetches, drop every queue, residency map and measured range, clear the page
 * table, bump `flushEpoch` (stale GPU tokens), and pin the new collapsed-dim
 * indices. The atlas allocation is kept — that is the point of a flush.
 */
export function resetPoolContents(
  pool: LayerBrickPool,
  nextSliceSignature: string,
  fixed: { fixedChunkCoords: number[][]; fixedOffsets: number[][] },
): void {
  for (const controller of pool.inFlight.values()) controller.abort();
  pool.inFlight.clear();
  pool.pendingFetch = [];
  pool.pendingHalo = [];
  pool.provisionalKeys.clear();
  pool.queue = [];
  pool.queuedKeys.clear();
  pool.emptyValues.clear();
  pool.brickRanges.clear();
  pool.brickSlabRanges.clear();
  pool.pool.clear();
  pool.flushEpoch += 1;
  pool.coarsestResident.clear();
  pool.autoRangeEncodeDirty = false;
  // Occupancy observed range is a statement about the flushed data —
  // reset to the pool range and re-observe from the refetched bricks.
  pool.occObservedInitialized = false;
  pool.occEncodeMin = pool.minValue;
  pool.occEncodeMax = pool.maxValue;
  pool.occReencodePending = false;
  // Measured ranges/aggregates describe the flushed slice's data — the ONE
  // event that invalidates them (they deliberately survive eviction).
  pool.measuredRanges.clear();
  pool.aggregateRanges.clear();
  pool.measuredSlabRanges.clear();
  pool.aggregateSlabRanges.clear();
  clearPageTable(pool.pageTable);
  pool.sliceSignature = nextSliceSignature;
  pool.fixedChunkCoords = fixed.fixedChunkCoords;
  pool.fixedOffsets = fixed.fixedOffsets;
}
