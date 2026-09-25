import type { Vec3 } from "../../../platform/coords/levelGeometry";

/**
 * Pure CPU slot bookkeeping for one brick atlas: which node key occupies
 * which atlas slot, LRU eviction among unprotected keys. No WebGL here — the
 * residency manager translates acquisitions into texture uploads and page
 * table writes.
 *
 * LRU order is the Map's insertion order: `touch` re-inserts, eviction scans
 * from the front.
 */

export type SlotRef = { index: number; coords: Vec3 };

export type ProtectedKeys = { has(key: string): boolean };

export class BrickPoolState {
  readonly capacity: number;
  private readonly keyToSlot = new Map<string, number>();
  private readonly freeSlots: number[] = [];

  constructor(readonly slotGrid: Vec3) {
    this.capacity = slotGrid[0] * slotGrid[1] * slotGrid[2];
    for (let i = this.capacity - 1; i >= 0; i--) this.freeSlots.push(i);
  }

  get size(): number {
    return this.keyToSlot.size;
  }

  slotCoords(index: number): Vec3 {
    const [gx, gy] = this.slotGrid;
    return [index % gx, Math.floor(index / gx) % gy, Math.floor(index / (gx * gy))];
  }

  has(key: string): boolean {
    return this.keyToSlot.has(key);
  }

  slotOf(key: string): SlotRef | null {
    const index = this.keyToSlot.get(key);
    return index === undefined ? null : { index, coords: this.slotCoords(index) };
  }

  keys(): IterableIterator<string> {
    return this.keyToSlot.keys();
  }

  /**
   * Get (or keep) a slot for `key`, evicting the least-recently-used
   * unprotected occupant when the pool is full. Returns null only when every
   * slot is protected — the caller then simply stops mapping new bricks.
   * The evicted key (if any) is reported so the manager can unmap its page
   * entry.
   */
  acquire(
    key: string,
    protectedKeys: ProtectedKeys,
  ): { slot: SlotRef; evictedKey: string | null } | null {
    const existing = this.keyToSlot.get(key);
    if (existing !== undefined) {
      this.keyToSlot.delete(key);
      this.keyToSlot.set(key, existing);
      return { slot: { index: existing, coords: this.slotCoords(existing) }, evictedKey: null };
    }

    let evictedKey: string | null = null;
    let index = this.freeSlots.pop();
    if (index === undefined) {
      for (const candidate of this.keyToSlot.keys()) {
        if (!protectedKeys.has(candidate)) {
          evictedKey = candidate;
          break;
        }
      }
      if (evictedKey === null) return null;
      index = this.keyToSlot.get(evictedKey)!;
      this.keyToSlot.delete(evictedKey);
    }

    this.keyToSlot.set(key, index);
    return { slot: { index, coords: this.slotCoords(index) }, evictedKey };
  }

  release(key: string): void {
    const index = this.keyToSlot.get(key);
    if (index === undefined) return;
    this.keyToSlot.delete(key);
    this.freeSlots.push(index);
  }

  /** Mark keys as recently used (plan reconciliation calls this per frame). */
  touch(keys: Iterable<string>): void {
    for (const key of keys) {
      const index = this.keyToSlot.get(key);
      if (index === undefined) continue;
      this.keyToSlot.delete(key);
      this.keyToSlot.set(key, index);
    }
  }

  clear(): void {
    this.keyToSlot.clear();
    this.freeSlots.length = 0;
    for (let i = this.capacity - 1; i >= 0; i--) this.freeSlots.push(i);
  }
}

/**
 * Residents the pool can release because the shader provably cannot sample
 * them: bricks FINER than the plan's target level.
 *
 * Why this is needed at all: eviction here is entirely lazy — it happens only
 * inside `acquire` when `freeSlots` runs dry, and nothing ever walks the
 * residents to release them. So a pool that was once zoomed in keeps its
 * level-0 bricks forever, even after the plan moves to a coarser target. A
 * reported session showed capacity 217 with 86 protected plan bricks and 131
 * level-0 leftovers — 86 + 131 = 217 exactly, i.e. every non-plan slot held a
 * brick that could never be read. The intended cache headroom was fully
 * consumed, so every newly planned brick cost an eviction and every
 * out-of-plan drain found no free slot and threw away a completed fetch.
 *
 * Safety: the shader's residency walk starts at the desired level and moves
 * COARSER, so a brick finer than `minTargetLevel` is unreachable. Coarser
 * bricks — the fallback chain, including the pinned coarsest level — are never
 * eligible, and `protectedKeys` (plan ∪ coarsest) is excluded outright.
 *
 * Returns at most `needed` keys, least-recently-used first, so callers can
 * reclaim exactly the headroom they want rather than flushing the cache.
 */
export function selectTrimCandidates(opts: {
  /** Resident keys in LRU order (front = oldest) — `BrickPoolState.keys()`. */
  keys: Iterable<string>;
  protectedKeys: ProtectedKeys;
  /** Level of a node key — `parseNodeKey(key).level`. */
  levelOf: (key: string) => number;
  /** Minimum target level across every plan sharing this pool. */
  minTargetLevel: number;
  /** How many slots to reclaim. */
  needed: number;
}): string[] {
  const { keys, protectedKeys, levelOf, minTargetLevel, needed } = opts;
  if (needed <= 0) return [];
  const victims: string[] = [];
  for (const key of keys) {
    if (victims.length >= needed) break;
    if (protectedKeys.has(key)) continue;
    if (levelOf(key) >= minTargetLevel) continue; // coarser-or-equal: reachable
    victims.push(key);
  }
  return victims;
}
