// @vitest-environment jsdom
// (majorityHue reaches `brandTarget` → `platform/gpu/colormaps`, which transitively
// touches `window`)
import { describe, expect, it } from "vitest";
import { srgbToOklch } from "@/lib/color/oklch";
import { majorityHueFromPixels, sameBrandTarget } from "./majorityHue";

/** Build an ImageData-shaped buffer from [r, g, b, a] pixels. */
const pixels = (...px: [number, number, number, number][]): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(px.length * 4);
  px.forEach(([r, g, b, a], i) => out.set([r, g, b, a], i * 4));
  return out;
};

const fill = (
  count: number,
  px: [number, number, number, number],
): [number, number, number, number][] => Array.from({ length: count }, () => px);

const circularDelta = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

describe("majorityHueFromPixels", () => {
  it("returns null for a blank (fully transparent) frame", () => {
    expect(majorityHueFromPixels(pixels(...fill(64, [255, 0, 0, 0])))).toBeNull();
  });

  it("returns null when coverage is a handful of stray pixels", () => {
    const data = pixels(...fill(255, [0, 0, 0, 0]), [255, 0, 0, 255]);
    expect(majorityHueFromPixels(data)).toBeNull();
  });

  it("lands on the majority color's OKLCH hue", () => {
    const data = pixels(
      ...fill(40, [255, 0, 0, 255]),
      ...fill(10, [0, 0, 255, 255]),
    );
    const target = majorityHueFromPixels(data);
    const red = srgbToOklch(255, 0, 0);
    expect(target).not.toBeNull();
    expect(target!.hue).not.toBeNull();
    expect(circularDelta(target!.hue!, red.h)).toBeLessThan(10);
    expect(target!.chroma).toBeGreaterThan(0.05);
  });

  it("is a MAJORITY, not a mean: opposing hues don't cancel to grey", () => {
    // brandTargetFromColors would average red + cyan toward achromatic; the
    // histogram must instead pick whichever side dominates.
    const data = pixels(
      ...fill(30, [255, 0, 0, 255]),
      ...fill(20, [0, 255, 255, 255]),
    );
    const target = majorityHueFromPixels(data);
    const red = srgbToOklch(255, 0, 0);
    expect(circularDelta(target!.hue!, red.h)).toBeLessThan(15);
  });

  it("never elects white: a dominant white field loses to any real color", () => {
    // A mostly-white render with one vivid region tints toward the region,
    // and the tint is a VISIBLE one — not washed out by the white majority.
    const data = pixels(
      ...fill(58, [255, 255, 255, 255]),
      ...fill(6, [0, 80, 255, 255]),
    );
    const target = majorityHueFromPixels(data);
    const blue = srgbToOklch(0, 80, 255);
    expect(target!.hue).not.toBeNull();
    expect(circularDelta(target!.hue!, blue.h)).toBeLessThan(15);
    expect(target!.chroma).toBeGreaterThanOrEqual(0.08);
  });

  it("ignores grey pixels when electing the hue", () => {
    // A mostly-grey render with one vivid region tints toward the region.
    const data = pixels(
      ...fill(50, [128, 128, 128, 255]),
      ...fill(6, [0, 80, 255, 255]),
    );
    const target = majorityHueFromPixels(data);
    const blue = srgbToOklch(0, 80, 255);
    expect(target!.hue).not.toBeNull();
    expect(circularDelta(target!.hue!, blue.h)).toBeLessThan(15);
  });

  it("pale pixels sharing the winning band don't wash the tint out", () => {
    // Vivid red plus a pile of barely-pink pixels in the same hue band: the
    // published chroma stays a visible tint rather than averaging whitish.
    const data = pixels(
      ...fill(10, [255, 0, 0, 255]),
      ...fill(40, [255, 210, 210, 255]),
    );
    const target = majorityHueFromPixels(data);
    expect(target!.hue).not.toBeNull();
    expect(target!.chroma).toBeGreaterThanOrEqual(0.08);
  });

  it("reports an achromatic frame as a grey theme, not as nothing", () => {
    const data = pixels(...fill(64, [120, 120, 120, 255]));
    const target = majorityHueFromPixels(data);
    expect(target).not.toBeNull();
    expect(target!.hue).toBeNull();
    expect(target!.chroma).toBeLessThan(0.01);
  });

  it("weights votes by alpha, so faint fringes don't outvote solid content", () => {
    const data = pixels(
      ...fill(20, [255, 0, 0, 255]),
      ...fill(30, [0, 0, 255, 40]),
    );
    const target = majorityHueFromPixels(data);
    const red = srgbToOklch(255, 0, 0);
    expect(circularDelta(target!.hue!, red.h)).toBeLessThan(15);
  });
});

describe("sameBrandTarget", () => {
  it("treats sub-perceptual differences as equal", () => {
    expect(
      sameBrandTarget({ hue: 100, chroma: 0.1 }, { hue: 101, chroma: 0.102 }),
    ).toBe(true);
    expect(sameBrandTarget({ hue: 359.5, chroma: 0.1 }, { hue: 0.5, chroma: 0.1 })).toBe(
      true,
    );
  });

  it("distinguishes real changes, nulls, and absence", () => {
    expect(sameBrandTarget({ hue: 100, chroma: 0.1 }, { hue: 110, chroma: 0.1 })).toBe(
      false,
    );
    expect(sameBrandTarget({ hue: 100, chroma: 0.1 }, { hue: null, chroma: 0.1 })).toBe(
      false,
    );
    expect(sameBrandTarget(null, { hue: 100, chroma: 0.1 })).toBe(false);
    expect(sameBrandTarget(null, null)).toBe(true);
  });
});
