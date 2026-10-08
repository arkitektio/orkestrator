import { channelColors } from "@/core/data/plot/model/channelColor";

/**
 * The colour of each line a layer draws: the layer's own for the first, and
 * hues stepped off it for the rest. A chart layer persists ONE colour, so the
 * others are derived, never stored.
 *
 * The one place the lines and their legend ask, so the two cannot disagree.
 */
export const chartChannelColors = (color: string, count: number): string[] => channelColors(color, count);
