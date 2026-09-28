import { ColorMap } from "@/mikro/api/graphql";
import {
  resolveBaseColorRgb,
  sampleColorMapCSS,
} from "../gpu/colormaps";
import { ChannelRenderNode } from "../model/renderGraph";

/** Where on a colormap ramp we sample a channel's representative color — bright
 * but not the blown-out top of magma/inferno. */
const REPRESENTATIVE_T = 0.85;

/** Neutral fallback when a layer has no visible channels to color the dot. */
const NEUTRAL = "#3f3f46"; // zinc-700

/**
 * A single representative CSS color for one channel: its base color when in
 * intensity (base-color) mode, otherwise a bright sample of its colormap.
 * Mirrors the display rule used elsewhere for layer chrome.
 */
export const channelSwatchColor = (channel: ChannelRenderNode): string => {
  const { colormap, color } = channel.transfer;
  if (colormap === ColorMap.Intensity) {
    const [r, g, b] = resolveBaseColorRgb(color);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return sampleColorMapCSS(colormap, REPRESENTATIVE_T, color);
};

/**
 * A CSS `background` value for a layer's swatch dot, derived from its render
 * graph's channels. One visible channel → a solid color; several (a blend) →
 * an equal-wedge `conic-gradient` (radial split), each wedge in its channel's
 * own color. Pure CSS, no canvas.
 */
export const layerSwatchBackground = (
  channels: ChannelRenderNode[],
): string => {
  const colors = channels
    .filter((c) => c.visible !== false)
    .map(channelSwatchColor);

  if (colors.length === 0) return NEUTRAL;
  if (colors.length === 1) return colors[0];

  const seg = 360 / colors.length;
  const stops = colors
    .map((c, i) => `${c} ${i * seg}deg ${(i + 1) * seg}deg`)
    .join(", ");
  return `conic-gradient(${stops})`;
};
