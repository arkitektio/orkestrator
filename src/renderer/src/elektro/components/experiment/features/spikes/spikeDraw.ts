import { countInWindow, laneRateQuads, rateBinWidth, shouldDrawDensity } from "../../platform/marks/density";
import { colorResolver, type ColorByLike } from "../../platform/pickers/pickerModel";

/**
 * From a packed raster to what a spikes layer DRAWS — pure.
 */

/** Ticks per pixel column beyond which the raster turns into a rate histogram. */
export const TICKS_PER_PIXEL = 4;

export type SpikeRaster = {
  xs: Float64Array;
  lanes: Uint32Array;
  values: Float32Array;
  laneCount: number;
  /** Unit index shown in each lane. */
  unitOfLane: Int32Array;
};

export type SpikeDraw = {
  xs: Float64Array;
  lanes: Uint32Array;
  laneCount: number;
  colors: Float32Array | null;
  /** Drawn as a per-unit rate histogram rather than ticks. */
  density: boolean;
  rateQuads: Float32Array | null;
  count: number;
};

type Sample = (colormap: string | null, t: number) => [number, number, number];

/** Per-tick colours from the active colour-by: one colour per UNIT (lane). */
export const colorByTickColors = (
  raster: SpikeRaster,
  entry: ColorByLike,
  map: Map<unknown, unknown>,
  base: [number, number, number],
  sample: Sample,
): Float32Array => {
  const resolve = colorResolver(entry, [...map.values()], sample);
  const laneRgb = Array.from(raster.unitOfLane, (unit) => resolve(map.get(unit)));
  const colors = new Float32Array(raster.xs.length * 3);
  raster.lanes.forEach((lane, i) => colors.set(laneRgb[lane] ?? base, i * 3));
  return colors;
};

/** Per-tick colours from the amplitude, through the colormap between the clim (or the data's range). */
export const amplitudeTickColors = (
  raster: SpikeRaster,
  colormap: string | null,
  clim: { lo: number; hi: number } | null,
  sample: Sample,
): Float32Array | null => {
  if (raster.values.length === 0) return null;
  let lo = clim?.lo ?? Infinity;
  let hi = clim?.hi ?? -Infinity;
  if (!clim) {
    for (const v of raster.values) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  const span = hi > lo ? hi - lo : 1;
  const colors = new Float32Array(raster.values.length * 3);
  raster.values.forEach((v, i) => colors.set(sample(colormap, (v - lo) / span), i * 3));
  return colors;
};

/**
 * Above this many ticks the raster is CLIPPED to the window (± half its width
 * each side) before upload: a 2 M-spike raster zoomed into a second should not
 * upload 2 M instances. Below it the whole raster is uploaded once and reused
 * by identity across commits — cheaper than re-uploading a clipped copy per pan.
 */
export const CLIP_TICKS_ABOVE = 200_000;

/** The ticks within [start, end], with their colours. */
export const clipTicks = (
  raster: Pick<SpikeRaster, "xs" | "lanes">,
  colors: Float32Array | null,
  start: number,
  end: number,
): { xs: Float64Array; lanes: Uint32Array; colors: Float32Array | null } => {
  const keep: number[] = [];
  for (let i = 0; i < raster.xs.length; i++) if (raster.xs[i] >= start && raster.xs[i] <= end) keep.push(i);
  return {
    xs: Float64Array.from(keep, (i) => raster.xs[i]),
    lanes: Uint32Array.from(keep, (i) => raster.lanes[i]),
    colors: colors
      ? Float32Array.from({ length: keep.length * 3 }, (_, k) => colors[keep[Math.floor(k / 3)] * 3 + (k % 3)])
      : null,
  };
};

/** What to draw for a window (origin-relative) at a canvas width. */
export const spikeDrawFor = (
  raster: SpikeRaster,
  colors: Float32Array | null,
  window: { start: number; end: number },
  widthPx: number,
  rateBin: number | null,
): SpikeDraw => {
  const inView = countInWindow(raster.xs, window.start, window.end);
  const density = rateBin != null || shouldDrawDensity(inView, widthPx * TICKS_PER_PIXEL);
  const width = window.end - window.start;
  const ticks =
    !density && raster.xs.length > CLIP_TICKS_ABOVE
      ? clipTicks(raster, colors, window.start - width / 2, window.end + width / 2)
      : { xs: raster.xs, lanes: raster.lanes, colors };
  return {
    xs: ticks.xs,
    lanes: ticks.lanes,
    laneCount: raster.laneCount,
    colors: ticks.colors,
    density,
    rateQuads: density
      ? laneRateQuads(
          raster.xs,
          raster.lanes,
          raster.laneCount,
          window.start,
          window.end,
          rateBinWidth(rateBin, window, widthPx),
        )
      : null,
    count: raster.xs.length,
  };
};
