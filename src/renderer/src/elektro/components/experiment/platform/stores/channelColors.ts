import { useMemo } from "react";
import { channelColors, coloursChannels, type ChannelColoring } from "../model/channelColor";
import { useLayerState } from "./experimentStore";
import { useViewerStore } from "./viewerStore";

/**
 * The colour each of a layer's drawn channels is drawn in, under the LAYER's
 * channel-colouring setting and the current layout: one per channel when they
 * are coloured individually, else the layer's own colour for all. The ONE place
 * the lines, the channel tags and the probe readout ask — so the three agree.
 */
export const useChannelColors = (layerId: string): string[] => {
  const layoutMode = useViewerStore((s) => s.layoutMode);
  const layer = useLayerState(layerId);
  const color = layer?.color ?? "white";
  const count = Math.max(1, layer?.channelCount ?? 1);
  const coloring = layer?.persisted.channelColoring ?? "OVERLAY";
  return useMemo(
    () => channelColorsFor({ color, channelCount: count, coloring }, layoutMode),
    [color, count, coloring, layoutMode],
  );
};

/** The same answer outside React (the probe readout builds its rows in a memo). */
export const channelColorsFor = (
  layer: { color: string; channelCount: number; coloring: ChannelColoring },
  layoutMode: string,
): string[] => {
  const count = Math.max(1, layer.channelCount);
  return coloursChannels(layer.coloring, layoutMode) && count > 1
    ? channelColors(layer.color, count)
    : Array.from({ length: count }, () => layer.color);
};
