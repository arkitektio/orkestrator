import { describe, expect, it } from "vitest";
import {
  WHEEL_NOTCH_PX,
  boxOutline,
  createWheelNotches,
  depthAfterWheel,
  depthStepsPerNotch,
  rectOutline,
} from "./cropGesture";

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

describe("crop depth from the wheel", () => {
  it("counts a mouse wheel's click as one notch, up growing the box", () => {
    const notches = createWheelNotches();
    expect(notches({ deltaY: -WHEEL_NOTCH_PX, deltaMode: 0 })).toBe(1);
    expect(notches({ deltaY: WHEEL_NOTCH_PX, deltaMode: 0 })).toBe(-1);
    expect(notches({ deltaY: -3, deltaMode: 1 })).toBe(1);
  });

  it("adds a trackpad's small deltas up to a notch, and starts over on a turn", () => {
    const notches = createWheelNotches();
    expect(notches({ deltaY: -40, deltaMode: 0 })).toBe(0);
    expect(notches({ deltaY: -40, deltaMode: 0 })).toBe(0);
    expect(notches({ deltaY: -40, deltaMode: 0 })).toBe(1);
    // 20 px carried upward; turning round does not count it downward.
    expect(notches({ deltaY: 90, deltaMode: 0 })).toBe(0);
    expect(notches({ deltaY: 10, deltaMode: 0 })).toBe(-1);
  });

  it("walks a short stack a slice at a time and a long one in strides", () => {
    expect(depthStepsPerNotch(0)).toBe(1);
    expect(depthStepsPerNotch(40)).toBe(1);
    expect(depthStepsPerNotch(600)).toBe(10);
  });

  it("keeps the depth between one slice and the whole stack", () => {
    expect(depthAfterWheel(0, 3, 40)).toBe(3);
    expect(depthAfterWheel(2, -5, 40)).toBe(0);
    expect(depthAfterWheel(38, 5, 40)).toBe(40);
    expect(depthAfterWheel(590, 3, 600)).toBe(600);
    // No z grid: nothing to stop at.
    expect(depthAfterWheel(5, 2, 0)).toBe(7);
  });
});
