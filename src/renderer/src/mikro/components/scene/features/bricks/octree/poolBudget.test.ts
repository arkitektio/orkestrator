import { afterEach, describe, expect, it } from "vitest";
import {
  applyRendererBudgetSettings,
  getRendererBudget,
  resetRendererBudgetForTests,
} from "@/core/settings/renderer/rendererBudget";
import {
  COARSE_CHAIN_RESERVE,
  MAX_AUTO_PLAN_BYTES,
  MIN_POOL_HEADROOM_SLOTS,
  DECODE_BUDGET_CACHE_FRACTION,
  POOL_PLAN_SHARE_FRACTION,
  POOL_RESERVE_COUNT,
  getDecodedChunkCacheBytes,
  resetDecodedChunkCacheBytesForTests,
  resolveDecodeAllowanceBytes,
  resolveDecodeCacheShareBytes,
  resolveDecodeFloorBytes,
  resolveDecodeBudgetBytes,
  resolveAutoPlanCapBytes,
  resolvePlanBytesForAtlas,
  resolvePoolBudget,
} from "./poolBudget";
import { MIN_LAYER_POOL_BYTES } from "../../../platform/quality/lodPlanning";

/** A 66x66x38 uint8 brick over 4 channel slabs — the shape from the report. */
const SLOT_BYTES = 66 * 66 * 38 * 4;
const MiB = 1024 * 1024;

/** Big enough that the whole pyramid never fits, so headroom always applies. */
const HUGE_PYRAMID = 8 * 1024 * MiB;

const budget = (over: Partial<Parameters<typeof resolvePoolBudget>[0]> = {}) =>
  resolvePoolBudget({
    deviceBudgetBytes: 512 * MiB,
    poolCount: 1,
    slotBytes: SLOT_BYTES,
    totalBrickBytes: HUGE_PYRAMID,
    ...over,
  });

describe("resolvePoolBudget — the headroom invariant", () => {
  it("leaves at least MIN_POOL_HEADROOM_SLOTS between the plan and the atlas", () => {
    const { atlasBytes, maxPlanBytes } = budget();
    const atlasSlots = Math.floor(atlasBytes / SLOT_BYTES);
    const planSlots = Math.floor(maxPlanBytes / SLOT_BYTES);
    expect(atlasSlots - planSlots).toBeGreaterThanOrEqual(MIN_POOL_HEADROOM_SLOTS);
  });

  it("holds the invariant across a spread of budgets, pool counts and slot sizes", () => {
    for (const deviceBudgetBytes of [256 * MiB, 512 * MiB, 1536 * MiB, 2048 * MiB]) {
      for (const poolCount of [1, 2, 4, 8, 16, 32]) {
        for (const slotBytes of [SLOT_BYTES, 4096, 66 * 66 * 38 * 4 * 4, 32 * MiB]) {
          const { atlasBytes, maxPlanBytes, headroomSlots } = resolvePoolBudget({
            deviceBudgetBytes,
            poolCount,
            slotBytes,
            totalBrickBytes: HUGE_PYRAMID,
          });
          expect(atlasBytes).toBeGreaterThan(0);
          expect(maxPlanBytes).toBeGreaterThan(0);
          // THE invariant: the plan must always fit the atlas it will land in.
          expect(maxPlanBytes).toBeLessThanOrEqual(atlasBytes);
          expect(headroomSlots).toBeGreaterThanOrEqual(0);

          const share = deviceBudgetBytes / poolCount;
          const scaledShare = deviceBudgetBytes / Math.max(poolCount, POOL_RESERVE_COUNT);
          const planCap = Math.min(
            share,
            Math.max(MIN_LAYER_POOL_BYTES, Math.floor(scaledShare * POOL_PLAN_SHARE_FRACTION)),
          );
          if (planCap + MIN_POOL_HEADROOM_SLOTS * slotBytes <= share) {
            // The normal case: the share covers a full plan AND a full
            // headroom, so both get exactly what they asked for.
            expect(maxPlanBytes).toBe(planCap);
            expect(headroomSlots).toBe(MIN_POOL_HEADROOM_SLOTS);
            expect(atlasBytes).toBeLessThanOrEqual(share + 1);
          } else if (slotBytes > share) {
            // One slot exceeds the whole share: the single-slot floor wins and
            // the atlas grows to meet it rather than the plan overrunning.
            expect(atlasBytes).toBe(slotBytes);
            expect(maxPlanBytes).toBe(slotBytes);
          } else {
            // Squeezed: the plan is sacrificed first, the atlas stays in share.
            expect(atlasBytes).toBeLessThanOrEqual(share + 1);
            expect(maxPlanBytes).toBeLessThanOrEqual(planCap);
          }
        }
      }
    }
  });

  it("never lets the plan reach zero slots, even on a starved share", () => {
    // A share far below one slot: the plan still gets a slot, and the
    // coarsest-level floor in ensurePool overrides from there.
    const { maxPlanBytes } = budget({ deviceBudgetBytes: 1024, poolCount: 32 });
    expect(maxPlanBytes).toBeGreaterThanOrEqual(SLOT_BYTES);
  });
});

