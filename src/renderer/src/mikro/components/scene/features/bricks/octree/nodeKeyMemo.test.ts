import { describe, expect, it } from "vitest";
import { createNodeKeyMemo } from "./nodeKeyMemo";
import { nodeKey } from "./nodeAddress";

describe("createNodeKeyMemo", () => {
  it("agrees with nodeKey over a random walk", () => {
    const memo = createNodeKeyMemo(4);
    let seed = 1;
    const next = (bound: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % bound;
    };
    for (let i = 0; i < 200; i++) {
      const level = next(4);
      const brick: [number, number, number] = [next(9), next(9), next(9)];
      expect(memo.keyFor(level, ...brick)).toBe(nodeKey(level, brick));
    }
  });

  it("returns the IDENTICAL string on a repeat — the whole point", () => {
    const memo = createNodeKeyMemo(2);
    const first = memo.keyFor(1, 2, 3, 4);
    const second = memo.keyFor(1, 2, 3, 4);
    expect(second).toBe(first);
    // `toBe` on strings is value equality, so assert identity explicitly.
    expect(Object.is(first, second)).toBe(true);
  });

  it("re-derives when any brick coordinate changes", () => {
    const memo = createNodeKeyMemo(2);
    const base = memo.keyFor(0, 1, 1, 1);
    expect(memo.keyFor(0, 2, 1, 1)).not.toBe(base);
    expect(memo.keyFor(0, 1, 2, 1)).not.toBe(base);
    expect(memo.keyFor(0, 1, 1, 2)).not.toBe(base);
  });

  it("keeps levels independent, so alternating levels do not thrash", () => {
    const memo = createNodeKeyMemo(3);
    const level0 = memo.keyFor(0, 5, 5, 5);
    const level2 = memo.keyFor(2, 7, 7, 7);
    // Interleave: each level must still hit its own slot.
    expect(Object.is(memo.keyFor(0, 5, 5, 5), level0)).toBe(true);
    expect(Object.is(memo.keyFor(2, 7, 7, 7), level2)).toBe(true);
    expect(Object.is(memo.keyFor(0, 5, 5, 5), level0)).toBe(true);
  });

  it("still addresses correctly for a level outside the memo range", () => {
    const memo = createNodeKeyMemo(1);
    expect(memo.keyFor(5, 1, 2, 3)).toBe(nodeKey(5, [1, 2, 3]));
    expect(memo.keyFor(-1, 1, 2, 3)).toBe(nodeKey(-1, [1, 2, 3]));
  });
});
