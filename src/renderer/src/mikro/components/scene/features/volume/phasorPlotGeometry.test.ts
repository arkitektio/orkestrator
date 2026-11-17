import { describe, expect, it } from "vitest";

import { PLOT_PADDING, phasorPlotGeometry } from "./phasorPlotGeometry";

const HALF_PLANE = { gMin: -0.05, gMax: 1.05, sMin: -0.05, sMax: 0.7 };

describe("phasorPlotGeometry", () => {
  it("scales g and s alike, so a circle in phasor space is a circle on the plot", () => {
    const { toPixel } = phasorPlotGeometry(HALF_PLANE, 300);
    const [cx, cy] = toPixel(0.5, 0.2);
    const [gx] = toPixel(0.6, 0.2);
    const [, sy] = toPixel(0.5, 0.3);
    expect(gx - cx).toBeCloseTo(cy - sy, 6);
  });

  it("round-trips a pointer position", () => {
    const { toPixel, toPhasor } = phasorPlotGeometry(HALF_PLANE, 268);
    const [g, s] = toPhasor(...toPixel(0.31, 0.44));
    expect(g).toBeCloseTo(0.31, 9);
    expect(s).toBeCloseTo(0.44, 9);
  });

  it("derives its height from the width and the extent", () => {
    const { height, scale } = phasorPlotGeometry(HALF_PLANE, 300);
    expect(scale).toBeCloseTo((300 - 2 * PLOT_PADDING) / 1.1, 6);
    expect(height).toBe(Math.round(0.75 * scale + 2 * PLOT_PADDING));
  });

  it("fills the width and puts s = sMin at the bottom padding", () => {
    const { toPixel, height } = phasorPlotGeometry(HALF_PLANE, 300);
    expect(toPixel(HALF_PLANE.gMin, HALF_PLANE.sMin)[0]).toBeCloseTo(PLOT_PADDING, 6);
    expect(toPixel(HALF_PLANE.gMax, HALF_PLANE.sMin)[0]).toBeCloseTo(300 - PLOT_PADDING, 6);
    expect(toPixel(0, HALF_PLANE.sMin)[1]).toBeCloseTo(height - PLOT_PADDING, 6);
  });

  it("never grows taller than wide for an extent taller than it is wide", () => {
    const { height, toPixel } = phasorPlotGeometry({ gMin: 0, gMax: 0.5, sMin: 0, sMax: 1 }, 200);
    expect(height).toBe(200);
    // g is centred in the width it does not fill.
    expect(toPixel(0.25, 0)[0]).toBeCloseTo(100, 6);
  });

  it("survives a degenerate extent and a zero width", () => {
    const { toPixel } = phasorPlotGeometry({ gMin: 0, gMax: 0, sMin: 0, sMax: 0 }, 0);
    expect(toPixel(0, 0).every(Number.isFinite)).toBe(true);
  });
});
