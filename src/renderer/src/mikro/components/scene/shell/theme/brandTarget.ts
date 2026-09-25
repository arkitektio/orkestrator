import { ColorMap } from "@/mikro/api/graphql";
import { srgbToOklch } from "@/core/data/color/oklch";
import type { BrandTarget } from "@/core/settings/store/brandTheme";
import type { ChannelRenderNode } from "../../platform/model/renderGraph";
import { resolveBaseColorRgb, sampleColorMapRgb } from "../../platform/gpu/colormaps";

export type Rgb = readonly [number, number, number];

/** Where on a colormap ramp a channel's representative color is taken — bright
 * but not the blown-out top of magma/inferno. The same point the layer swatch
 * dots use (`platform/layerui/renderGraphSwatch.ts`), so the app tint and the
 * sidebar dot agree. */
const REPRESENTATIVE_T = 0.85;

/**
 * Under this, `atan2` is reading rounding noise rather than a hue — grey/white/
 * black, or channels whose hues cancelled exactly. The CHROMA is still honest
 * (≈0, a monochrome UI, which is the right theme for a grey colormap); only the
 * hue is unknowable, so it is reported as null and whatever hue is currently
 * applied is kept. At that chroma the hue is invisible anyway — this only stops
 * it spinning to a meaningless angle on the way there.
 */
const HUE_NOISE_FLOOR = 0.002;

/** The top of the band the theme's `oklch()` tokens were designed around;
 * saturated colormaps overshoot it. Nothing is clamped up from below, so a grey
 * colormap really does give a grey app. */
export const MAX_BRAND_CHROMA = 0.26;

/**
 * Average a set of colors into one brand target.
 *
 * The mean is taken in the OKLab a/b plane rather than on the hue angle: hue is
 * circular, so a naive mean of 350° and 10° gives 180° (the exact opposite
 * color). Summing the chroma vectors also makes cancellation meaningful —
 * red + cyan pull against each other instead of averaging to a hue neither of
 * them has.
 *
 * Null means "nothing to derive a theme from" — no colors at all. An achromatic
 * result is NOT nothing: it is a grey theme.
 */
export const brandTargetFromColors = (
  colors: readonly Rgb[],
): BrandTarget | null => {
  if (colors.length === 0) return null;

  let sumA = 0;
  let sumB = 0;

  for (const [r, g, b] of colors) {
    const { c, h } = srgbToOklch(r, g, b);
    const radians = (h * Math.PI) / 180;
    sumA += c * Math.cos(radians);
    sumB += c * Math.sin(radians);
  }

  const meanA = sumA / colors.length;
  const meanB = sumB / colors.length;
  const chroma = Math.min(Math.hypot(meanA, meanB), MAX_BRAND_CHROMA);

  if (chroma < HUE_NOISE_FLOOR) {
    return { hue: null, chroma };
  }

  const hue = (Math.atan2(meanB, meanA) * 180) / Math.PI;

  return { hue: hue < 0 ? hue + 360 : hue, chroma };
};

/** A colormap's representative color, in 0–255 sRGB. Mirrors
 * `channelSwatchColor`: intensity mode shows its own base color, everything
 * else a bright sample of its ramp. */
export const colormapRepresentativeRgb = (
  colormap: ColorMap | null | undefined,
  baseColor: number[] | null | undefined,
): Rgb => {
  if (colormap === ColorMap.Intensity) {
    return resolveBaseColorRgb(baseColor);
  }

  const [r, g, b] = sampleColorMapRgb(colormap, REPRESENTATIVE_T, baseColor);
  return [r * 255, g * 255, b * 255];
};

/**
 * The brand target for a layer: the blend of its VISIBLE channels' colormaps.
 * Null only when the layer has nothing visible.
 */
export const layerBrandTarget = (
  channels: readonly ChannelRenderNode[],
): BrandTarget | null =>
  brandTargetFromColors(
    channels
      .filter((channel) => channel.visible !== false)
      .map((channel) =>
        colormapRepresentativeRgb(
          channel.transfer.colormap,
          channel.transfer.color,
        ),
      ),
  );
