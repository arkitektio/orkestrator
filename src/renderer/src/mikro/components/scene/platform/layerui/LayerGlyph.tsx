import { ColorMap } from "@/mikro/api/graphql";
import { colormapGradientCSS, resolveBaseColorRgb } from "../gpu/colormaps";
import type { LayerState } from "../model/layerModel";
import type { ChannelRenderNode } from "../model/renderGraph";
import { layerFlavor } from "./layerIdentity";
import { channelSwatchColor, layerSwatchBackground, wedgeBackground } from "./renderGraphSwatch";

/** Circle centres for two and three overlapping disks in a 20×20 box. */
const VENN: Record<2 | 3, { r: number; at: [number, number][] }> = {
  2: { r: 6.25, at: [[7, 10], [13, 10]] },
  3: { r: 5.75, at: [[7, 7.5], [13, 7.5], [10, 12.75]] },
};

const RGB = ["rgb(239, 68, 68)", "rgb(34, 197, 94)", "rgb(59, 130, 246)"];

/** One channel as a disk's fill: its base colour in intensity mode, else its
 *  whole colormap ramp, so a viridis layer reads as viridis. */
const diskBackground = (channel: ChannelRenderNode): string => {
  const { colormap, color } = channel.transfer;
  if (colormap === ColorMap.Intensity) {
    const [r, g, b] = resolveBaseColorRgb(color);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return colormapGradientCSS(colormap, 12, color).replace("to right", "135deg");
};

/** What a layer paints as one CSS fill: its one channel's colour or colormap,
 *  else a wedge per colour. */
const layerFill = (layer: LayerState): string => {
  const flavor = layerFlavor(layer);
  if (flavor === "RGB") return wedgeBackground(RGB);
  const visible = layer.channels.filter((channel) => channel.visible !== false);
  const single = flavor !== "FLIM" && visible.length === 1 ? visible[0] : undefined;
  return single ? diskBackground(single) : layerSwatchBackground(layer.channels);
};

/** The probe's symbol (lucide `Target`, the PROBE mode's icon) as a CSS mask,
 *  since a stroke cannot take a colormap ramp or a wedge fill. */
const PROBE_SYMBOL_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
)}")`;

/** The probe's symbol painted in what a layer paints: "this layer is probed". */
export const LayerProbeMark = ({ layer, className }: { layer: LayerState; className: string }) => (
  <span
    className={`${className} shrink-0`}
    style={{ background: layerFill(layer), maskImage: PROBE_SYMBOL_MASK, maskSize: "100% 100%" }}
    aria-hidden
  />
);

/**
 * A layer's leading mark: what it paints, drawn rather than named.
 *
 *  - RGB: three overlapping disks, red, green and blue, added like light.
 *  - Several channels: a disk per channel (up to three) in its colour, the
 *    same way, so a composite reads as one.
 *  - One channel (an image, an intensity layer): a single disk in its base
 *    colour, or its colormap when it has one.
 *  - Anything else (FLIM, no visible channel): the render graph's swatch.
 */
export const LayerGlyph = ({ layer, className }: { layer: LayerState; className: string }) => {
  const flavor = layerFlavor(layer);
  const visible = layer.channels.filter((channel) => channel.visible !== false);
  const colors =
    flavor === "RGB"
      ? RGB
      : flavor === "Multichannel"
        ? visible.slice(0, 3).map(channelSwatchColor)
        : [];

  if (colors.length >= 2) {
    const { r, at } = VENN[colors.length as 2 | 3];
    return (
      <svg viewBox="0 0 20 20" className={`${className} shrink-0`} style={{ isolation: "isolate" }} aria-hidden>
        {colors.map((color, index) => (
          <circle
            key={index}
            cx={at[index][0]}
            cy={at[index][1]}
            r={r}
            fill={color}
            style={{ mixBlendMode: "screen" }}
          />
        ))}
      </svg>
    );
  }

  return (
    <span
      className={`${className} shrink-0 rounded-full ring-1 ring-black/30`}
      style={{ background: layerFill(layer) }}
      aria-hidden
    />
  );
};
