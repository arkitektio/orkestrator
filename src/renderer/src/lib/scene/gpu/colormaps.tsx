import { ColorMap } from "@/mikro-next/api/graphql";
import * as THREE from "three";

const DEFAULT_INTENSITY_BASE_COLOR = [255, 255, 255] as const;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const clampByte = (value: number) => Math.min(Math.max(Math.round(value), 0), 255);

export const resolveBaseColorRgb = (
  baseColor: number[] | null | undefined,
): [number, number, number] => [
  clampByte(baseColor?.[0] ?? DEFAULT_INTENSITY_BASE_COLOR[0]),
  clampByte(baseColor?.[1] ?? DEFAULT_INTENSITY_BASE_COLOR[1]),
  clampByte(baseColor?.[2] ?? DEFAULT_INTENSITY_BASE_COLOR[2]),
];

const clampRgb = (color: number[]) =>
  color.map((channel) => clamp01(channel)) as [number, number, number];

/**
 * One stop of a custom positioned gradient — RGBA 0-255, the model's color
 * convention (`platform/model/renderGraph.ts` `TransferStop` is structurally this).
 */
export type GradientStop = { position: number; color: readonly number[] };

/**
 * Sample a POSITIONED stop gradient at normalized `t` (assumes stops sorted
 * by position; clamped at both ends). Returns 0-1 rgb. The evenly-spaced
 * `interpolateStops` below stays for the named-map tables.
 */
export const sampleStopsRgb = (
  stops: readonly GradientStop[],
  t: number,
): [number, number, number] => {
  const rgb01 = (stop: GradientStop): [number, number, number] => [
    clamp01((stop.color[0] ?? 0) / 255),
    clamp01((stop.color[1] ?? 0) / 255),
    clamp01((stop.color[2] ?? 0) / 255),
  ];
  if (stops.length === 0) return [0, 0, 0];
  const x = clamp01(t);
  if (x <= stops[0].position) return rgb01(stops[0]);
  const last = stops[stops.length - 1];
  if (x >= last.position) return rgb01(last);
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i].position) {
      const a = rgb01(stops[i - 1]);
      const b = rgb01(stops[i]);
      const span = stops[i].position - stops[i - 1].position;
      const f = span > 0 ? (x - stops[i - 1].position) / span : 0;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
  }
  return rgb01(last);
};

/**
 * One control point of the intensity transfer CURVE (the server's
 * `LookupStop`): raw intensity → normalized 0..1. Structural twin of
 * `platform/model/renderGraph.ts` `TransferCurveStop`.
 */
export type CurveStop = { position: number; value: number };

/**
 * Sample the piecewise-linear transfer curve at `t ∈ [0,1]` over the curve's
 * OWN domain [first.position, last.position] (assumes sorted stops; clamped
 * ends). The shader's clim window is set to that same domain when a curve is
 * active (`effectiveScalarTransfer`), so LUT x-axis `t` and curve domain
 * coincide by construction.
 */
export const sampleCurveValue = (stops: readonly CurveStop[], t: number): number => {
  if (stops.length === 0) return clamp01(t);
  const first = stops[0];
  const last = stops[stops.length - 1];
  const raw = first.position + clamp01(t) * (last.position - first.position);
  if (raw <= first.position) return clamp01(first.value);
  if (raw >= last.position) return clamp01(last.value);
  for (let i = 1; i < stops.length; i++) {
    if (raw <= stops[i].position) {
      const a = stops[i - 1];
      const b = stops[i];
      const span = b.position - a.position;
      const f = span > 0 ? (raw - a.position) / span : 0;
      return clamp01(a.value + (b.value - a.value) * f);
    }
  }
  return clamp01(last.value);
};

/** CSS preview of a positioned gradient — the stops' own percents, exact. */
export const stopsGradientCSS = (stops: readonly GradientStop[]): string => {
  const entries = stops.map(
    (stop) =>
      `rgb(${Math.round(stop.color[0] ?? 0)},${Math.round(stop.color[1] ?? 0)},${Math.round(
        stop.color[2] ?? 0,
      )}) ${(clamp01(stop.position) * 100).toFixed(1)}%`,
  );
  return `linear-gradient(to right, ${entries.join(", ")})`;
};

