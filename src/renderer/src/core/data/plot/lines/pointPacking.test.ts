import { describe, expect, it } from "vitest";
import { markerDots, packPoints } from "./pointPacking";
import { stepped } from "./steps";

const window = { start: 0, end: 100 };

describe("packPoints", () => {
  it("joins sparse points as they are, relative to the origin", () => {
    const packed = packPoints([1010, 1020, 1040], [1, 3, 2], 1000, {
      window: { start: 1000, end: 1100 },
      widthPx: 500,
    });
    expect(packed.decimated).toBe(false);
    expect(packed.segmentCount).toBe(2);
    expect([...packed.xs]).toEqual([10, 20, 40]);
    expect([...packed.pairs.slice(0, 6)]).toEqual([10, 1, 0, 20, 3, 0]);
    expect(packed.valueMin).toBe(1);
    expect(packed.valueMax).toBe(3);
  });

  it("keeps one point either side of the window so the line runs off both edges", () => {
    const xs = [-50, -10, 50, 110, 150];
    const packed = packPoints(xs, [0, 1, 2, 3, 4], 0, { window, widthPx: 500 });
    expect([...packed.xs]).toEqual([-10, 50, 110]);
  });

  it("reduces a dense stretch to each pixel column's extremes, in order", () => {
    const n = 10_000;
    const xs = Float64Array.from({ length: n }, (_, i) => (i / n) * 100);
    // A spike one sample wide must still reach its peak.
    const ys = Float32Array.from({ length: n }, (_, i) => (i === 5000 ? 99 : Math.sin(i)));
    const packed = packPoints(xs, ys, 0, { window, widthPx: 100 });
    expect(packed.decimated).toBe(true);
    expect(packed.xs.length).toBeLessThanOrEqual(2 * 101);
    expect(packed.valueMax).toBe(99);
    for (let i = 1; i < packed.xs.length; i++) {
      expect(packed.xs[i]).toBeGreaterThanOrEqual(packed.xs[i - 1]);
    }
  });

  it("answers an empty window with nothing to draw", () => {
    const packed = packPoints([], [], 0, { window, widthPx: 100 });
    expect(packed.segmentCount).toBe(0);
    expect(packed.valueMin).toBeNull();
  });
});

describe("markerDots", () => {
  it("draws one short, non-degenerate segment per point", () => {
    const line = packPoints([10, 20, 40], [1, 3, 2], 0, { window, widthPx: 500 });
    const dots = markerDots(line);
    expect(dots.segmentCount).toBe(3);
    for (let i = 0; i < 3; i++) {
      const at = i * 6;
      expect(dots.pairs[at + 1]).toBe(dots.pairs[at + 4]);
      expect(dots.pairs[at + 3]).toBeGreaterThan(dots.pairs[at]);
    }
  });
});

describe("stepped", () => {
  it("holds each value until the next sample, then rises", () => {
    const line = packPoints([10, 20], [1, 3], 0, { window, widthPx: 500 });
    const steps = stepped(line);
    expect(steps.segmentCount).toBe(2);
    expect([...steps.pairs]).toEqual([10, 1, 0, 20, 1, 0, 20, 1, 0, 20, 3, 0]);
  });

  it("leaves a per-pixel envelope alone", () => {
    const line = { ...packPoints([10, 20], [1, 3], 0, { window, widthPx: 500 }), decimated: true };
    expect(stepped(line)).toBe(line);
  });
});
