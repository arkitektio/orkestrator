import { nodeKey } from "./nodeAddress";

/**
 * One-entry-per-level memo of `nodeKey(level, brick)`.
 *
 * The CPU probe march samples ~256 points along a ray and resolves residency
 * per level at each one, and every resolution built a fresh key string just to
 * look it up in the pool's maps — order 10³ short-lived strings per hover
 * frame. Consecutive march steps overwhelmingly land in the SAME brick, so a
 * single remembered key per level absorbs almost all of it.
 *
 * **This needs no invalidation.** The key is a pure function of `(level,
 * brick)`; what it addresses may come and go, but the string never becomes
 * wrong. Callers still perform every map lookup they did before, so residency
 * semantics are unchanged — this is a garbage-avoidance cache, not a residency
 * cache. (Contrast `brickResidency`'s `lastChunkRead`, which memoizes a
 * RESULT and leans on decoded chunks being immutable.)
 */
export interface NodeKeyMemo {
  keyFor(level: number, bx: number, by: number, bz: number): string;
}

export function createNodeKeyMemo(levelCount: number): NodeKeyMemo {
  const slots: ({ bx: number; by: number; bz: number; key: string } | null)[] = new Array(
    Math.max(0, levelCount),
  ).fill(null);

  return {
    keyFor(level, bx, by, bz) {
      // Out-of-range levels are addressed correctly, just not memoized —
      // cheaper than growing the array on a path that should never hit it.
      if (level < 0 || level >= slots.length) return nodeKey(level, [bx, by, bz]);
      const slot = slots[level];
      if (slot !== null && slot.bx === bx && slot.by === by && slot.bz === bz) {
        return slot.key;
      }
      const key = nodeKey(level, [bx, by, bz]);
      slots[level] = { bx, by, bz, key };
      return key;
    },
  };
}