describe("resolvePoolBudget — whole pyramid fits", () => {
  it("skips headroom entirely and sizes the atlas to the pyramid", () => {
    // Everything can be resident, so nothing is ever out-of-plan or evicted.
    // Headroom here would be dead memory.
    const totalBrickBytes = 8 * MiB;
    const { atlasBytes, maxPlanBytes, headroomSlots } = budget({ totalBrickBytes });
    expect(atlasBytes).toBe(totalBrickBytes);
    expect(headroomSlots).toBe(0);
    expect(maxPlanBytes).toBe(MIN_LAYER_POOL_BYTES);
  });
});

describe("resolvePoolBudget — monotonicity", () => {
  it("never grows either number as pools are added", () => {
    let previous = budget({ poolCount: 1 });
    for (const poolCount of [2, 4, 8, 16, 32]) {
      const next = budget({ poolCount });
      expect(next.atlasBytes).toBeLessThanOrEqual(previous.atlasBytes);
      expect(next.maxPlanBytes).toBeLessThanOrEqual(previous.maxPlanBytes);
      previous = next;
    }
  });
});

describe("resolvePoolBudget — the reported regression", () => {
  // The dump: one shared pool, 4 layers, 66x66x38x4ch uint8 bricks. The plan
  // reached targetLevel 0 at 121,166,496 B / 183 nodes, and the atlas was sized
  // at 200 slots — leaving 17 free against a 64-slot target, which produced
  // 4681 evictions and 199 dropped uploads.
  const OBSERVED_PLAN_BYTES = 121_166_496;

  it("does NOT shrink the plan below what reached full resolution", () => {
    const { maxPlanBytes } = budget();
    expect(maxPlanBytes).toBeGreaterThanOrEqual(OBSERVED_PLAN_BYTES);
  });

  it("grows the atlas to cover the plan plus a full headroom", () => {
    const { atlasBytes, maxPlanBytes } = budget();
    expect(atlasBytes).toBeGreaterThanOrEqual(
      maxPlanBytes + MIN_POOL_HEADROOM_SLOTS * SLOT_BYTES,
    );
    // ~170 MB, up from the 132 MB that thrashed — the intended cost.
    expect(atlasBytes).toBeGreaterThan(160 * MiB);
    expect(atlasBytes).toBeLessThan(180 * MiB);
  });

  it("falls back to shrinking the plan when the device share cannot cover both", () => {
    // A share below planCap + headroom: resolution is the correct sacrifice on
    // a memory-poor machine, and the headroom invariant still holds.
    const { atlasBytes, maxPlanBytes } = budget({ deviceBudgetBytes: 150 * MiB });
    expect(atlasBytes).toBeLessThanOrEqual(150 * MiB);
    expect(maxPlanBytes).toBeLessThan(MIN_LAYER_POOL_BYTES);
    expect(atlasBytes - maxPlanBytes).toBeGreaterThanOrEqual(
      MIN_POOL_HEADROOM_SLOTS * SLOT_BYTES,
    );
  });
});

/**
 * The device-scaled formula replaced a flat 128 MiB ceiling. These pin the two
 * things that matter: small machines must not change at all, and large ones must
 * actually scale — the flat cap is what pinned the LOD floor on plane-chunked
 * pyramids (a 2 GiB machine planned exactly as coarsely as a 512 MiB one).
 */