const interpolateStops = (
  stops: ReadonlyArray<readonly [number, number, number]>,
  t: number,
): [number, number, number] => {
  if (stops.length === 0) return [0, 0, 0];
  if (stops.length === 1) return [...stops[0]] as [number, number, number];

  const scaled = clamp01(t) * (stops.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;
  const start = stops[index] ?? stops[stops.length - 1];
  const end = stops[Math.min(index + 1, stops.length - 1)] ?? start;

  return [
    start[0] + (end[0] - start[0]) * fraction,
    start[1] + (end[1] - start[1]) * fraction,
    start[2] + (end[2] - start[2]) * fraction,
  ];
};

const rampToColor = (
  color: readonly [number, number, number],
  t: number,
): [number, number, number] => [
  color[0] * clamp01(t),
  color[1] * clamp01(t),
  color[2] * clamp01(t),
];

const toNormalizedBaseColor = (
  baseColor: number[] | null | undefined,
): [number, number, number] => {
  const color = resolveBaseColorRgb(baseColor);

  return [
    clamp01(color[0] / 255),
    clamp01(color[1] / 255),
    clamp01(color[2] / 255),
  ];
};

const COLOR_STOPS: Partial<
  Record<ColorMap, ReadonlyArray<readonly [number, number, number]>>
> = {
  [ColorMap.Cool]: [
    [0, 1, 1],
    [1, 0, 1],
  ],
  [ColorMap.Warm]: [
    [0.35, 0, 0],
    [0.85, 0.2, 0],
    [1, 0.85, 0.1],
  ],
  [ColorMap.Spectral]: [
    [0.62, 0.0, 0.26],
    [0.84, 0.19, 0.15],
    [0.96, 0.43, 0.26],
    [0.99, 0.68, 0.38],
    [1.0, 0.88, 0.55],
    [1.0, 1.0, 0.75],
    [0.9, 0.96, 0.6],
    [0.67, 0.87, 0.64],
    [0.4, 0.76, 0.65],
    [0.2, 0.53, 0.74],
    [0.37, 0.31, 0.64],
  ],
};

const MONOCHROME_TARGETS: Partial<
  Record<ColorMap, readonly [number, number, number]>
> = {
  [ColorMap.Black]: [0, 0, 0],
  [ColorMap.Blue]: [0, 0, 1],
  [ColorMap.Brown]: [0.62, 0.4, 0.2],
  [ColorMap.Cyan]: [0, 1, 1],
  [ColorMap.Green]: [0, 1, 0],
  [ColorMap.Grey]: [1, 1, 1],
  [ColorMap.Magenta]: [1, 0, 1],
  [ColorMap.Orange]: [1, 0.55, 0],
  [ColorMap.Pink]: [1, 0.55, 0.75],
  [ColorMap.Purple]: [0.58, 0.25, 0.9],
  [ColorMap.Red]: [1, 0, 0],
  [ColorMap.White]: [1, 1, 1],
  [ColorMap.Yellow]: [1, 1, 0],
};

export const sampleColorMapRgb = (
  colormap: ColorMap | null | undefined,
  t: number,
  baseColor?: number[] | null,
): [number, number, number] => {
  const normalized = clamp01(t);
  const resolvedColormap = colormap ?? ColorMap.Viridis;

  switch (resolvedColormap) {
    case ColorMap.Plasma: {
      const c0 = [0.050383, 0.029803, 0.527975];
      const c1 = [0.063536, 0.28201, 1.28706];
      const c2 = [0.047002, -0.027879, -0.376627];
      const c3 = [0.081427, -1.81901, 1.43231];
      const c4 = [0.105724, 8.46568, -3.89642];
      return clampRgb([
        c0[0] + normalized * (c1[0] + normalized * (c2[0] + normalized * (c3[0] + normalized * c4[0]))),
        c0[1] + normalized * (c1[1] + normalized * (c2[1] + normalized * (c3[1] + normalized * c4[1]))),
        c0[2] + normalized * (c1[2] + normalized * (c2[2] + normalized * (c3[2] + normalized * c4[2]))),
      ]);
    }
    case ColorMap.Inferno: {
      const c0 = [0.0014615, 0.000466, 0.013866];
      const c1 = [0.120565, 0.675951, 0.669823];
      const c2 = [-0.0041943, -0.411412, -0.0498334];
      const c3 = [0.0411583, 1.0048, 0.728707];
      const c4 = [0.0745821, -3.65852, -1.35202];
      return clampRgb([
        c0[0] + normalized * (c1[0] + normalized * (c2[0] + normalized * (c3[0] + normalized * c4[0]))),
        c0[1] + normalized * (c1[1] + normalized * (c2[1] + normalized * (c3[1] + normalized * c4[1]))),
        c0[2] + normalized * (c1[2] + normalized * (c2[2] + normalized * (c3[2] + normalized * c4[2]))),
      ]);
    }
    case ColorMap.Magma: {
      const c0 = [0.001462, 0.000466, 0.013866];
      const c1 = [0.078815, 0.674501, 0.973988];
      const c2 = [0.138051, -0.411412, -0.814952];
      const c3 = [-0.126219, 1.0048, 1.66697];
      const c4 = [0.0582235, -3.65852, -2.87069];
      return clampRgb([
        c0[0] + normalized * (c1[0] + normalized * (c2[0] + normalized * (c3[0] + normalized * c4[0]))),
        c0[1] + normalized * (c1[1] + normalized * (c2[1] + normalized * (c3[1] + normalized * c4[1]))),
        c0[2] + normalized * (c1[2] + normalized * (c2[2] + normalized * (c3[2] + normalized * c4[2]))),
      ]);
    }
    case ColorMap.Rainbow: {
      const hue = normalized * 300;
      const c = 1;
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));

      if (hue < 60) return [c, x, 0];
      if (hue < 120) return [x, c, 0];
      if (hue < 180) return [0, c, x];
      if (hue < 240) return [0, x, c];
      if (hue < 300) return [x, 0, c];
      return [c, 0, x];
    }
    case ColorMap.Intensity: {
      return rampToColor(toNormalizedBaseColor(baseColor), normalized);
    }
    case ColorMap.Viridis: {
      const c0 = [0.277727, 0.005407, 0.3341];
      const c1 = [0.105093, 1.40461, 1.38459];
      const c2 = [-0.330861, 0.214847, 0.095095];
      const c3 = [-4.63423, -5.7991, -19.3324];
      const c4 = [6.22827, 14.1799, 56.6906];
      const c5 = [4.77638, -13.7451, -65.353];
      const c6 = [-5.43546, 4.64585, 26.3124];
      return clampRgb([
        c0[0] + normalized * (c1[0] + normalized * (c2[0] + normalized * (c3[0] + normalized * (c4[0] + normalized * (c5[0] + normalized * c6[0]))))),
        c0[1] + normalized * (c1[1] + normalized * (c2[1] + normalized * (c3[1] + normalized * (c4[1] + normalized * (c5[1] + normalized * c6[1]))))),
        c0[2] + normalized * (c1[2] + normalized * (c2[2] + normalized * (c3[2] + normalized * (c4[2] + normalized * (c5[2] + normalized * c6[2]))))),
      ]);
    }
    default: {
      const stops = COLOR_STOPS[resolvedColormap];
      if (stops) {
        return clampRgb(interpolateStops(stops, normalized));
      }

      const target = MONOCHROME_TARGETS[resolvedColormap];
      if (target) {
        return clampRgb(rampToColor(target, normalized));
      }

      return sampleColorMapRgb(ColorMap.Viridis, normalized, baseColor);
    }
  }
};

