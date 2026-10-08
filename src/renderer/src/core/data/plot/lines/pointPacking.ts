import { SAMPLES_PER_PIXEL_LIMIT, type PackedChannel } from "./tracePacking";

/**
 * Packing points that are NOT on a regular grid — a table's (coordinate, value)
 * rows — into the same polyline buffer a trace is drawn from.
 *
 * `tracePacking` packs tiles, whose samples sit at `t0 + period · i`. A table
 * has no period: its rows are wherever they are. The output is the same
 * `PackedChannel`, so one component draws both.
 *
 * The same rule holds: never more points than the screen can show. Where a
 * stretch holds more than `SAMPLES_PER_PIXEL_LIMIT` points per pixel column, it
 * is reduced to each column's minimum and maximum, in the order they occur.
 *
 * Pure — runs in node.
 */

export type PointPackOptions = {
  /** The window being drawn and its width in pixels: what "per pixel" means. */
  window: { start: number; end: number };
  widthPx: number;
};

/** First index whose x is >= `x` (xs ascending). */
const lowerBound = (xs: ArrayLike<number>, x: number): number => {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (xs[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

const EMPTY: PackedChannel = {
  pairs: new Float32Array(0),
  segmentCount: 0,
  xs: new Float64Array(0),
  ys: new Float32Array(0),
  valueMin: null,
  valueMax: null,
  decimated: false,
};

/**
 * `xs` are world positions, ASCENDING; `ys` their values, parallel. `origin` is
 * subtracted in float64 before the float32 cast (see `tracePacking`'s note on
 * precision).
 */
export const packPoints = (
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  origin: number,
  options: PointPackOptions,
): PackedChannel => {
  const { window, widthPx } = options;
  // One point either side of the window, so the line runs off both edges.
  const from = Math.max(0, lowerBound(xs, window.start) - 1);
  const to = Math.min(xs.length, lowerBound(xs, window.end) + 1);
  const count = to - from;
  if (count <= 0) return EMPTY;

  const columns = Math.max(1, Math.floor(widthPx));
  const dense = count > columns * SAMPLES_PER_PIXEL_LIMIT;

  let outX: Float64Array;
  let outY: Float32Array;
  if (!dense) {
    outX = new Float64Array(count);
    outY = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      outX[i] = xs[from + i] - origin;
      outY[i] = ys[from + i];
    }
  } else {
    // Per pixel column: its minimum and maximum, in the order they occur.
    const span = window.end - window.start || 1;
    const px: number[] = [];
    const py: number[] = [];
    let column = -1;
    let minI = -1;
    let maxI = -1;
    const flush = () => {
      if (minI < 0) return;
      const first = Math.min(minI, maxI);
      const second = Math.max(minI, maxI);
      px.push(xs[first] - origin);
      py.push(ys[first]);
      if (second !== first) {
        px.push(xs[second] - origin);
        py.push(ys[second]);
      }
    };
    for (let i = from; i < to; i++) {
      const c = Math.floor(((xs[i] - window.start) / span) * columns);
      if (c !== column) {
        flush();
        column = c;
        minI = maxI = i;
        continue;
      }
      if (ys[i] < ys[minI]) minI = i;
      if (ys[i] > ys[maxI]) maxI = i;
    }
    flush();
    outX = Float64Array.from(px);
    outY = Float32Array.from(py);
  }

  let valueMin = Infinity;
  let valueMax = -Infinity;
  for (let i = 0; i < outY.length; i++) {
    const y = outY[i];
    if (y < valueMin) valueMin = y;
    if (y > valueMax) valueMax = y;
  }

  const segmentCount = Math.max(0, outX.length - 1);
  const pairs = new Float32Array(segmentCount * 6);
  for (let i = 0; i < segmentCount; i++) {
    const at = i * 6;
    pairs[at] = outX[i];
    pairs[at + 1] = outY[i];
    pairs[at + 3] = outX[i + 1];
    pairs[at + 4] = outY[i + 1];
  }

  return {
    pairs,
    segmentCount,
    xs: outX,
    ys: outY,
    valueMin: valueMin <= valueMax ? valueMin : null,
    valueMax: valueMin <= valueMax ? valueMax : null,
    decimated: dense,
  };
};

/**
 * A packed line's POINTS as dots: one very short segment per point, which a
 * fat line with round caps draws as a disc of the line's width.
 *
 * No second material and no point sprites: the same `PackedLine`, given this
 * buffer and the marker size as its width, draws markers. The segment has to
 * have SOME length — a zero-length one has no direction to expand along — so
 * each is a small fraction of the local point spacing, floored at what float32
 * can still tell apart from the point itself.
 */
export const markerDots = (line: PackedChannel): PackedChannel => {
  const n = line.xs.length;
  if (n === 0) return line;
  const spacing = n > 1 ? Math.abs(line.xs[n - 1] - line.xs[0]) / (n - 1) : 1;
  const pairs = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const x = line.xs[i];
    const epsilon = Math.max(spacing * 1e-3, Math.abs(x) * 4e-7, 1e-30);
    const at = i * 6;
    pairs[at] = x;
    pairs[at + 1] = line.ys[i];
    pairs[at + 3] = x + epsilon;
    pairs[at + 4] = line.ys[i];
  }
  return { ...line, pairs, segmentCount: n };
};