describe("resolvePoolBudget — device scaling", () => {
  const headroom = MIN_POOL_HEADROOM_SLOTS * SLOT_BYTES;

  it("is byte-identical to the old flat 128 MiB cap on the DEFAULT device", () => {
    // 512 MiB is what getInitialVolumeTextureBudgetBytes returns when
    // navigator.deviceMemory is absent — i.e. every jsdom test, and any browser
    // that does not report it. share = 512/2 = 256 MiB, half of which is exactly
    // the 128 MiB floor, so the formula reproduces the old ceiling.
    const { maxPlanBytes, atlasBytes } = budget({ deviceBudgetBytes: 512 * MiB });
    expect(maxPlanBytes).toBe(MIN_LAYER_POOL_BYTES);
    expect(atlasBytes).toBe(MIN_LAYER_POOL_BYTES + headroom);
  });

  it("scales up on a large device budget instead of pinning at 128 MiB", () => {
    // The reported case: 2 GiB budget, one pool. Old behaviour was 128 MiB.
    const { maxPlanBytes } = budget({ deviceBudgetBytes: 2048 * MiB });
    expect(maxPlanBytes).toBe(512 * MiB);
    expect(maxPlanBytes).toBeGreaterThan(MIN_LAYER_POOL_BYTES);
  });

  it("never drops BELOW the old cap, whatever the pool count", () => {
    // The floor is the regression guard: no dataset may plan more coarsely than
    // it does today purely because of this change.
    for (const deviceBudgetBytes of [256 * MiB, 512 * MiB, 1024 * MiB, 2048 * MiB]) {
      for (const poolCount of [1, 2, 4, 8, 16]) {
        const { maxPlanBytes } = resolvePoolBudget({
          deviceBudgetBytes,
          poolCount,
          slotBytes: SLOT_BYTES,
          totalBrickBytes: HUGE_PYRAMID,
        });
        const oldShare = deviceBudgetBytes / Math.max(1, poolCount);
        const oldPlanCap = Math.min(MIN_LAYER_POOL_BYTES, oldShare);
        const oldMaxPlan = Math.max(
          SLOT_BYTES,
          Math.min(oldShare, oldPlanCap + headroom) - headroom,
        );
        expect(maxPlanBytes).toBeGreaterThanOrEqual(oldMaxPlan);
      }
    }
  });

  it("keeps the summed atlas allocation inside the device budget", () => {
    // The reserve exists so pool #1 cannot spend the budget pool #2 will need.
    for (const deviceBudgetBytes of [512 * MiB, 1024 * MiB, 2048 * MiB]) {
      for (const poolCount of [2, 3, 4, 5]) {
        const { atlasBytes } = resolvePoolBudget({
          deviceBudgetBytes,
          poolCount,
          slotBytes: SLOT_BYTES,
          totalBrickBytes: HUGE_PYRAMID,
        });
        expect(atlasBytes * poolCount).toBeLessThanOrEqual(deviceBudgetBytes);
      }
    }
  });

  it("a lone pool reserves half the budget for the image opened next", () => {
    const alone = budget({ deviceBudgetBytes: 2048 * MiB, poolCount: 1 });
    const paired = budget({ deviceBudgetBytes: 2048 * MiB, poolCount: 2 });
    // Opening a second image must not shrink what the first one already got.
    expect(alone.maxPlanBytes).toBe(paired.maxPlanBytes);
  });
});

/**
 * The automatic plan stops at MAX_AUTO_PLAN_BYTES. A plan sized from the
 * card's memory — 1.5 GiB per pool on a 12 GiB card — is twelve times the
 * flat cap of August 2026, and the raymarch stride follows the plan's finest
 * level, so the extra resolution was also the extra frame time that made
 * large volumes feel slower. The user's own GPU budget lifts the ceiling.
 */
