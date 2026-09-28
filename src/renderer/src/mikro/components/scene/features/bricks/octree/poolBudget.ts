import {
  MIN_LAYER_POOL_BYTES,
  getInitialVolumeTextureBudgetBytes,
  readBudgetOverride,
  writeBudgetOverride,
} from "../../../platform/quality/lodPlanning";

/**
 * The single source of truth for how a brick pool's memory is split between
 * PLANNED bricks and CACHE HEADROOM.
 *
 * Two call sites derive from this and they MUST agree, or the planner asks for
 * more slots than the atlas holds:
 *  - `nodePlanTracker` — the slot budget the plan DFS is allowed to spend.
 *  - `brickResidency.ensurePool` — the bytes the atlas is actually allocated at.
 *
 * ## Why headroom is not optional
 *
 * Eviction in `BrickPoolState` is lazy: it fires only from inside `acquire()`
 * once free slots run out. If the plan is allowed to consume the whole atlas,
 * the pool sits permanently at zero free slots, so every newly planned brick
 * costs an eviction and every out-of-plan brick that finishes fetching is
 * dropped for want of a slot. A recorded session in exactly that state showed
 * 183 planned nodes against a 200-slot atlas — 17 free — producing 4681
 * evictions and 199 dropped uploads over ten seconds.
 *
 * ## Why the atlas grows instead of the plan shrinking
 *
 * That state arose from a GOOD change: once layers began sharing a pool by
 * content, the per-pool budget stopped being divided by the layer count, which
 * let the planner reach full resolution (target level 0). Reserving headroom by
 * capping the plan would hand part of that resolution straight back.
 *
 * The budget share is per POOL, and sharing collapsed four pools into one — so
 * there is normally slack between the per-pool cap (`MIN_LAYER_POOL_BYTES`) and
 * the device share. Spend that slack on headroom and the plan keeps its
 * resolution. Only when the device share genuinely cannot cover
 * `planCap + headroom` does the plan shrink, which is the correct order of
 * sacrifice on a memory-poor machine.
 */

/**
 * Free slots a pool aims to keep for out-of-plan bricks: fallback data that
 * survives a replan, and room for the next plan's targets to land without
 * evicting the current one.
 */
export const MIN_POOL_HEADROOM_SLOTS = 64;

/**
 * Fraction of a pool's device share the PLAN may claim, the rest being left for
 * other pools and for the headroom below. Half is deliberately unambitious: the
 * plan budget buys resolution, but every byte of it is also a byte of atlas that
 * must be allocated up front whether or not the view ever needs it.
 */
export const POOL_PLAN_SHARE_FRACTION = 0.5;

/**
 * Pools to divide the device budget by even when fewer exist. Two, so a
 * single-image session keeps half the budget in reserve for the second image
 * the user is about to open.
 */
export const POOL_RESERVE_COUNT = 2;

/** Byte cap for decoded chunks held for repacking (the runner's default
 * cache is count-bounded and can pin GBs of plane-chunked SABs). Sized above
 * a typical plane-chunked working set, scaled down on low-RAM machines
 * (8 GiB Macs hit GC pauses with the full 512 MB alongside the atlases).
 * Lives here — not in brickResidency — so the planner's sub-floor decode
 * allowance and the residency cache agree on one number. */
/**
 * User override for the decoded-chunk cache (`orkestrator.decodeCacheMB`).
 *
 * A SEPARATE knob from `orkestrator.volumeBudgetMB` because these are different
 * physical resources: the volume budget is VRAM, this is JS heap. They are also
 * needed independently — a plane-chunked pyramid can be blocked purely on the
 * decode side (one brick's chunk set exceeding the cache) while its GPU slot
 * need is modest.
 *
 * Memoized for the same reason as the volume override: the cache size feeds
 * `resolveDecodeFloorBytes`/`resolveDecodeAllowanceBytes`, which the planner
 * reads, and the cache itself, which residency reads.
 */
const DECODE_CACHE_MB_KEY = "orkestrator.decodeCacheMB";
const MIN_DECODE_CACHE_OVERRIDE_BYTES = 128 * 1024 * 1024;
const MAX_DECODE_CACHE_OVERRIDE_BYTES = 4 * 1024 * 1024 * 1024;

let decodeCacheOverrideMemo: number | null | undefined;

export function getDecodeCacheOverrideBytes(): number | null {
  if (decodeCacheOverrideMemo !== undefined) return decodeCacheOverrideMemo;
  decodeCacheOverrideMemo = readBudgetOverride(DECODE_CACHE_MB_KEY, {
    min: MIN_DECODE_CACHE_OVERRIDE_BYTES,
    max: MAX_DECODE_CACHE_OVERRIDE_BYTES,
  });
  return decodeCacheOverrideMemo;
}

export function setDecodeCacheOverrideMB(mb: number | null): void {
  writeBudgetOverride(DECODE_CACHE_MB_KEY, mb);
  decodeCacheOverrideMemo = undefined;
}

