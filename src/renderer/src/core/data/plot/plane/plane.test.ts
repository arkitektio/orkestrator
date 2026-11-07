import { describe, expect, it } from "vitest";
import { formatSi, formatSiValue } from "../coords/siFormat";
import { buildPointIndex } from "./pointIndex";
import { createPlaneStore } from "./planeStore";
import { categoricalTicks, numericTicks } from "./planeTicks";
import { dataAt, panByPixels, padded, pixelOf, viewForBox, zoomAbout, zoomFactorForWheel } from "./planeView";

describe("SI labels", () => {
  it("writes small magnitudes plainly and large or tiny ones with one prefix", () => {
    expect(formatSi(12.5, 0.5)).toBe("12.5");
    expect(formatSi(2000, 1000, 1e4)).toBe("2 k");
    expect(formatSi(0.00015, 0.00005)).toBe("150 µ");
    expect(formatSi(3_500_000, 500_000)).toBe("3.5 M");
  });
  it("reads one value at four significant digits", () => {
    expect(formatSiValue(123456)).toBe("123.5 k");
    expect(formatSiValue(0)).toBe("0");
  });
});

describe("plane view", () => {
  const view = { x0: 0, x1: 10, y0: 0, y1: 10 };
  const size = { width: 100, height: 100 };
  it("maps pixels to data and back, y up", () => {
    expect(dataAt(view, size, 0, 0)).toEqual({ x: 0, y: 10 });
    expect(pixelOf(view, size, 5, 5)).toEqual({ px: 50, py: 50 });
  });
  it("zooms about a point, which stays put, on one axis when asked", () => {
    const z = zoomAbout(view, { x: 2, y: 2 }, 0.5);
    expect(z).toEqual({ x0: 1, x1: 6, y0: 1, y1: 6 });
    expect(zoomAbout(view, { x: 2, y: 2 }, 0.5, "x")).toEqual({ x0: 1, x1: 6, y0: 0, y1: 10 });
    expect(zoomFactorForWheel(100) * zoomFactorForWheel(-100)).toBeCloseTo(1);
  });
  it("pans so the data follows the pointer", () => {
    expect(panByPixels(view, size, 10, 10)).toEqual({ x0: -1, x1: 9, y0: 1, y1: 11 });
  });
  it("zooms into a dragged box, ignoring a click", () => {
    expect(viewForBox(view, size, { px: 0, py: 0 }, { px: 50, py: 50 })).toEqual({ x0: 0, x1: 5, y0: 5, y1: 10 });
    expect(viewForBox(view, size, { px: 10, py: 10 }, { px: 12, py: 11 })).toBeNull();
  });
  it("opens a zero-width extent", () => {
    const p = padded({ x0: 3, x1: 3, y0: 0, y1: 1 }, 0);
    expect(p.x1 - p.x0).toBe(3);
  });
});

describe("plane ticks", () => {
  it("picks nice steps for the length", () => {
    expect(numericTicks(0, 100, 500, 90).map((t) => t.value)).toEqual([0, 20, 40, 60, 80, 100]);
  });
  it("thins member labels so they never crowd", () => {
    const labels = Array.from({ length: 100 }, (_, i) => `m${i}`);
    const ticks = categoricalTicks(0, 100, 200, labels, 40);
    expect(ticks[1].value - ticks[0].value).toBe(20);
    expect(ticks[0]).toEqual({ value: 0.5, label: "m0" });
  });
});

describe("plane store", () => {
  it("follows the data in until someone moves the view, then undoes", () => {
    const store = createPlaneStore({ padding: 0 });
    store.getState().reportExtent("a", { x0: 0, x1: 10, y0: 0, y1: 5 });
    expect(store.getState().committed).toEqual({ x0: 0, x1: 10, y0: 0, y1: 5 });
    store.getState().jumpTo({ x0: 1, x1: 2, y0: 1, y1: 2 });
    store.getState().reportExtent("b", { x0: -10, x1: 0, y0: 0, y1: 5 });
    expect(store.getState().committed).toEqual({ x0: 1, x1: 2, y0: 1, y1: 2 });
    expect(store.getState().extent).toEqual({ x0: -10, x1: 10, y0: 0, y1: 5 });
    store.getState().undo();
    expect(store.getState().committed).toEqual({ x0: 0, x1: 10, y0: 0, y1: 5 });
    store.getState().fit();
    expect(store.getState().committed).toEqual({ x0: -10, x1: 10, y0: 0, y1: 5 });
  });
  it("commits a live gesture once, into the history", () => {
    const store = createPlaneStore();
    store.getState().setLive({ x0: 0, x1: 2, y0: 0, y1: 2 });
    expect(store.getState().history).toHaveLength(0);
    store.getState().commit();
    store.getState().commit();
    expect(store.getState().history).toHaveLength(1);
  });
});

describe("point index", () => {
  it("finds the nearest point in pixels, within the radius", () => {
    const xs = Float64Array.from([0, 10, 10]);
    const ys = Float64Array.from([0, 0, 100]);
    const index = buildPointIndex(xs, ys);
    // 1 px per x unit, 0.1 px per y unit: (10, 100) is 10 px above (10, 0).
    expect(index.nearest(9, 90, 1, 0.1, 5)).toBe(2);
    expect(index.nearest(9, 0, 1, 0.1, 5)).toBe(1);
    expect(index.nearest(50, 50, 1, 1, 5)).toBeNull();
  });
});
