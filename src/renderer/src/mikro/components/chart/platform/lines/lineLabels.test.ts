import { describe, expect, it } from "vitest";
import { LINE_LABEL_PX, placeLineLabels, valueAtLeft } from "./lineLabels";

describe("valueAtLeft", () => {
  const xs = [10, 20, 30];
  const ys = [1, 3, 5];

  it("reads the line where it crosses the edge", () => {
    expect(valueAtLeft(xs, ys, 15)).toBe(2);
  });

  it("takes the line's start when it begins inside the window", () => {
    expect(valueAtLeft(xs, ys, 0)).toBe(1);
  });

  it("is null for a line that ended before the edge", () => {
    expect(valueAtLeft(xs, ys, 31)).toBeNull();
    expect(valueAtLeft([], [], 0)).toBeNull();
  });
});

describe("placeLineLabels", () => {
  const box = { top: 0, bottom: 120 };

  it("centres a name on its line", () => {
    expect(placeLineLabels([30, 90], box)).toEqual([
      { line: 0, topPx: 30 - LINE_LABEL_PX / 2 },
      { line: 1, topPx: 90 - LINE_LABEL_PX / 2 },
    ]);
  });

  it("spreads the names of lines that run together, in the lines' order", () => {
    const placed = placeLineLabels([61, 60, null], box);
    expect(placed.map((l) => l.line)).toEqual([1, 0]);
    expect(placed[1].topPx - placed[0].topPx).toBe(LINE_LABEL_PX);
  });

  it("keeps every name inside the box", () => {
    const placed = placeLineLabels([119, 119, -5], box);
    expect(placed[0].topPx).toBe(0);
    expect(placed[2].topPx).toBe(120 - LINE_LABEL_PX);
    expect(placed[1].topPx).toBe(120 - 2 * LINE_LABEL_PX);
  });

  it("names every k-th line when there is no room for all", () => {
    const placed = placeLineLabels(Array.from({ length: 40 }, (_, i) => i * 3), box);
    expect(placed.length).toBeLessThanOrEqual(10);
    expect(placed.map((l) => l.line)).toEqual([0, 4, 8, 12, 16, 20, 24, 28, 32, 36]);
  });
});
