import { describe, expect, it } from "vitest";
import { boxGeometry, histogramGeometry } from "./distributionModel";

describe("histogram geometry", () => {
  it("draws one bar per non-empty bin over the shared domain", () => {
    const g = histogramGeometry([{ name: "all", n: 3 }], [{ group: "all", bin: 0, n: 2 }, { group: "all", bin: 2, n: 1 }], { lo: 0, hi: 3 }, 3);
    expect(Array.from(g.quads)).toEqual([0, 1, 0, 2, 2, 3, 0, 1]);
    expect(g.maxHeight).toBe(2);
    expect(g.normalized).toBe(false);
  });
  it("normalizes each group by its own rows when there are several", () => {
    const g = histogramGeometry(
      [{ name: "a", n: 10 }, { name: "b", n: 2 }],
      [{ group: "a", bin: 0, n: 5 }, { group: "b", bin: 0, n: 2 }],
      { lo: 0, hi: 1 },
      1,
    );
    expect(g.normalized).toBe(true);
    expect(Array.from(g.heights)).toEqual([0.5, 1]);
    expect(Array.from(g.barGroup)).toEqual([0, 1]);
  });
  it("closes each group's outline back to zero", () => {
    const g = histogramGeometry([{ name: "all", n: 1 }], [{ group: "all", bin: 0, n: 1 }], { lo: 0, hi: 1 }, 1);
    expect(g.outline).toEqual([0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0]);
  });
});

describe("box geometry", () => {
  it("lays group i in the slot [i, i+1], quartiles as the body", () => {
    const g = boxGeometry([
      { group: "a", n: 5, lo: 0, q1: 1, q2: 2, q3: 3, hi: 4 },
      { group: "b", n: 5, lo: 1, q1: 2, q2: 3, q3: 4, hi: 9 },
    ]);
    expect(Array.from(g.quads.slice(4, 8))).toEqual([1.22, 1.78, 2, 4]);
    expect(g.extent).toEqual({ y0: 0, y1: 9 });
    expect(g.segmentGroup.filter((i) => i === 1)).toHaveLength(9);
  });
});
