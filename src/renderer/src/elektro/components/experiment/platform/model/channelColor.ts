import { Color, SRGBColorSpace } from "three";

/**
 * One colour per channel of a layer, for when its channels share one plot
 * (OVERLAY) and the layer's single colour would make them indistinguishable.
 *
 * Channel 0 keeps the layer's own colour — the legend's dot, the overview bar
 * and the card all still point at it — and each further channel steps round the
 * wheel by the golden angle from there, keeping the layer's saturation and
 * lightness. Golden-angle steps keep ANY two channels far apart however many
 * there are, and never land two on the same hue.
 *
 * Accepts whatever CSS the layer resolves to (`hsl(…)` for a generated hue,
 * `rgba(…)` for a persisted one); returns `hsl(…)`.
 */

const GOLDEN_ANGLE = 137.508;

/**
 * When a multi-channel layer's channels each get their own colour: only where
 * they share a plot (OVERLAY — the default, since stacked channels are already
 * told apart by their bands), always, or never (every channel in the layer's
 * colour). A property of the LAYER, set on its card.
 */
export type ChannelColoring = "OVERLAY" | "ALWAYS" | "NEVER";

/** Reads a server value leniently: anything unknown (or absent) is the default. */
export const channelColoringOf = (value: string | null | undefined): ChannelColoring =>
  value === "ALWAYS" || value === "NEVER" ? value : "OVERLAY";

/** Whether channels are coloured individually under this setting and layout. */
export const coloursChannels = (coloring: ChannelColoring, layoutMode: string): boolean =>
  coloring === "ALWAYS" || (coloring === "OVERLAY" && layoutMode === "OVERLAY");

export const channelColors = (base: string, count: number): string[] => {
  if (count <= 1) return [base];
  const hsl = { h: 0, s: 0, l: 0 };
  // Read back in sRGB — the space CSS is in. three converts to its linear working
  // space on `setStyle`, and HSL read there is a different (darker) colour.
  new Color().setStyle(base, SRGBColorSpace).getHSL(hsl, SRGBColorSpace);
  // A grey has no hue to rotate: give it enough saturation to tell channels apart.
  const saturation = Math.max(hsl.s, 0.55);
  const lightness = Math.min(Math.max(hsl.l, 0.45), 0.7);
  return Array.from({ length: count }, (_, channel) => {
    if (channel === 0) return base;
    const hue = (hsl.h * 360 + channel * GOLDEN_ANGLE) % 360;
    return `hsl(${hue.toFixed(1)}, ${(saturation * 100).toFixed(1)}%, ${(lightness * 100).toFixed(1)}%)`;
  });
};
