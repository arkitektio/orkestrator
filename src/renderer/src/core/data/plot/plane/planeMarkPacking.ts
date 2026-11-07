/**
 * Packing marks for a plane's GPU buffers.
 *
 * Positions are written RELATIVE to an origin (the data's centre) and the
 * object's matrix translates them back: float32 has 24 bits of mantissa, and
 * a scatter of positions around 1e6 µm drawn in absolute units would land on a
 * coarse lattice when zoomed in.
 *
 * Pure -- runs in node.
 */

import { FLOATS_PER_SEGMENT } from "@/core/data/scene/gpu/lineBuffer";

/** A point drawn as a fat line through itself: a segment this short, relative to the data's span. */
export const DOT_EPSILON = 1e-7;

export type PackedDots = {
  /** `FLOATS_PER_SEGMENT` floats per point: (x, y, 0) twice, a hair apart. */
  pairs: Float32Array;
  /** Per-vertex RGB, 6 floats per point; null for one colour. */
  colors: Float32Array | null;
  count: number;
  origin: { x: number; y: number };
};

/** Points as zero-length fat-line segments (round caps make each a disc of the line's width). */
export const packDots = (
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  options: { origin: { x: number; y: number }; span: number; rgb?: Float32Array | null },
): PackedDots => {
  const n = Math.min(xs.length, ys.length);
  const pairs = new Float32Array(n * FLOATS_PER_SEGMENT);
  const colors = options.rgb ? new Float32Array(n * FLOATS_PER_SEGMENT) : null;
  const eps = Math.max(Math.abs(options.span), 1e-12) * DOT_EPSILON;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const o = count * FLOATS_PER_SEGMENT;
    pairs[o] = x - options.origin.x;
    pairs[o + 1] = y - options.origin.y;
    pairs[o + 3] = x - options.origin.x + eps;
    pairs[o + 4] = y - options.origin.y;
    if (colors && options.rgb) {
      const r = options.rgb[i * 3];
      const g = options.rgb[i * 3 + 1];
      const b = options.rgb[i * 3 + 2];
      colors.set([r, g, b, r, g, b], o);
    }
    count++;
  }
  return { pairs, colors, count, origin: options.origin };
};

/** A polyline through points in the order given (a LINE mark): consecutive segments. */
export const packPolyline = (
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  origin: { x: number; y: number },
): { pairs: Float32Array; count: number } => {
  const n = Math.min(xs.length, ys.length);
  const pairs = new Float32Array(Math.max(0, n - 1) * FLOATS_PER_SEGMENT);
  let count = 0;
  for (let i = 1; i < n; i++) {
    const [x0, y0, x1, y1] = [xs[i - 1], ys[i - 1], xs[i], ys[i]];
    if (![x0, y0, x1, y1].every(Number.isFinite)) continue;
    pairs.set([x0 - origin.x, y0 - origin.y, 0, x1 - origin.x, y1 - origin.y, 0], count * FLOATS_PER_SEGMENT);
    count++;
  }
  return { pairs, count };
};

/** Axis-aligned segments (x0, y0, x1, y1 per segment): box whiskers, medians, outlines. */
export const packSegments = (segments: readonly number[], origin: { x: number; y: number }): { pairs: Float32Array; count: number } => {
  const count = Math.floor(segments.length / 4);
  const pairs = new Float32Array(count * FLOATS_PER_SEGMENT);
  for (let i = 0; i < count; i++) {
    const [x0, y0, x1, y1] = [segments[i * 4], segments[i * 4 + 1], segments[i * 4 + 2], segments[i * 4 + 3]];
    pairs.set([x0 - origin.x, y0 - origin.y, 0, x1 - origin.x, y1 - origin.y, 0], i * FLOATS_PER_SEGMENT);
  }
  return { pairs, count };
};

/** Quads (x0, x1, y0, y1 each) as two triangles: positions and per-vertex RGB, relative to `origin`. */
export const packQuads = (
  quads: ArrayLike<number>,
  origin: { x: number; y: number },
  rgb: ArrayLike<number> | null,
  fallback: readonly [number, number, number],
): { positions: Float32Array; colors: Float32Array; count: number } => {
  const count = Math.floor(quads.length / 4);
  const positions = new Float32Array(count * 18);
  const colors = new Float32Array(count * 18);
  for (let i = 0; i < count; i++) {
    const x0 = quads[i * 4] - origin.x;
    const x1 = quads[i * 4 + 1] - origin.x;
    const y0 = quads[i * 4 + 2] - origin.y;
    const y1 = quads[i * 4 + 3] - origin.y;
    positions.set([x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y0, 0, x1, y1, 0, x0, y1, 0], i * 18);
    const r = rgb ? rgb[i * 3] : fallback[0];
    const g = rgb ? rgb[i * 3 + 1] : fallback[1];
    const b = rgb ? rgb[i * 3 + 2] : fallback[2];
    for (let v = 0; v < 6; v++) colors.set([r, g, b], i * 18 + v * 3);
  }
  return { positions, colors, count };
};

/** sRGB (what a colormap and CSS speak) → linear (what a vertex colour is blended in). */
export const srgbToLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/**
 * Per-point colours through a colormap: `sample(t)` returns sRGB 0..1, the
 * result is linear RGB, 3 floats per point. Values outside `[lo, hi]` clamp;
 * a missing value is grey.
 */
export const colorsThrough = (
  values: ArrayLike<number>,
  lo: number,
  hi: number,
  sample: (t: number) => readonly [number, number, number],
): Float32Array => {
  const n = values.length;
  const out = new Float32Array(n * 3);
  const span = hi - lo || 1;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    const [r, g, b] = Number.isFinite(v) ? sample((v - lo) / span) : [0.4, 0.4, 0.4];
    out[i * 3] = srgbToLinear(r);
    out[i * 3 + 1] = srgbToLinear(g);
    out[i * 3 + 2] = srgbToLinear(b);
  }
  return out;
};

/** A CSS hex colour as linear RGB 0..1 (for vertex colours). */
export const hexToLinear = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!m) return [1, 1, 1];
  return [srgbToLinear(parseInt(m[1], 16) / 255), srgbToLinear(parseInt(m[2], 16) / 255), srgbToLinear(parseInt(m[3], 16) / 255)];
};
