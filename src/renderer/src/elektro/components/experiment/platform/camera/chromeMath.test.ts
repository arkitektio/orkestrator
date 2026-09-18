import { describe, expect, it } from "vitest";
import { decimalsFor, niceStep, timeTicks } from "./timeTicks";
import { sampleAt } from "../probe/sampleAt";

describe("niceStep", () => {
  it("rounds up to 1, 2 or 5 times a power of ten", () => {
    expect(niceStep(0.7)).toBe(1);
    expect(niceStep(1.3)).toBe(2);
    expect(niceStep(3)).toBe(5);
    expect(niceStep(7)).toBe(10);
    expect(niceStep(130)).toBe(200);
    expect(niceStep(0.0031)).toBeCloseTo(0.005, 12);
  });

  it("survives nonsense", () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(NaN)).toBe(1);
  });
});

describe("decimalsFor", () => {
  it("shows enough decimals for the step", () => {
    expect(decimalsFor(100)).toBe(0);
    expect(decimalsFor(0.5)).toBe(1);
    expect(decimalsFor(0.02)).toBe(2);
  });
});

describe("timeTicks", () => {
  it("keeps tick density roughly constant with width", () => {
    const narrow = timeTicks({ start: 0, end: 1000 }, 440);
    const wide = timeTicks({ start: 0, end: 1000 }, 1760);
    expect(wide.ticks.length).toBeGreaterThan(narrow.ticks.length);
    expect(narrow.ticks.length).toBeGreaterThanOrEqual(2);
  });

  it("puts every tick inside the window, on the step grid", () => {
    const { ticks, step } = timeTicks({ start: 123.4, end: 987.6 }, 800);
    for (const t of ticks) {
      expect(t.time).toBeGreaterThanOrEqual(123.4);
      expect(t.time).toBeLessThanOrEqual(987.6);
      expect(Math.abs(t.time / step - Math.round(t.time / step))).toBeLessThan(1e-9);
    }
  });

  it("formats without float noise", () => {
    const { ticks } = timeTicks({ start: 0.1, end: 0.9 }, 800);
    for (const t of ticks) expect(t.label).not.toMatch(/0000000/);
  });

  it("is empty for a degenerate window or canvas", () => {
    expect(timeTicks({ start: 5, end: 5 }, 800).ticks).toEqual([]);
    expect(timeTicks({ start: 0, end: 5 }, 0).ticks).toEqual([]);
  });

  it("works at epoch scale", () => {
    const { ticks } = timeTicks({ start: 1.8e9, end: 1.8e9 + 10 }, 800);
    expect(ticks.length).toBeGreaterThan(1);
  });
});

describe("sampleAt", () => {
  const xs = [0, 1, 2, 3];
  const ys = [0, 10, 20, 30];

  it("returns an exact sample on a drawn point", () => {
    expect(sampleAt(xs, ys, 2)).toEqual({ value: 20, exact: true });
  });

  it("interpolates between points, as the line does", () => {
    expect(sampleAt(xs, ys, 1.5)).toEqual({ value: 15, exact: false });
  });

  it("is null outside the drawn extent", () => {
    expect(sampleAt(xs, ys, -0.1)).toBeNull();
    expect(sampleAt(xs, ys, 3.1)).toBeNull();
    expect(sampleAt([], [], 0)).toBeNull();
  });

  it("is null across a gap the line breaks at", () => {
    expect(sampleAt([0, 1, 10, 11], [0, 1, 2, 3], 5, 1.5)).toBeNull();
  });
});