describe("resolvePoolBudget — the automatic plan ceiling", () => {
  afterEach(() => resetRendererBudgetForTests());

  const headroom = MIN_POOL_HEADROOM_SLOTS * SLOT_BYTES;
  /** Half of a 12 GiB card: what the hardware probe resolves to. */
  const BIG_CARD = 6144 * MiB;

  it("stops the automatic plan at the ceiling, and the atlas with it", () => {
    const { maxPlanBytes, atlasBytes } = budget({ deviceBudgetBytes: BIG_CARD });
    expect(maxPlanBytes).toBe(MAX_AUTO_PLAN_BYTES);
    expect(atlasBytes).toBe(MAX_AUTO_PLAN_BYTES + headroom);
    expect(resolveAutoPlanCapBytes()).toBe(MAX_AUTO_PLAN_BYTES);
  });

  it("a GPU budget the user set lifts the ceiling", () => {
    applyRendererBudgetSettings({ rendererGpuBudgetMB: 6144 });
    expect(getRendererBudget().gpuSource.kind).toBe("custom");
    expect(resolveAutoPlanCapBytes()).toBe(Number.POSITIVE_INFINITY);
    const { maxPlanBytes } = budget({ deviceBudgetBytes: BIG_CARD });
    // share/2 × POOL_PLAN_SHARE_FRACTION on a lone pool: 6144/2/2 MiB.
    expect(maxPlanBytes).toBe(
      Math.floor((BIG_CARD / POOL_RESERVE_COUNT) * POOL_PLAN_SHARE_FRACTION),
    );
    expect(maxPlanBytes).toBeGreaterThan(MAX_AUTO_PLAN_BYTES);
  });

  it("an explicit ceiling pins either side", () => {
    const lifted = budget({ deviceBudgetBytes: BIG_CARD, planCapCeilingBytes: Infinity });
    expect(lifted.maxPlanBytes).toBe(1536 * MiB);
    const held = budget({ deviceBudgetBytes: BIG_CARD, planCapCeilingBytes: 256 * MiB });
    expect(held.maxPlanBytes).toBe(256 * MiB);
  });

  it("never pushes a plan below the 128 MiB floor or past a starved share", () => {
    expect(budget({ deviceBudgetBytes: 512 * MiB, planCapCeilingBytes: 1 }).maxPlanBytes).toBe(
      MIN_LAYER_POOL_BYTES,
    );
    const starved = budget({ deviceBudgetBytes: 150 * MiB, planCapCeilingBytes: 1 });
    expect(starved.atlasBytes).toBeLessThanOrEqual(150 * MiB);
  });

  it("is a no-op on budgets the ceiling does not reach", () => {
    for (const deviceBudgetBytes of [256 * MiB, 512 * MiB, 1024 * MiB, 2048 * MiB]) {
      for (const poolCount of [1, 2, 4]) {
        const auto = resolvePoolBudget({
          deviceBudgetBytes,
          poolCount,
          slotBytes: SLOT_BYTES,
          totalBrickBytes: HUGE_PYRAMID,
        });
        const lifted = resolvePoolBudget({
          deviceBudgetBytes,
          poolCount,
          slotBytes: SLOT_BYTES,
          totalBrickBytes: HUGE_PYRAMID,
          planCapCeilingBytes: Infinity,
        });
        expect(auto).toEqual(lifted);
      }
    }
  });
});

/**
 * The floor and the allowance are DECODE currency, derived from the chunk
 * cache — not from `maxPlanBytes`, which is GPU slot currency. Conflating the
 * two is what allowed a level to be unlocked against a slot budget the cache
 * could never feed.
 */
