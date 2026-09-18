// @vitest-environment jsdom
// (colormaps.tsx transitively reaches app modules that touch `window`)
import { describe, expect, it } from "vitest";
import { ColorMap } from "@/mikro-next/api/graphql";
import {
  buildColormapAtlas,
  sampleColorMapRgb,
  sampleCurveValue,
  sampleStopsRgb,
  stopsGradientCSS,
} from "./colormaps";

/**
 * Response-curve convention for the brick compositor's atlas (deliberate,
 * user-validated — see buildColormapAtlas): NAMED colormap rows (INTENSITY
 * with base color, the monochrome family, multi-color LUTs) bake their
 * self-contained ramps; the compositor's extra × intensity multiply gives
 * them the ORIGINAL intensity² look ("true to life" on the additive output
 * path). A linear constant-row factoring was tried and rejected (washed-out
 * midtones). The invariant that MUST hold: INTENSITY+color and its named
 * monochrome twin produce IDENTICAL rows — same hue, same curve.
 */

const rowTexel = (atlas: ReturnType<typeof buildColormapAtlas>, row: number, x: number) => {
  const data = atlas.image.data as Uint8Array;
  const idx = (row * 256 + x) * 4;
  return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
};

describe("buildColormapAtlas", () => {
  it("INTENSITY+color bakes the SAME ramp as its named monochrome twin", () => {
    const atlas = buildColormapAtlas([
      { colormap: ColorMap.Intensity, color: [0, 255, 255] },
      { colormap: ColorMap.Cyan, color: null },
      { colormap: ColorMap.Intensity, color: [255, 0, 0] },
      { colormap: ColorMap.Red, color: null },
    ]);
    for (const x of [0, 64, 128, 255]) {
      expect(rowTexel(atlas, 0, x)).toEqual(rowTexel(atlas, 1, x)); // cyan twins
      expect(rowTexel(atlas, 2, x)).toEqual(rowTexel(atlas, 3, x)); // red twins
    }
    // And they ARE ramps (self-contained), not constants: black at 0, full at 255.
    expect(rowTexel(atlas, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(rowTexel(atlas, 0, 255)).toEqual([0, 255, 255, 255]);
    atlas.dispose();
  });

  it("INTENSITY without color ramps to white", () => {
    const atlas = buildColormapAtlas([{ colormap: ColorMap.Intensity, color: null }]);
    expect(rowTexel(atlas, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(rowTexel(atlas, 0, 255)).toEqual([255, 255, 255, 255]);
    atlas.dispose();
  });

  it("keeps colorless-colormap tints constant and multi-color LUTs as LUTs", () => {
    const atlas = buildColormapAtlas([
      { colormap: null, color: [0, 128, 255] }, // legacy tint: constant (linear)
      { colormap: ColorMap.Viridis, color: null },
    ]);
    expect(rowTexel(atlas, 0, 10)).toEqual(rowTexel(atlas, 0, 200)); // constant tint
    expect(rowTexel(atlas, 0, 10).slice(0, 3)).toEqual([0, 128, 255]);
    expect(rowTexel(atlas, 1, 10)).not.toEqual(rowTexel(atlas, 1, 200)); // real LUT
    atlas.dispose();
  });

  it("sampleColorMapRgb keeps self-contained ramp semantics (swatches etc.)", () => {
    expect(sampleColorMapRgb(ColorMap.Intensity, 0, [255, 0, 0])).toEqual([0, 0, 0]);
    expect(sampleColorMapRgb(ColorMap.Intensity, 1, [255, 0, 0])).toEqual([1, 0, 0]);
  });
});

describe("custom gradient stops", () => {
  const STOPS = [
    { position: 0.25, color: [255, 0, 0, 255] },
    { position: 0.75, color: [0, 0, 255, 255] },
  ];

  it("interpolates between positioned stops and clamps outside them", () => {
    expect(sampleStopsRgb(STOPS, 0)).toEqual([1, 0, 0]); // clamped to first
    expect(sampleStopsRgb(STOPS, 1)).toEqual([0, 0, 1]); // clamped to last
    const mid = sampleStopsRgb(STOPS, 0.5); // exact midpoint of the span
    expect(mid[0]).toBeCloseTo(0.5);
    expect(mid[2]).toBeCloseTo(0.5);
  });

  it("bakes a stops row as a ramp-convention LUT, beating colormap and color", () => {
    const atlas = buildColormapAtlas([
      { colormap: ColorMap.Viridis, color: [0, 255, 0], colorStops: STOPS },
    ]);
    expect(rowTexel(atlas, 0, 0).slice(0, 3)).toEqual([255, 0, 0]); // stops, not viridis
    expect(rowTexel(atlas, 0, 255).slice(0, 3)).toEqual([0, 0, 255]);
    atlas.dispose();
  });

  it("row cache distinguishes different stops on otherwise identical entries", () => {
    const moved = [STOPS[0], { position: 0.99, color: [0, 0, 255, 255] }];
    const atlas = buildColormapAtlas([
      { colormap: null, color: null, colorStops: STOPS },
      { colormap: null, color: null, colorStops: moved },
    ]);
    // Same key would alias the rows; different keys must give different texels.
    expect(rowTexel(atlas, 0, 128)).not.toEqual(rowTexel(atlas, 1, 128));
    atlas.dispose();
  });

  it("emits exact CSS percents for the UI preview", () => {
    expect(stopsGradientCSS(STOPS)).toBe(
      "linear-gradient(to right, rgb(255,0,0) 25.0%, rgb(0,0,255) 75.0%)",
    );
  });
});

describe("transfer curve (LookupStops)", () => {
  // Over the curve's own domain [100, 4000]: 0 → 0, midpoint plateau, 1 → 1.
  const CURVE = [
    { position: 100, value: 0 },
    { position: 2050, value: 0.9 },
    { position: 4000, value: 1 },
  ];

  it("samples the piecewise curve over its own domain with clamped ends", () => {
    expect(sampleCurveValue(CURVE, 0)).toBe(0);
    expect(sampleCurveValue(CURVE, 1)).toBe(1);
    expect(sampleCurveValue(CURVE, 0.5)).toBeCloseTo(0.9); // t=0.5 → raw 2050
    expect(sampleCurveValue(CURVE, 0.25)).toBeCloseTo(0.45); // halfway up the first leg
  });

  it("bakes the curve into the LUT row's x axis (row[x] = base(curve(x)))", () => {
    const atlas = buildColormapAtlas([
      { colormap: ColorMap.Intensity, color: null, curve: CURVE },
      { colormap: ColorMap.Intensity, color: null }, // identity twin
    ]);
    // At mid-row: curved row shows curve(0.5)=0.9 of white; identity 0.5.
    const curved = rowTexel(atlas, 0, 128)[0];
    const identity = rowTexel(atlas, 1, 128)[0];
    expect(curved).toBeGreaterThan(identity + 60); // ~229 vs ~128
    // Row cache key distinguishes curve presence.
    expect(rowTexel(atlas, 0, 128)).not.toEqual(rowTexel(atlas, 1, 128));
    atlas.dispose();
  });

  it("a tint + curve pair bakes a curve-shaped ramp, not a constant", () => {
    const atlas = buildColormapAtlas([{ colormap: null, color: [0, 128, 255], curve: CURVE }]);
    expect(rowTexel(atlas, 0, 10)).not.toEqual(rowTexel(atlas, 0, 200)); // ramp
    expect(rowTexel(atlas, 0, 255).slice(0, 3)).toEqual([0, 128, 255]); // full at 1
    atlas.dispose();
  });
});
