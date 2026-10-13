import { describe, expect, it } from "vitest";
import { boxOutline, depthPixelsPerStep, depthSteps, rectOutline } from "./cropGesture";

describe("crop outline", () => {
  it("closes the rectangle at the given height", () => {
    const points = rectOutline([0, 0, 9], [4, 2, 9], 3);
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual(points[4]);
    expect(points.every((p) => p[2] === 3)).toBe(true);
  });

  it("walks all twelve edges of the box", () => {
    const points = boxOutline({ min: [0, 0, 0], max: [1, 1, 1] });
    const edges = new Set<string>();
    for (let i = 0; i < points.length - 1; i++) {
      const [a, b] = [points[i].join(","), points[i + 1].join(",")].sort();
      // Every drawn segment is a real edge: exactly one coordinate differs.
      const differing = points[i].filter((value, axis) => value !== points[i + 1][axis]).length;
      expect(differing).toBe(1);
      edges.add(`${a}|${b}`);
    }
    expect(edges.size).toBe(12);
  });
});

describe("crop depth from pointer travel", () => {
  it("grows going up, one slice at where it started and below", () => {
    expect(depthSteps(500, 500, 10)).toBe(0);
    expect(depthSteps(500, 470, 10)).toBe(3);
    expect(depthSteps(500, 620, 10)).toBe(0);
  });

  it("reaches the whole stack in a fixed share of the canvas", () => {
    // 200 slices on a 1000 px canvas: 400 px of travel is all of them.
    const perStep = depthPixelsPerStep(1000, 200);
    expect(perStep).toBe(2);
    expect(depthSteps(800, 400, perStep)).toBe(200);
    // A short stack is not flipped through per pixel, and no stack is a fixed pace.
    expect(depthPixelsPerStep(1000, 10)).toBe(12);
    expect(depthPixelsPerStep(1000, 0)).toBe(12);
    // A very long one still moves a slice per pixel at least.
    expect(depthPixelsPerStep(1000, 5000)).toBe(1);
  });
});
