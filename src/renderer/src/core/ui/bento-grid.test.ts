import {describe, expect, it} from "vitest";

import {solveBento} from "./bento-grid";

const fixed = (w: number, h = 1) => [{w, h, cost: 0}];

/** Cells covered by the placements, failing on any overlap. */
const cover = (placements: ReturnType<typeof solveBento>) => {
  const cells = new Set<string>();
  for (const p of placements)
    for (let c = p.col; c < p.col + p.w; c++)
      for (let r = p.row; r < p.row + p.h; r++) {
        const key = `${c},${r}`;
        expect(cells.has(key)).toBe(false);
        cells.add(key);
      }
  return cells;
};

describe("solveBento", () => {
  it("packs fixed spans into a full grid", () => {
    const placements = solveBento([fixed(2, 2), fixed(2), fixed(1), fixed(1)], 4, 10, 10);

    expect(placements.map(p => [p.col, p.row, p.w, p.h])).toEqual([
      [0, 0, 2, 2],
      [2, 0, 2, 1],
      [2, 1, 1, 1],
      [3, 1, 1, 1],
    ]);
    expect(cover(placements).size).toBe(8);
  });

  it("keeps input order", () => {
    const placements = solveBento([fixed(3), fixed(2), fixed(1), fixed(4), fixed(1)], 4, 10, 10);

    expect(placements.map(p => p.index)).toEqual([0, 1, 2, 3, 4]);
    for (let i = 1; i < placements.length; i++) {
      const [a, b] = [placements[i - 1], placements[i]];
      expect(b.row > a.row || (b.row === a.row && b.col > a.col)).toBe(true);
    }
  });

  it("flexes an item to close a gap", () => {
    // A 3-wide tile leaves one column; the second prefers 2 but may shrink to 1.
    const flexible = [
      {w: 2, h: 1, cost: 0},
      {w: 1, h: 1, cost: 2},
    ];
    const placements = solveBento([fixed(3), flexible], 4, 10, 10);

    expect(placements[1]).toMatchObject({col: 3, row: 0, w: 1});
  });

  it("refuses an item that fits no column count", () => {
    expect(() => solveBento([fixed(5)], 4, 10, 10)).toThrow(/no size that fits/);
  });
});