describe("decode budgets", () => {
  it("floors the decode budget at the old flat cap, so nothing is demoted", () => {
    // The regression guard: however small the cache share, the floor never
    // drops below what datasets plan against today.
    expect(resolveDecodeFloorBytes({ decodeCacheShareBytes: 0 })).toBe(MIN_LAYER_POOL_BYTES);
    expect(resolveDecodeFloorBytes({ decodeCacheShareBytes: 256 * MiB })).toBe(
      MIN_LAYER_POOL_BYTES,
    );
  });

  it("scales the floor with the cache once that exceeds the old cap", () => {
    expect(resolveDecodeFloorBytes({ decodeCacheShareBytes: 1024 * MiB })).toBe(256 * MiB);
    expect(resolveDecodeFloorBytes({ decodeCacheShareBytes: 4096 * MiB })).toBe(1024 * MiB);
  });

  it("reserves the coarse fallback chain before handing out an allowance", () => {
    // The shader reads the fallback chain on every unmapped sample, and it
    // lives in the same cache — so it is reserved, not competed with.
    const share = 1024 * MiB;
    const floorLevelBytes = 600 * MiB;
    expect(resolveDecodeAllowanceBytes({ decodeCacheShareBytes: share, floorLevelBytes })).toBe(
      Math.floor(share - COARSE_CHAIN_RESERVE * floorLevelBytes),
    );
  });

  it("never returns a negative allowance when the floor level fills the cache", () => {
    expect(
      resolveDecodeAllowanceBytes({
        decodeCacheShareBytes: 512 * MiB,
        floorLevelBytes: 512 * MiB,
      }),
    ).toBe(0);
  });

  it("holds the coupling: reserve x floor + allowance <= cache share", () => {
    // THE invariant. Any level the planner unlocks has a chunk working set the
    // cache can hold — the thrash becomes structurally impossible.
    //
    // Swept over floor levels the planner can actually produce: `budgetMinLevel`
    // is the first level whose bytes fit `resolveDecodeFloorBytes` = a quarter
    // of the share, so the floor level never exceeds that. (The one exception —
    // no level fits at all — is the degenerate case below, where the allowance
    // is 0 and there is nothing to bound.)
    for (const share of [256 * MiB, 512 * MiB, 1024 * MiB, 2048 * MiB, 4096 * MiB]) {
      const floor = resolveDecodeFloorBytes({ decodeCacheShareBytes: share });
      for (const floorLevelBytes of [0, floor / 4, floor / 2, floor]) {
        const allowance = resolveDecodeAllowanceBytes({
          decodeCacheShareBytes: share,
          floorLevelBytes,
        });
        expect(COARSE_CHAIN_RESERVE * floorLevelBytes + allowance).toBeLessThanOrEqual(share);
      }
    }
  });

  it("yields nothing when the floor level alone would blow the cache", () => {
    // Degenerate but reachable: no level fits, so budgetMinLevel is the coarsest
    // and its own chunks exceed the share. Sub-floor refinement must be off, not
    // merely small — there is no room to buy anything with.
    expect(
      resolveDecodeAllowanceBytes({
        decodeCacheShareBytes: 256 * MiB,
        floorLevelBytes: 600 * MiB,
      }),
    ).toBe(0);
  });

  it("lets a 2D plane plan fill most of the share, and never all of it", () => {
    // Chunk by chunk, so the share itself is the bound — less the room the
    // adjacent-slab prefetch and the previous plan's chunks need beside it.
    for (const share of [128 * MiB, 737 * MiB, 3070 * MiB]) {
      const budget = resolveDecodeBudgetBytes({ decodeCacheShareBytes: share });
      expect(budget).toBe(Math.floor(DECODE_BUDGET_CACHE_FRACTION * share));
      expect(budget).toBeLessThan(share);
      // More than the floor + allowance could commit to between them.
      expect(budget).toBeGreaterThan(Math.floor(0.75 * share));
    }
    expect(resolveDecodeBudgetBytes({ decodeCacheShareBytes: 0 })).toBe(0);
  });

  it("splits the cache per pool", () => {
    expect(
      resolveDecodeCacheShareBytes({ decodedChunkCacheBytes: 1024 * MiB, poolCount: 4 }),
    ).toBe(256 * MiB);
    // Never divides by zero.
    expect(
      resolveDecodeCacheShareBytes({ decodedChunkCacheBytes: 512 * MiB, poolCount: 0 }),
    ).toBe(512 * MiB);
  });
});

/**
 * The clamp `nodePlanTracker` applies on top of the split: atlases are never
 * resized, so a plan must fit the allocation that actually exists. The headroom
 * it withholds has to be capped by the pyramid, or a small pool's plan collapses
 * to a single slot — which zeroes `planLayerNodes`' refineBudgetBytes and pins
 * every small dataset at the coarsest level at every zoom (P25).
 */