/** Fraction of the VOLUME budget the chunk cache is allowed to track. The cache
 * is heap, not VRAM, but the volume budget is the only device-size signal we
 * have, and a machine that can afford a big atlas can generally afford the
 * chunks feeding it. */
export const DECODE_CACHE_BUDGET_FRACTION = 0.5;

export function getDecodedChunkCacheBytes(): number {
  const override = getDecodeCacheOverrideBytes();
  if (override !== null) return override;

  const nav =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { deviceMemory?: number })
      : undefined;
  const memoryGiB = nav?.deviceMemory;
  // The low-RAM guard stays the FLOOR of the auto path: 8 GiB Macs hit GC
  // pauses with the full 512 MB alongside the atlases (the reason this
  // function exists), and scaling must never walk that back.
  const base =
    typeof memoryGiB === "number" && memoryGiB > 0 && memoryGiB <= 8
      ? 256 * 1024 * 1024
      : 512 * 1024 * 1024;
  const scaled = DECODE_CACHE_BUDGET_FRACTION * getInitialVolumeTextureBudgetBytes();
  return Math.min(Math.max(base, scaled), MAX_DECODE_CACHE_OVERRIDE_BYTES);
}

/** Share of a pool's decode cache the BUDGET FLOOR may commit to. A quarter
 * leaves room for the coarse fallback chain plus the sub-floor allowance below
 * without the three of them summing past the cache. */
export const DECODE_FLOOR_CACHE_FRACTION = 0.25;

/** Share of a pool's decode cache the SUB-FLOOR allowance may commit to. */
export const DECODE_ALLOWANCE_CACHE_FRACTION = 0.5;

/** The coarse fallback chain lives in the same cache as the floor level's
 * chunks, and the shader depends on it for every unmapped sample. Reserve a
 * quarter again on top of the floor before handing anything to the allowance. */
export const COARSE_CHAIN_RESERVE = 1.25;

/** Decode-cache bytes one pool may treat as its own. */
export function resolveDecodeCacheShareBytes(input: {
  decodedChunkCacheBytes: number;
  poolCount: number;
}): number {
  return input.decodedChunkCacheBytes / Math.max(1, input.poolCount);
}

/**
 * Decoded-chunk bytes the BUDGET FLOOR may spend — the largest level whose
 * chunk-aligned visible set the pipeline is willing to pull.
 *
 * Separate from `maxPlanBytes` (GPU atlas slots) because they are different
 * currencies: a level unlocked against a slot budget the chunk cache cannot
 * feed thrashes without bound. Tying the floor to the cache makes the working
 * set the planner admits one the cache can actually hold.
 *
 * Floored at `MIN_LAYER_POOL_BYTES` so this change can never demote a dataset
 * that plans fine today.
 */
export function resolveDecodeFloorBytes(input: {
  decodeCacheShareBytes: number;
}): number {
  return Math.max(
    MIN_LAYER_POOL_BYTES,
    Math.floor(DECODE_FLOOR_CACHE_FRACTION * input.decodeCacheShareBytes),
  );
}

/**
 * Decoded-chunk bytes one replan may spend refining BELOW the budget floor
 * (`planLayerNodes` `decodeAllowanceBytes`). The floor keeps whole-view
 * refinement affordable, but on plane-chunked pyramids the chunk-aligned cost
 * of the visible box barely shrinks with zoom, so the floor alone pins the
 * plan at a coarse level forever; the allowance lets the closest-first DFS
 * buy a bounded, focus-first chunk set past it. Capped at half the shared
 * decode cache (split across pools) so a zoom burst cannot evict the coarse
 * working set the fallback chain depends on.
 */
export function resolveDecodeAllowanceBytes(input: {
  decodeCacheShareBytes: number;
  /** Decoded bytes the floor level itself occupies — the fallback chain the
   * shader reads on every unmapped sample. Pass 0 when unknown. */
  floorLevelBytes: number;
}): number {
  return Math.max(
    0,
    Math.min(
      Math.floor(DECODE_ALLOWANCE_CACHE_FRACTION * input.decodeCacheShareBytes),
      Math.floor(
        input.decodeCacheShareBytes - COARSE_CHAIN_RESERVE * input.floorLevelBytes,
      ),
    ),
  );
}

export type PoolBudget = {
  /** Bytes to allocate the atlas at. */
  atlasBytes: number;
  /** Bytes the node plan may spend on slots. */
  maxPlanBytes: number;
  /** Slots of headroom this split is aiming for (0 = whole pyramid fits). */
  headroomSlots: number;
};

