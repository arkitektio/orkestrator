/**
 * sRGB → OKLCh.
 *
 * The exact inverse of the OKLCh → sRGB conversion in
 * `rekuest/components/spaces/task/elements/brandColors.ts`, which is itself the
 * conversion CSS `oklch()` performs. Needed because the app's theme is
 * parameterised by an OKLCh hue, so anything that wants to DERIVE a theme from
 * an existing color (a colormap sample, a channel's base color) has to get back
 * into that space first.
 */

export type Oklch = {
  /** Perceptual lightness, 0–1. */
  l: number;
  /** Chroma. 0 is achromatic; ~0.37 is about as saturated as sRGB gets. */
  c: number;
  /** Hue angle in degrees, 0–360. Meaningless when `c` is ~0. */
  h: number;
};

const toLinear = (channel: number) => {
  const c = Math.min(Math.max(channel, 0), 1);
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/**
 * @param r 0–255
 * @param g 0–255
 * @param b 0–255
 */
export const srgbToOklch = (r: number, g: number, b: number): Oklch => {
  const rLin = toLinear(r / 255);
  const gLin = toLinear(g / 255);
  const bLin = toLinear(b / 255);

  // linear sRGB → LMS
  const l = 0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin;
  const m = 0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin;
  const s = 0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // LMS → oklab
  const okL = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const okA = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const okB = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const hue = (Math.atan2(okB, okA) * 180) / Math.PI;

  return {
    l: okL,
    c: Math.hypot(okA, okB),
    h: hue < 0 ? hue + 360 : hue,
  };
};