describe("resolvePlanBytesForAtlas", () => {
  const clamp = (over: Partial<Parameters<typeof resolvePlanBytesForAtlas>[0]> = {}) =>
    resolvePlanBytesForAtlas({
      liveAtlasBytes: 200 * SLOT_BYTES,
      resolvedMaxPlanBytes: HUGE_PYRAMID,
      slotBytes: SLOT_BYTES,
      totalBrickBytes: HUGE_PYRAMID,
      ...over,
    });

  it("withholds NOTHING when the whole pyramid fits the live atlas", () => {
    // The reported dataset: 9 bricks, atlas sized to exactly the pyramid.
    // Nothing can ever be out-of-plan, so headroom would only cost resolution.
    const atlas = 9 * SLOT_BYTES;
    expect(clamp({ liveAtlasBytes: atlas, totalBrickBytes: atlas })).toBe(atlas);
  });

  it("does not collapse a small atlas to one slot", () => {
    // 9 slots minus a flat 64 went negative and floored at 1 — the bug.
    const atlas = 9 * SLOT_BYTES;
    expect(clamp({ liveAtlasBytes: atlas })).toBeGreaterThan(SLOT_BYTES);
    expect(clamp({ liveAtlasBytes: atlas })).toBe(5 * SLOT_BYTES); // half withheld
  });

  it("keeps the FULL headroom on a pool big enough to have it", () => {
    expect(clamp()).toBe((200 - MIN_POOL_HEADROOM_SLOTS) * SLOT_BYTES);
  });

  it("never exceeds the resolved plan budget", () => {
    expect(clamp({ resolvedMaxPlanBytes: 4 * SLOT_BYTES })).toBe(4 * SLOT_BYTES);
  });

  it("is never STRICTER than the flat-64 reserve it replaced, at any pool size", () => {
    // The invariant that keeps `ensurePool` (which still floors its allocation
    // with the raw constant) and this clamp compatible: the cap only ever
    // withholds LESS, so a plan can never shrink because of it. The 10..128
    // slot band is where the two rules actually differ.
    for (const atlasSlots of [10, 20, 40, 64, 100, 128, 200]) {
      const liveAtlasBytes = atlasSlots * SLOT_BYTES;
      const flat64 = Math.max(
        SLOT_BYTES,
        Math.min(HUGE_PYRAMID, liveAtlasBytes - MIN_POOL_HEADROOM_SLOTS * SLOT_BYTES),
      );
      expect(clamp({ liveAtlasBytes })).toBeGreaterThanOrEqual(flat64);
    }
    // …and above the band the two are byte-identical (full headroom kept).
    expect(clamp({ liveAtlasBytes: 200 * SLOT_BYTES })).toBe(
      (200 - MIN_POOL_HEADROOM_SLOTS) * SLOT_BYTES,
    );
    // A 40-slot atlas: 20 withheld instead of an impossible 64.
    expect(clamp({ liveAtlasBytes: 40 * SLOT_BYTES })).toBe(20 * SLOT_BYTES);
  });

  it("never returns less than one slot", () => {
    expect(clamp({ liveAtlasBytes: 0, totalBrickBytes: HUGE_PYRAMID })).toBe(SLOT_BYTES);
  });
});

describe("getDecodedChunkCacheBytes", () => {
  const hardware = {
    probedAt: "2026-10-07T10:00:00.000Z",
    totalRamMB: 32768,
    gpus: [{ vendor: "NVIDIA Corporation", model: "RTX 4070", vramMB: 12282, vramDynamic: false }],
  };

  afterEach(() => {
    resetDecodedChunkCacheBytesForTests();
    resetRendererBudgetForTests();
  });

  it("stays what it was first read as, whatever the settings do afterwards", () => {
    // The cache is built once per session; the planner asks on every replan.
    // If the two drift apart the planner admits a working set the cache
    // cannot hold — which is exactly what the first-start hardware probe
    // would do, raising the automatic size several-fold mid-session.
    const atBoot = getDecodedChunkCacheBytes();
    expect(atBoot).toBe(512 * MiB);
    applyRendererBudgetSettings({ rendererHardware: hardware });
    expect(getRendererBudget().decodeCacheBytes).toBeGreaterThan(atBoot);
    expect(getDecodedChunkCacheBytes()).toBe(atBoot);
  });

  it("takes the stored size at the next start", () => {
    applyRendererBudgetSettings({ rendererHardware: hardware, rendererDecodeCacheMB: 1024 });
    expect(getDecodedChunkCacheBytes()).toBe(1024 * MiB);
  });
});