export function resolvePoolBudget(input: {
  /** `getInitialVolumeTextureBudgetBytes()` — the whole-device estimate. */
  deviceBudgetBytes: number;
  /** Number of DISTINCT POOLS (not layers) sharing that device budget. */
  poolCount: number;
  /** Bytes one atlas slot occupies — `atlasSlotBytes(spec, kind)`. */
  slotBytes: number;
  /** Bytes the ENTIRE pyramid would need if fully resident. */
  totalBrickBytes: number;
}): PoolBudget {
  const { deviceBudgetBytes, poolCount, slotBytes, totalBrickBytes } = input;
  // The real share bounds the atlas, exactly as before — it must NOT carry the
  // reserve, or a 256 MiB device with one pool would squeeze its plan below the
  // 128 MiB it gets today (the atlas can no longer hold plan + headroom).
  const share = deviceBudgetBytes / Math.max(1, poolCount);
  // The reserve damps only the SCALING term: the first pool of a session must
  // not size itself as though it will be the only one, or opening a second
  // image finds the budget spent and `ensurePool`'s atlas-sum cap floors it at
  // the coarsest grid — a blocky second layer caused by the first being greedy.
  const scaledShare = deviceBudgetBytes / Math.max(poolCount, POOL_RESERVE_COUNT);
  // The 128 MiB term is a FLOOR now, not a ceiling. On the default 512 MiB
  // device budget this reproduces the old flat cap byte for byte, so small
  // machines see no change at all; only larger budgets actually scale up. The
  // outer `min(share, …)` keeps the old squeeze behaviour on starved shares.
  const planCap = Math.min(
    share,
    Math.max(MIN_LAYER_POOL_BYTES, Math.floor(scaledShare * POOL_PLAN_SHARE_FRACTION)),
  );

  // The whole pyramid fits: every brick can be resident, so there is nothing
  // out-of-plan to keep and nothing to evict. Headroom would be dead memory.
  if (totalBrickBytes <= planCap) {
    return { atlasBytes: totalBrickBytes, maxPlanBytes: planCap, headroomSlots: 0 };
  }

  const headroomBytes = MIN_POOL_HEADROOM_SLOTS * slotBytes;
  const share_ = Math.min(share, planCap + headroomBytes);
  // Never let the plan reach zero slots: a pool that can hold nothing renders
  // nothing. The coarsest-level floor in `ensurePool` overrides from there.
  const maxPlanBytes = Math.max(slotBytes, share_ - headroomBytes);
  // ...but that floor must not push the plan PAST the atlas, which is exactly
  // the "plan bigger than its pool" failure this module exists to prevent. It
  // happens when one slot is a large fraction of the share (a huge brick spec,
  // or many pools on a small device): the atlas grows to meet the floor and
  // headroom degrades to whatever is left, possibly zero.
  const atlasBytes = Math.max(share_, maxPlanBytes);
  return {
    atlasBytes,
    maxPlanBytes,
    headroomSlots: Math.floor((atlasBytes - maxPlanBytes) / Math.max(1, slotBytes)),
  };
}

/**
 * Slots of headroom a pool of `atlasSlots` should keep free. The constant is a
 * TARGET, not a floor: a pool smaller than it can never satisfy it, so every
 * comparison against the raw constant is unconditionally true on small
 * pyramids. Capped at half the atlas so the reserve can never starve what the
 * pool exists to hold. See `resolvePlanBytesForAtlas` and
 * `trimUnreachableResidents` — the two sites where an uncapped compare was the
 * bug (P25).
 */
export const poolHeadroomSlots = (atlasSlots: number): number =>
  Math.min(MIN_POOL_HEADROOM_SLOTS, Math.max(0, Math.floor(atlasSlots / 2)));

/**
 * Plan bytes for the atlas that ACTUALLY exists — `resolvePoolBudget` sizes the
 * budget for the CURRENT pool count, but atlases are never resized, so a plan
 * must additionally be clamped to the allocation it will land in.
 *
 * Headroom only means something when bricks can be out-of-plan: a pyramid that
 * fits its atlas WHOLE has nothing to evict and reserves none, mirroring
 * `resolvePoolBudget`'s `headroomSlots: 0` branch. On a starved atlas the
 * reserve is additionally capped at half its slots (`poolHeadroomSlots`).
 *
 * Both caps exist because subtracting a flat 64 slots from a 9-slot atlas
 * (a small image: 9 bricks, atlas sized to exactly the pyramid) went NEGATIVE,
 * left the plan a single slot, and so zeroed `planLayerNodes`'
 * `refineBudgetBytes` — pinning every small dataset at the coarsest level at
 * every zoom.
 */
export function resolvePlanBytesForAtlas(input: {
  /** `BrickResidencyManager.poolAtlasBytes` — a static allocation size. */
  liveAtlasBytes: number;
  /** `resolvePoolBudget().maxPlanBytes`. */
  resolvedMaxPlanBytes: number;
  slotBytes: number;
  /** Bytes the ENTIRE pyramid would need if fully resident. */
  totalBrickBytes: number;
}): number {
  const { liveAtlasBytes, resolvedMaxPlanBytes, slotBytes, totalBrickBytes } = input;
  const atlasSlots = Math.floor(liveAtlasBytes / Math.max(1, slotBytes));
  const headroomBytes =
    totalBrickBytes <= liveAtlasBytes ? 0 : poolHeadroomSlots(atlasSlots) * slotBytes;
  // The `max(slotBytes, …)` floor stays: a pool that can hold nothing renders
  // nothing (same rule as resolvePoolBudget).
  return Math.max(slotBytes, Math.min(resolvedMaxPlanBytes, liveAtlasBytes - headroomBytes));
}
