import { describe, expect, it } from "vitest";

import { STAGE_GAP, stageLayout, stageRowWidth } from "./stageLayout";

const grid = (count: number, width: number, height: number) => {
  const layout = stageLayout(count, width, height);
  return layout && [layout.columns, layout.rows];
};

describe("stageLayout", () => {
  it("puts four people in one row in a short wide strip", () => {
    expect(grid(4, 1600, 300)).toEqual([4, 1]);
  });

  it("stacks them in a tall narrow pane", () => {
    expect(grid(4, 400, 1200)).toEqual([1, 4]);
  });

  it("makes a square of them in a screen-shaped pane", () => {
    expect(grid(4, 1600, 900)).toEqual([2, 2]);
    expect(grid(5, 1600, 900)).toEqual([3, 2]);
    expect(grid(2, 1600, 900)).toEqual([2, 1]);
    expect(grid(2, 900, 1200)).toEqual([1, 2]);
  });

  it("fits one tile to whichever side runs out first", () => {
    expect(stageLayout(1, 1600, 300)).toMatchObject({ tileHeight: 299, tileWidth: 533 });
    expect(stageLayout(1, 400, 1200)).toMatchObject({ tileWidth: 400, tileHeight: 225 });
  });

  it("never asks for more room than the stage has, and keeps the tiles 16:9", () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7, 9, 12, 20]) {
      for (const [width, height] of [[1600, 300], [1600, 900], [900, 900], [400, 1200], [320, 240], [2400, 160]]) {
        const layout = stageLayout(count, width, height);
        expect(layout, `${count} in ${width}x${height}`).not.toBeNull();
        if (!layout) continue;
        expect(layout.columns * layout.rows).toBeGreaterThanOrEqual(count);
        expect(stageRowWidth(layout)).toBeLessThanOrEqual(width);
        expect(layout.rows * layout.tileHeight + STAGE_GAP * (layout.rows - 1)).toBeLessThanOrEqual(height);
        expect(Math.abs(layout.tileWidth / layout.tileHeight - 16 / 9)).toBeLessThan(0.08);
      }
    }
  });

  it("has nothing to say before the stage is measured, or with nobody in it", () => {
    expect(stageLayout(4, 0, 0)).toBeNull();
    expect(stageLayout(0, 1600, 900)).toBeNull();
  });
});
