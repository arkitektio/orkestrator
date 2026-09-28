import { describe, expect, it } from "vitest";
import { BrickPoolState, selectTrimCandidates } from "./brickPoolState";

const NONE = { has: () => false };
const protecting = (...keys: string[]) => new Set(keys);

describe("BrickPoolState", () => {
  it("hands out distinct slots up to capacity", () => {
    const pool = new BrickPoolState([2, 2, 1]);
    expect(pool.capacity).toBe(4);
    const slots = ["a", "b", "c", "d"].map((k) => pool.acquire(k, NONE)!.slot.index);
    expect(new Set(slots).size).toBe(4);
    expect(pool.size).toBe(4);
  });

  it("maps slot indices to x-fastest atlas coords", () => {
    const pool = new BrickPoolState([2, 2, 2]);
    expect(pool.slotCoords(0)).toEqual([0, 0, 0]);
    expect(pool.slotCoords(1)).toEqual([1, 0, 0]);
    expect(pool.slotCoords(2)).toEqual([0, 1, 0]);
    expect(pool.slotCoords(4)).toEqual([0, 0, 1]);
  });

  it("evicts the least-recently-used unprotected key when full", () => {
    const pool = new BrickPoolState([2, 1, 1]);
    pool.acquire("old", NONE);
    pool.acquire("new", NONE);
    const result = pool.acquire("incoming", protecting("new"))!;
    expect(result.evictedKey).toBe("old");
    expect(pool.has("old")).toBe(false);
    expect(pool.slotOf("incoming")!.index).toBe(pool.slotOf("incoming")!.index);
  });

  it("touch refreshes recency so scanning starts elsewhere", () => {
    const pool = new BrickPoolState([2, 1, 1]);
    pool.acquire("a", NONE);
    pool.acquire("b", NONE);
    pool.touch(["a"]);
    expect(pool.acquire("c", NONE)!.evictedKey).toBe("b");
  });

  it("re-acquiring a resident key keeps its slot and refreshes recency", () => {
    const pool = new BrickPoolState([2, 1, 1]);
    const first = pool.acquire("a", NONE)!.slot.index;
    pool.acquire("b", NONE);
    const again = pool.acquire("a", NONE)!;
    expect(again.slot.index).toBe(first);
    expect(again.evictedKey).toBeNull();
    expect(pool.acquire("c", NONE)!.evictedKey).toBe("b");
  });

  it("returns null when every occupant is protected", () => {
    const pool = new BrickPoolState([1, 1, 1]);
    pool.acquire("pinned", NONE);
    expect(pool.acquire("x", protecting("pinned"))).toBeNull();
    expect(pool.has("pinned")).toBe(true);
  });

  it("an all-protected sentinel acquires free slots but never evicts", () => {
    const pool = new BrickPoolState([2, 1, 1]);
    const freeOnly = { has: () => true };
    pool.acquire("a", NONE);
    expect(pool.acquire("b", freeOnly)).not.toBeNull(); // free slot available
    expect(pool.acquire("c", freeOnly)).toBeNull(); // full: no eviction allowed
    expect(pool.has("a")).toBe(true);
    expect(pool.has("b")).toBe(true);
  });

  it("release returns the slot to the free list", () => {
    const pool = new BrickPoolState([1, 1, 1]);
    const slot = pool.acquire("a", NONE)!.slot.index;
    pool.release("a");
    expect(pool.size).toBe(0);
    expect(pool.acquire("b", NONE)!.slot.index).toBe(slot);
  });

  it("clear resets occupancy and capacity", () => {
    const pool = new BrickPoolState([2, 1, 1]);
    pool.acquire("a", NONE);
    pool.acquire("b", NONE);
    pool.clear();
    expect(pool.size).toBe(0);
    expect(pool.acquire("c", NONE)).not.toBeNull();
    expect(pool.acquire("d", NONE)).not.toBeNull();
  });
});

describe("selectTrimCandidates", () => {
  const protecting = (...keys: string[]) => new Set(keys);
  /** Keys are "<level>:<n>" here so levelOf is trivial to read in the cases. */
  const levelOf = (key: string) => Number(key.split(":")[0]);

  const select = (opts: {
    keys: string[];
    protectedKeys?: Set<string>;
    minTargetLevel: number;
    needed: number;
  }) =>
    selectTrimCandidates({
      keys: opts.keys,
      protectedKeys: opts.protectedKeys ?? protecting(),
      levelOf,
      minTargetLevel: opts.minTargetLevel,
      needed: opts.needed,
    });

  it("returns only residents FINER than the target level", () => {
    // Coarser bricks are the shader's fallback chain — its residency walk starts
    // at the desired level and moves coarser, so those stay reachable.
    const keys = ["0:a", "1:b", "2:c", "0:d"];
    expect(select({ keys, minTargetLevel: 1, needed: 10 })).toEqual(["0:a", "0:d"]);
  });

  it("never returns a protected key", () => {
    const keys = ["0:a", "0:b", "0:c"];
    expect(
      select({ keys, protectedKeys: protecting("0:a", "0:c"), minTargetLevel: 1, needed: 10 }),
    ).toEqual(["0:b"]);
  });

  it("walks in the given (LRU) order and stops at `needed`", () => {
    // BrickPoolState.keys() yields insertion order, oldest first, so the least
    // recently used unreachable brick is reclaimed first.
    const keys = ["0:oldest", "0:middle", "0:newest"];
    expect(select({ keys, minTargetLevel: 1, needed: 2 })).toEqual(["0:oldest", "0:middle"]);
  });

  it("returns nothing when the plan is already at the finest level", () => {
    // targetLevel 0: every resident is potentially reachable.
    expect(select({ keys: ["0:a", "1:b"], minTargetLevel: 0, needed: 10 })).toEqual([]);
  });

  it("returns nothing when no headroom is requested", () => {
    expect(select({ keys: ["0:a"], minTargetLevel: 2, needed: 0 })).toEqual([]);
    expect(select({ keys: ["0:a"], minTargetLevel: 2, needed: -1 })).toEqual([]);
  });

  it("reclaims exactly the reported 131-of-217 case", () => {
    // capacity 217, 86 protected plan bricks (levels >= 1), 131 level-0
    // leftovers from an earlier zoomed-in plan that nothing ever released.
    const planned = Array.from({ length: 86 }, (_, i) => `1:p${i}`);
    const leftovers = Array.from({ length: 131 }, (_, i) => `0:s${i}`);
    const victims = select({
      keys: [...leftovers, ...planned],
      protectedKeys: protecting(...planned),
      minTargetLevel: 1,
      needed: 64, // MIN_POOL_HEADROOM_SLOTS
    });
    expect(victims).toHaveLength(64);
    expect(victims.every((k) => k.startsWith("0:"))).toBe(true);
    expect(victims.some((k) => planned.includes(k))).toBe(false);
  });
});
