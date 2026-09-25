import { ColorMap } from "@/mikro/api/graphql";
import {
  colormapGradientCSS as sceneColormapGradientCSS,
  sampleColorMapCSS as sceneSampleColorMapCSS,
} from "../gpu/colormaps";
import {
  INSTANCE_COLORMAP_SPECS,
  instanceHue,
  type FabriksInstanceColormap,
} from "../gpu/instanceColormaps";

export const COLORMAP_OPTIONS = Object.values(ColorMap);

export const sampleColormapCSS = (
  colormap: ColorMap | null | undefined,
  t: number,
  baseColor?: number[] | null,
): string => {
  return sceneSampleColorMapCSS(colormap, t, baseColor);
};

export const colormapGradientCSS = (
  colormap: ColorMap | null | undefined,
  stops = 32,
  baseColor?: number[] | null,
): string => {
  return sceneColormapGradientCSS(colormap, stops, baseColor);
};

// --------------------------------------------------------- instance palettes
//
// The CATEGORICAL side of the colormap story. One set of palettes serves every
// categorical colouring — the default instance-id mode AND a categorical
// column entry — so which choices a control offers follows from the COLUMN
// (measure → the continuous `ColorMap` ramps above, categorical → these) and
// never from which control happens to host it.

/** Whether this HSL triple mirrors the shader exactly is what `paletteCSS`
 * in the mesh card used to guarantee; the math moved here verbatim so the
 * swatches, the derived `classColors` and the surface stay on the same hue. */
export const instancePaletteColor = (
  name: FabriksInstanceColormap,
  ordinal: number,
): [number, number, number] => {
  const spec = INSTANCE_COLORMAP_SPECS[name];
  const s = spec.saturation * (spec.tiered ? 0.7 + (ordinal % 3) * 0.15 : 1);
  const l = Math.min(0.55 * spec.value * (spec.tiered ? 0.78 + (ordinal % 2) * 0.22 : 1), 0.85);
  return hslToRgb255(instanceHue(ordinal), s, l);
};

/**
 * The `ColorMap` members that are QUALITATIVE — a colour per distinct value rather than a ramp
 * over a range — mapped to the instance palette each one is.
 *
 * The server decides which sort a column admits, from the column's declared role, and refuses
 * the wrong sort at the mutation boundary. So an entry's colormap *is* the control: a
 * qualitative one can only have come from a categorical column. That is what lets the LUT
 * painter branch on the entry instead of sniffing the runtime type of the values it read.
 *
 * The names are shared with `INSTANCE_COLORMAPS` deliberately — one set of palettes serves the
 * id hash, a mesh collection's instance colouring and a categorical column entry, so the same
 * class lands on the same colour whichever of the three is drawing it.
 */
export const QUALITATIVE_COLORMAPS: Partial<Record<ColorMap, FabriksInstanceColormap>> = {
  [ColorMap.Hues]: "hues",
  [ColorMap.Distinct]: "distinct",
  [ColorMap.Pastel]: "pastel",
  [ColorMap.Vivid]: "vivid",
};

/** The instance palette this colormap is, or null when it is a continuous ramp. */
export const qualitativePalette = (
  colormap: ColorMap | null | undefined,
): FabriksInstanceColormap | null =>
  (colormap != null ? QUALITATIVE_COLORMAPS[colormap] : undefined) ?? null;

/** The `ColorMap` member an instance palette is, for a control that persists a pick. */
export const colormapOfPalette = (name: FabriksInstanceColormap): ColorMap =>
  (Object.keys(QUALITATIVE_COLORMAPS) as ColorMap[]).find(
    (member) => QUALITATIVE_COLORMAPS[member] === name,
  ) ?? ColorMap.Hues;

/** The continuous ramps, for a control offering a measure column its choices. */
export const CONTINUOUS_COLORMAPS: ColorMap[] = (Object.values(ColorMap) as ColorMap[]).filter(
  (member) => QUALITATIVE_COLORMAPS[member] === undefined,
);

/** A palette's preview: the first six instance hues under its spec. */
export const instancePaletteCSS = (name: FabriksInstanceColormap): string => {
  const colors = Array.from({ length: 6 }, (_, ordinal) => {
    const [r, g, b] = instancePaletteColor(name, ordinal);
    return `rgb(${r}, ${g}, ${b})`;
  });
  return `linear-gradient(to right, ${colors.join(", ")})`;
};


/** HSL → 0-255 RGB, h/s/l all in 0..1. */
const hslToRgb255 = (h: number, s: number, l: number): [number, number, number] => {
  const channel = (n: number): number => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [
    Math.round(channel(0) * 255),
    Math.round(channel(8) * 255),
    Math.round(channel(4) * 255),
  ];
};

/**
 * The continuous ramps as a picker's options, with their gradient previews.
 *
 * A module constant, not a `useMemo(..., [])` per card: three cards built the
 * identical array and memoised it against an empty dependency list, which is a
 * constant spelled as a hook. Building it once also means the three pickers
 * share one set of gradient strings rather than three copies.
 */
export const CONTINUOUS_COLORMAP_CHOICES: readonly {
  value: ColorMap;
  label: string;
  css: string;
}[] = CONTINUOUS_COLORMAPS.map((colormap) => ({
  value: colormap,
  label: colormap.toLowerCase(),
  css: colormapGradientCSS(colormap),
}));
