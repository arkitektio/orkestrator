import { describe, expect, it } from "vitest";
import { boxOutline, rectOutline, wheelSteps } from "./cropGesture";

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

describe("crop wheel steps", () => {
  it("is one step per mouse notch, whatever its size, growing on scroll up", () => {
    expect(wheelSteps({ deltaY: -100, deltaMode: 0 }, 0)).toEqual({ steps: 1, remainder: 0 });
    expect(wheelSteps({ deltaY: 120, deltaMode: 0 }, 0)).toEqual({ steps: -1, remainder: 0 });
    expect(wheelSteps({ deltaY: -3, deltaMode: 1 }, 0)).toEqual({ steps: 1, remainder: 0 });
  });

  it("adds a trackpad's crumbs up instead of stepping per event", () => {
    let remainder = 0;
    let steps = 0;
    for (let i = 0; i < 20; i++) {
      const next = wheelSteps({ deltaY: -4, deltaMode: 0 }, remainder);
      remainder = next.remainder;
      steps += next.steps;
    }
    expect(steps).toBe(2); // 80 px of travel
    expect(remainder).toBe(0);
  });
});
