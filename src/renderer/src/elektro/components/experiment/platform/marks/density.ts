/**
 * The density fallback shared by spike rasters and event tables: never draw
 * more marks than there are pixels. When a window holds more marks than the
 * canvas is wide, one tick per mark is an unreadable smear that still costs a
 * vertex pair each; a count per pixel-column says the same thing honestly.
 *
 * The counterpart of the trace pyramid's rule (never more samples than pixels),
 * applied to point data, which has no pyramid.
 *
 * Pure — runs in node.
 */

/** More marks in view than this many per pixel column → draw density. */
export const MARKS_PER_PIXEL_LIMIT = 1;

export const shouldDrawDensity = (marksInView: number, widthPx: number): boolean =>
  widthPx > 0 && marksInView > widthPx * MARKS_PER_PIXEL_LIMIT;

/** How many of `xs` (sorted or not) fall inside [start, end]. */
export const countInWindow = (xs: ArrayLike<number>, start: number, end: number): number => {
  let n = 0;
  for (let i = 0; i < xs.length; i++) if (xs[i] >= start && xs[i] <= end) n++;
  return n;
};

/**
 * Counts per bin over [start, end): `bins` equal-width buckets. Marks outside
 * the window are ignored. `weights`, when given, sum instead of count (a spike
 * amplitude, an event duration).
 */
export const densityBins = (
  xs: ArrayLike<number>,
  start: number,
  end: number,
  bins: number,
  weights?: ArrayLike<number> | null,
): Float32Array => {
  const out = new Float32Array(Math.max(1, Math.floor(bins)));
  const width = end - start;
  if (!(width > 0)) return out;
  const scale = out.length / width;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    if (!(x >= start) || !(x < end)) continue;
    const b = Math.min(out.length - 1, Math.floor((x - start) * scale));
    out[b] += weights ? weights[i] : 1;
  }
  return out;
};

/** Bin width for a rate histogram: the layer's `rateBin` when set, else one pixel. */
export const rateBinWidth = (
  rateBin: number | null,
  window: { start: number; end: number },
  widthPx: number,
): number => {
  const pixel = widthPx > 0 ? (window.end - window.start) / widthPx : window.end - window.start;
  return rateBin != null && rateBin > 0 ? Math.max(rateBin, pixel) : pixel;
};

/**
 * A rate histogram per lane — the raster's density form. Each lane's bins are
 * bars rising from the lane's bottom, heights normalized to the busiest bin of
 * the whole layer (so lanes stay comparable), as `[x0, x1, y0, y1]` quads in
 * lane units (lane `l` spans y ∈ [−l, −(l+1)]).
 */
export const laneRateQuads = (
  xs: ArrayLike<number>,
  lanes: ArrayLike<number>,
  laneCount: number,
  start: number,
  end: number,
  binWidth: number,
): Float32Array => {
  const width = end - start;
  if (!(width > 0) || !(binWidth > 0) || laneCount <= 0) return new Float32Array(0);
  const bins = Math.max(1, Math.ceil(width / binWidth));
  const counts = new Float32Array(laneCount * bins);
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    if (!(x >= start) || !(x < end)) continue;
    const lane = lanes[i];
    if (lane < 0 || lane >= laneCount) continue;
    counts[lane * bins + Math.min(bins - 1, Math.floor((x - start) / binWidth))] += 1;
  }
  let max = 0;
  for (const c of counts) if (c > max) max = c;
  if (max <= 0) return new Float32Array(0);
  const out: number[] = [];
  for (let lane = 0; lane < laneCount; lane++) {
    for (let b = 0; b < bins; b++) {
      const c = counts[lane * bins + b];
      if (c <= 0) continue;
      const h = (c / max) * 0.9;
      const x0 = start + b * binWidth;
      out.push(x0, Math.min(end, x0 + binWidth), -(lane + 1 - h), -(lane + 1));
    }
  }
  return Float32Array.from(out);
};