export const sampleColorMapCSS = (
  colormap: ColorMap | null | undefined,
  t: number,
  baseColor?: number[] | null,
) => {
  const [r, g, b] = sampleColorMapRgb(colormap, t, baseColor);
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
};

export const colormapGradientCSS = (
  colormap: ColorMap | null | undefined,
  stops = 32,
  baseColor?: number[] | null,
) => {
  const colors = Array.from({ length: stops }, (_, i) =>
    sampleColorMapCSS(colormap, i / Math.max(stops - 1, 1), baseColor),
  );
  return `linear-gradient(to right, ${colors.join(", ")})`;
};

/**
 * Build a colormap atlas: a 256 x N RGBA LUT where row `c` is the LUT for
 * channel `c` (its colormap tinted by its base color). A multi-channel shader
 * samples `texture(atlas, vec2(t, (c + 0.5) / N))` to look up channel `c`'s
 * color for a normalized intensity `t`. Rows are sampled at their exact centers
 * so LinearFilter on the row axis still returns the correct row.
 */
/**
 * Baked-row cache: a row's texels depend ONLY on (colormap, color), and the
 * atlas is rebuilt on EVERY channel-data change — including clim/gamma drags,
 * where neither input moves. Without this every drag tick re-evaluated
 * 256 × `sampleColorMapRgb` per row per member (the merged builder builds a
 * per-member atlas AND the merged one). Bounded LRU; a hit is a 1 KB memcpy.
 */
const atlasRowCache = new Map<string, Uint8Array>();
const ATLAS_ROW_CACHE_LIMIT = 256;

