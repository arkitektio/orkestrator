import { describe, expect, it } from "vitest";
import { srgbToOklch } from "./oklch";

/** The forward conversion from `rekuest/.../brandColors.ts`, inlined so the
 * round-trip test does not depend on that module's exports (it only exports the
 * composed `computeBrandColors`). Same coefficients CSS `oklch()` uses. */
const oklchToSrgb = (L: number, C: number, H: number): [number, number, number] => {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toGamma = (x: number) => {
    const c = Math.min(Math.max(x, 0), 1);
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  return [toGamma(rLin) * 255, toGamma(gLin) * 255, toGamma(bLin) * 255];
};

describe("srgbToOklch", () => {
  it("round-trips in-gamut OKLCh colors", () => {
    // The brand default, plus a couple of the chart-N lightness/chroma pairs.
    const cases: [number, number, number][] = [
      [0.6, 0.2, 267.256],
      [0.85, 0.13, 165],
      [0.51, 0.1, 30],
      [0.7, 0.15, 145],
    ];

    for (const [l, c, h] of cases) {
      const [r, g, b] = oklchToSrgb(l, c, h);
      const back = srgbToOklch(r, g, b);

      expect(back.l).toBeCloseTo(l, 2);
      expect(back.c).toBeCloseTo(c, 2);
      expect(back.h).toBeCloseTo(h, 0);
    }
  });

  it("reports greys as achromatic", () => {
    for (const v of [0, 64, 128, 200, 255]) {
      expect(srgbToOklch(v, v, v).c).toBeLessThan(1e-6);
    }
  });

  it("places the sRGB primaries in their expected hue bands", () => {
    expect(srgbToOklch(255, 0, 0).h).toBeCloseTo(29.23, 1);
    expect(srgbToOklch(0, 255, 0).h).toBeCloseTo(142.5, 1);
    expect(srgbToOklch(0, 0, 255).h).toBeCloseTo(264.05, 1);
  });

  it("returns hue in [0, 360)", () => {
    for (let r = 0; r <= 255; r += 51) {
      for (let g = 0; g <= 255; g += 51) {
        for (let b = 0; b <= 255; b += 51) {
          const { h } = srgbToOklch(r, g, b);
          expect(h).toBeGreaterThanOrEqual(0);
          expect(h).toBeLessThan(360);
        }
      }
    }
  });

  it("clamps out-of-range input rather than producing NaN", () => {
    expect(srgbToOklch(-20, 300, 128).l).not.toBeNaN();
    expect(srgbToOklch(-20, 300, 128).c).not.toBeNaN();
  });
});
