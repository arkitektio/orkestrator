// @vitest-environment jsdom
// (brandTarget reaches `platform/gpu/colormaps`, which transitively touches `window`)
import { describe, expect, it } from "vitest";
import { ColorMap } from "@/mikro/api/graphql";
import type { ChannelRenderNode } from "../../platform/model/renderGraph";
import {
  brandTargetFromColors,
  colormapRepresentativeRgb,
  layerBrandTarget,
} from "./brandTarget";

const channel = (
  colormap: ColorMap | null,
  overrides: Partial<ChannelRenderNode> & { color?: number[] | null } = {},
): ChannelRenderNode => ({
  type: "channel",
  kind: "channel",
  label: null,
  intensityAxis: null,
  intensityIndex: 0,
  visible: overrides.visible ?? true,
  transfer: {
    climMin: null,
    climMax: null,
    colormap,
    color: overrides.color ?? null,
    gamma: null,
    opacity: null,
    invert: null,
  },
});

const targetFor = (colormap: ColorMap, color: number[] | null = null) =>
  brandTargetFromColors([colormapRepresentativeRgb(colormap, color)]);

describe("brandTargetFromColors", () => {
  it("puts each chromatic colormap in its own hue band", () => {
    // Bands, not exact values: the point is that the tint agrees with what the
    // viewport renders, and the underlying ramps may be retuned.
    const bands: [ColorMap, number, number][] = [
      [ColorMap.Red, 20, 40],
      [ColorMap.Orange, 45, 75],
      [ColorMap.Yellow, 100, 120],
      [ColorMap.Green, 130, 155],
      [ColorMap.Cyan, 185, 205],
      [ColorMap.Blue, 255, 275],
      [ColorMap.Magenta, 320, 340],
      [ColorMap.Viridis, 120, 140],
    ];

    for (const [colormap, min, max] of bands) {
      const target = targetFor(colormap);
      expect(target, colormap).not.toBeNull();
      expect(target!.hue, colormap).not.toBeNull();
      expect(target!.hue!, colormap).toBeGreaterThan(min);
      expect(target!.hue!, colormap).toBeLessThan(max);
    }
  });

  it("treats an achromatic colormap as a grey theme, not as no theme", () => {
    // Grey is a color: it desaturates the app rather than being ignored. The
    // hue is null because at chroma ~0 there is no hue to read.
    for (const colormap of [
      ColorMap.Grey,
      ColorMap.White,
      ColorMap.Black,
      // Intensity mode with no base color is white.
      ColorMap.Intensity,
    ]) {
      const target = targetFor(colormap);
      expect(target, colormap).not.toBeNull();
      expect(target!.hue, colormap).toBeNull();
      expect(target!.chroma, colormap).toBeLessThan(0.002);
    }
  });

  it("uses the channel's own base color in intensity mode", () => {
    const target = targetFor(ColorMap.Intensity, [255, 0, 0]);
    expect(target).not.toBeNull();
    expect(target!.hue!).toBeGreaterThan(20);
    expect(target!.hue!).toBeLessThan(40);
  });

  it("averages circularly, not on the raw hue angle", () => {
    // 350° and 10° must average to ~0°, not to the 180° a naive mean gives.
    const target = brandTargetFromColors([
      [255, 0, 60],
      [255, 60, 0],
    ]);
    expect(target).not.toBeNull();
    const wrapped = target!.hue! > 180 ? target!.hue! - 360 : target!.hue!;
    expect(Math.abs(wrapped)).toBeLessThan(35);
  });

  it("blends multiple channels into a hue between them", () => {
    const target = layerBrandTarget([
      channel(ColorMap.Red),
      channel(ColorMap.Green),
    ]);
    expect(target).not.toBeNull();
    expect(target!.hue!).toBeGreaterThan(30);
    expect(target!.hue!).toBeLessThan(142);
  });

  it("lets opposed hues cancel rather than averaging to a bogus one", () => {
    // Summing in the a/b plane means near-opposites weaken each other. Red is
    // more chromatic than cyan, so it still leads — but by much less than it
    // would alone, which is the whole point of the vector sum.
    const red = brandTargetFromColors([[217, 0, 0]])!;
    const redAndCyan = brandTargetFromColors([
      [217, 0, 0],
      [0, 217, 217],
    ])!;

    expect(redAndCyan.chroma).toBeLessThan(red.chroma);
    expect(redAndCyan.hue!).toBeGreaterThan(red.hue!); // pulled toward cyan
  });

  it("caps chroma at the top of the brand band but never raises it", () => {
    for (const colormap of Object.values(ColorMap)) {
      const target = targetFor(colormap);
      expect(target, colormap).not.toBeNull();
      expect(target!.chroma, colormap).toBeLessThanOrEqual(0.26);
      expect(target!.chroma, colormap).toBeGreaterThanOrEqual(0);
    }

    // A very saturated source is capped rather than passed through.
    expect(brandTargetFromColors([[0, 0, 255]])!.chroma).toBeCloseTo(0.26, 5);
  });

  it("keeps hue in [0, 360) whenever there is one", () => {
    for (const colormap of Object.values(ColorMap)) {
      const target = targetFor(colormap);
      if (target?.hue == null) continue;
      expect(target.hue, colormap).toBeGreaterThanOrEqual(0);
      expect(target.hue, colormap).toBeLessThan(360);
    }
  });

  it("returns null with no colors at all", () => {
    expect(brandTargetFromColors([])).toBeNull();
  });
});

describe("layerBrandTarget", () => {
  it("ignores hidden channels", () => {
    const visibleOnly = layerBrandTarget([channel(ColorMap.Red)]);
    const withHiddenGreen = layerBrandTarget([
      channel(ColorMap.Red),
      channel(ColorMap.Green, { visible: false }),
    ]);

    expect(withHiddenGreen).toEqual(visibleOnly);
  });

  it("returns null for a layer with nothing visible", () => {
    expect(layerBrandTarget([channel(ColorMap.Red, { visible: false })])).toBeNull();
  });

  it("returns null for a layer with no channels", () => {
    expect(layerBrandTarget([])).toBeNull();
  });
});