export const buildColormapAtlas = (
  channels: {
    colormap: ColorMap | null | undefined;
    color?: number[] | null;
    /** Custom positioned COLOR gradient (sorted, ≥2 entries): takes precedence
     * over `colormap`/`color`, baked with the SAME ramp response convention as
     * a named colormap row (see below) — the shader never knows the difference. */
    colorStops?: readonly GradientStop[] | null;
    /** The intensity transfer CURVE (sorted, ≥2): baked into the row's x axis
     * (`row[x] = base(curve(x))`), with the shader's clim window set to the
     * curve's domain by `effectiveScalarTransfer`. */
    curve?: readonly CurveStop[] | null;
  }[],
): THREE.DataTexture => {
  const width = 256;
  const height = Math.max(1, channels.length);
  const data = new Uint8Array(width * height * 4);

  for (let row = 0; row < height; row++) {
    const channel = channels[row];
    const customStops =
      channel?.colorStops && channel.colorStops.length >= 2 ? channel.colorStops : null;
    const curve = channel?.curve && channel.curve.length >= 2 ? channel.curve : null;
    const stopsKey = customStops
      ? customStops.map((s) => `${s.position}:${s.color.join(",")}`).join(";")
      : "";
    const curveKey = curve ? curve.map((s) => `${s.position}:${s.value}`).join(";") : "";
    const rowKey = `${channel?.colormap ?? ""}|${channel?.color?.join(",") ?? ""}|${stopsKey}|${curveKey}`;
    const cached = atlasRowCache.get(rowKey);
    if (cached) {
      data.set(cached, row * width * 4);
      // Refresh LRU position.
      atlasRowCache.delete(rowKey);
      atlasRowCache.set(rowKey, cached);
      continue;
    }
    // RESPONSE-CURVE CONVENTION (deliberate, user-validated): every NAMED
    // colormap row — including INTENSITY-with-base-color and the monochrome
    // family (Cyan, Red, Grey, …) — bakes its self-contained ramp
    // (`sampleColorMapRgb`, e.g. cyan × t). The compositor multiplies the row
    // sample by normalized intensity once more, giving named colormaps an
    // intensity² response. That squared curve is the ORIGINAL renderer look
    // and reads as "true to life" on screen (it approximates the gamma
    // encoding the additive output path never applies); a linear
    // constant-row factoring was tried and rejected — midtones washed out.
    // What matters for consistency: INTENSITY+color goes through the SAME
    // sampleColorMapRgb ramp as its named-colormap twin (Intensity+cyan ≡
    // Cyan), so identical hues render identically.
    //
    // The ONLY constant-tint rows are colorless-colormap channels with an
    // explicit color (legacy per-channel tint without a named map): those
    // have always rendered linearly via the compositor's single multiply.
    const tintColor =
      channel?.colormap == null && channel?.color && !customStops && !curve
        ? channel.color
        : null;

    const rowData = new Uint8Array(width * 4);
    for (let x = 0; x < width; x++) {
      // The transfer curve remaps the row's x axis: the shader's normalized
      // window value indexes `curve(t)` instead of `t`. Without a curve this
      // is the identity. (A tint + curve pair bakes a ramp — the constant-row
      // optimization can't carry a curve.)
      const t = curve ? sampleCurveValue(curve, x / (width - 1)) : x / (width - 1);
      let r: number;
      let g: number;
      let b: number;
      if (customStops) {
        // A custom gradient IS a colormap: bake its ramp like a named map's
        // (intensity² response via the compositor's extra multiply).
        [r, g, b] = sampleStopsRgb(customStops, t);
      } else if (curve && channel?.colormap == null && channel?.color) {
        // Tint × curve: the constant tint becomes a curve-shaped ramp.
        const tint = channel.color;
        r = ((tint[0] ?? 0) / 255) * t;
        g = ((tint[1] ?? 0) / 255) * t;
        b = ((tint[2] ?? 0) / 255) * t;
      } else if (tintColor) {
        // Constant channel color; the shader scales it by the channel's
        // normalized intensity (so 0 -> black, 1 -> full color). A ramp here
        // would double-count intensity and crush the image.
        r = (tintColor[0] ?? 0) / 255;
        g = (tintColor[1] ?? 0) / 255;
        b = (tintColor[2] ?? 0) / 255;
      } else {
        [r, g, b] = sampleColorMapRgb(channel?.colormap, t, channel?.color);
      }
      const idx = x * 4;
      rowData[idx] = Math.round(r * 255);
      rowData[idx + 1] = Math.round(g * 255);
      rowData[idx + 2] = Math.round(b * 255);
      rowData[idx + 3] = 255;
    }
    data.set(rowData, row * width * 4);
    if (atlasRowCache.size >= ATLAS_ROW_CACHE_LIMIT) {
      const oldestKey = atlasRowCache.keys().next().value;
      if (oldestKey !== undefined) atlasRowCache.delete(oldestKey);
    }
    atlasRowCache.set(rowKey, rowData);
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
};
