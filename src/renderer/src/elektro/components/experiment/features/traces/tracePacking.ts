import {
  FLOATS_PER_SEGMENT,
  segmentCountFor,
  writeRunPairs,
} from "@/lib/scene/gpu/lineBuffer";
import type { DrawSegment } from "../../platform/quality/traceResidency";

/**
 * Turning the resident tiles a window draws into one polyline buffer per channel.
 *
 * The input is `drawableTiles`' segments: non-overlapping, time-ordered, each a
 * clipped stretch of one resident tile — possibly at different pyramid levels
 * side by side, where a fine tile has landed next to a coarse one still standing
 * in. The output is a `LineSegmentsGeometry` pair buffer (see `lineBuffer.ts`).
 *
 * ## Continuity, and where it must break
 *
 * Consecutive segments are joined: a fine stretch meeting a coarse one is still one
 * trace, and drawing a hole at every level boundary would read as missing data. But
 * where the segments leave a real GAP — part of the window with nothing resident —
 * the run BREAKS. A line bridging a gap would draw a confident straight segment
 * across time nothing was read for, which looks exactly like data. `writeRunPairs`
 * takes explicit run bounds for precisely this reason.
 *
 * ## Precision
 *
 * x is written as `time − timeOrigin`. World times can sit near 1.8e9 (a world
 * anchored at a Unix epoch in seconds), where float32 resolves ~128 units and a
 * trace would collapse to a staircase. The origin is a per-scope double and the
 * subtraction happens here, in float64, before the cast.
 */

export type PackedChannel = {
  /** `LineSegmentsGeometry` pair buffer: 6 floats per segment. */
  pairs: Float32Array;
  segmentCount: number;
  /** Time-ordered x (time − origin) of every packed point — for the probe. */
  xs: Float64Array;
  /** Values of every packed point, parallel to `xs`. */
  ys: Float32Array;
  valueMin: number | null;
  valueMax: number | null;
  /** Some stretch was packed as a per-pixel min/max envelope, not samples. */
  decimated: boolean;
};

/** A gap wider than this many local periods breaks the run. */
export const GAP_TOLERANCE = 1.5;

/**
 * Above this many samples per pixel column a stretch is packed as its min/max
 * ENVELOPE — two points per column, the extremes in time order — instead of one
 * point per sample. Below it, every sample is kept.
 */
export const SAMPLES_PER_PIXEL_LIMIT = 2;

const EMPTY: PackedChannel = {
  pairs: new Float32Array(0),
  segmentCount: 0,
  xs: new Float64Array(0),
  ys: new Float32Array(0),
  valueMin: null,
  valueMax: null,
  decimated: false,
};

/** Samples per summary block. */
export const SUMMARY_BLOCK = 256;
/** Tiles shorter than this are scanned raw — a summary would not pay for itself. */
export const SUMMARY_MIN_SAMPLES = 16_384;

export type ColumnSummary = { block: number; minIndex: Int32Array; maxIndex: Int32Array };

/**
 * Where each block's minimum and maximum sit — a one-level min/max pyramid of a
 * column, built once when a tile lands. It is what makes a zoomed-out envelope
 * of a trace with no server pyramid O(pixels) rather than O(samples): 1.25 M
 * samples become ~5 000 block entries.
 */
export const summarizeColumn = (column: ArrayLike<number>, block = SUMMARY_BLOCK): ColumnSummary => {
  const blocks = Math.ceil(column.length / block);
  const minIndex = new Int32Array(blocks).fill(-1);
  const maxIndex = new Int32Array(blocks).fill(-1);
  for (let b = 0; b < blocks; b++) {
    const end = Math.min(column.length, (b + 1) * block);
    let lo = -1;
    let hi = -1;
    for (let i = b * block; i < end; i++) {
      const v = column[i];
      if (!Number.isFinite(v)) continue;
      if (lo < 0 || v < column[lo]) lo = i;
      if (hi < 0 || v > column[hi]) hi = i;
    }
    minIndex[b] = lo;
    maxIndex[b] = hi;
  }
  return { block, minIndex, maxIndex };
};

export type PackOptions = {
  /** The window being drawn and its width in pixels: what "per pixel" means. */
  window?: { start: number; end: number } | null;
  widthPx?: number | null;
};

/**
 * One channel of the drawable segments as a polyline buffer.
 *
 * Never more points than the screen can show: where a stretch holds more than
 * `SAMPLES_PER_PIXEL_LIMIT` samples per pixel column (a trace with no pyramid
 * seen whole, a level coarser than wanted still stood in for), it is reduced to
 * each column's minimum and maximum, in the order they occur. The envelope keeps
 * every excursion visible — a spike one sample wide still reaches its peak — and
 * bounds the output at ~2 × width points per channel, whatever the data length.
 * Without it a 1.25 M-sample trace seen whole was 1.25 M line instances per
 * channel, re-uploaded on every tile landing.
 */
export const packChannel = (
  segments: readonly DrawSegment[],
  channel: number,
  timeOrigin: number,
  options: PackOptions = {},
): PackedChannel => {
  const window = options.window ?? null;
  const widthPx = options.widthPx ?? 0;
  const bucket = window && widthPx > 0 ? (window.end - window.start) / widthPx : 0;

  type Plan = {
    column: ArrayLike<number>;
    channelSummary: ColumnSummary | null;
    tile: DrawSegment["tile"];
    from: number;
    to: number;
    step: number;
    dense: boolean;
  };
  const plans: Plan[] = [];
  let capacity = 0;
  for (const segment of segments) {
    const { tile } = segment;
    const column = tile.channels[channel];
    const period = tile.period;
    if (!column || !period) continue;
    // Sample indices (within the tile) whose times fall inside the clip. Solved
    // rather than scanned, and ordered, since a negative period runs backwards.
    const toLocal = (t: number) => (t - tile.t0) / period - tile.samples.start;
    const a = toLocal(segment.start);
    const b = toLocal(segment.end);
    const first = Math.max(0, Math.ceil(Math.min(a, b) - 1e-9));
    const last = Math.min(column.length - 1, Math.floor(Math.max(a, b) + 1e-9));
    if (last < first) continue;
    const count = last - first + 1;
    const dense = bucket > 0 && bucket / Math.abs(period) > SAMPLES_PER_PIXEL_LIMIT;
    capacity += dense ? 2 * (Math.ceil(Math.abs(segment.end - segment.start) / bucket) + 2) : count;
    plans.push({
      column,
      channelSummary: tile.summaries?.[channel] ?? null,
      tile,
      from: period > 0 ? first : last,
      to: period > 0 ? last : first,
      step: period > 0 ? 1 : -1,
      dense,
    });
  }
  if (capacity === 0) return EMPTY;

  const xs = new Float64Array(capacity);
  const ys = new Float32Array(capacity);
  /** The spacing a point was sampled at — a sample period, or a pixel column. */
  const spacing = new Float64Array(capacity);
  let n = 0;
  let decimated = false;
  const push = (x: number, y: number, space: number) => {
    xs[n] = x;
    ys[n] = y;
    spacing[n] = space;
    n++;
  };

  for (const { column, channelSummary, tile, from, to, step, dense } of plans) {
    const period = tile.period;
    const timeAt = (i: number) => tile.t0 + period * (tile.samples.start + i) - timeOrigin;
    if (!dense) {
      for (let i = from; step > 0 ? i <= to : i >= to; i += step) {
        const value = column[i];
        if (Number.isFinite(value)) push(timeAt(i), value, Math.abs(period));
      }
      continue;
    }

    decimated = true;
    const origin = window!.start - timeOrigin;
    let current = Number.NaN;
    let minI = -1;
    let maxI = -1;
    const flush = () => {
      if (minI < 0) return;
      // The extremes in the order they occur, so the line goes where the data went.
      const [p, q] = step > 0 === minI <= maxI ? [minI, maxI] : [maxI, minI];
      push(timeAt(p), column[p], bucket);
      if (q !== p) push(timeAt(q), column[q], bucket);
    };
    const consider = (i: number) => {
      const value = column[i];
      if (!Number.isFinite(value)) return;
      const b = Math.floor((timeAt(i) - origin) / bucket);
      if (b !== current) {
        flush();
        current = b;
        minI = maxI = i;
      } else {
        if (value < column[minI]) minI = i;
        if (value > column[maxI]) maxI = i;
      }
    };
    // A block summary is used when a pixel column spans several blocks: each
    // whole block inside the run contributes its two extremes (in index order,
    // so buckets stay monotone) instead of all of its samples. Partial blocks
    // at the ends are scanned raw.
    const summary = channelSummary;
    const blocksPerBucket = summary ? bucket / Math.abs(period) / summary.block : 0;
    if (summary && step > 0 && blocksPerBucket >= 2) {
      const B = summary.block;
      let i = from;
      while (i <= to) {
        if (i % B === 0 && i + B - 1 <= to) {
          const b = i / B;
          const lo = summary.minIndex[b];
          const hi = summary.maxIndex[b];
          if (lo >= 0) {
            consider(Math.min(lo, hi));
            if (hi !== lo) consider(Math.max(lo, hi));
          }
          i += B;
        } else {
          consider(i);
          i += 1;
        }
      }
    } else {
      for (let i = from; step > 0 ? i <= to : i >= to; i += step) consider(i);
    }
    flush();
  }

  if (n === 0) return EMPTY;
  const outXs = xs.subarray(0, n);
  const outYs = ys.subarray(0, n);
  let valueMin = Infinity;
  let valueMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = outYs[i];
    if (v < valueMin) valueMin = v;
    if (v > valueMax) valueMax = v;
  }
  if (n < 2) {
    return { ...EMPTY, xs: outXs.slice(), ys: outYs.slice(), valueMin, valueMax, decimated };
  }

  // Runs: split wherever consecutive points are further apart than the local
  // spacing allows — that is a coverage gap, and must not be bridged.
  const runs: { start: number; length: number }[] = [];
  let runStart = 0;
  for (let i = 1; i < n; i++) {
    const allowed = GAP_TOLERANCE * Math.max(spacing[i], spacing[i - 1]);
    if (outXs[i] - outXs[i - 1] > allowed + 1e-9) {
      runs.push({ start: runStart, length: i - runStart });
      runStart = i;
    }
  }
  runs.push({ start: runStart, length: n - runStart });

  const segmentCount = runs.reduce((acc, run) => acc + segmentCountFor(run.length), 0);
  const pairs = new Float32Array(segmentCount * FLOATS_PER_SEGMENT);
  const coords = { x: outXs, y: outYs, z: null };
  let offset = 0;
  for (const run of runs) {
    const written = writeRunPairs(pairs, offset, coords, run.start, run.length);
    if (written < 0) throw new Error("tracePacking: pair buffer undersized");
    offset += written;
  }

  return {
    pairs,
    segmentCount,
    xs: outXs.slice(),
    ys: outYs.slice(),
    valueMin,
    valueMax,
    decimated,
  };
};

/**
 * Split a window read into per-channel columns, done ONCE when a tile lands.
 *
 * `shape`/`strides` are the window's (row-major); the time axis and the optional
 * channel axis are located by index, having been resolved by NAME upstream. Any
 * other axis must have been read at extent 1 — a trace has nowhere to put it.
 */
export const splitChannels = (
  window: { shape: readonly number[]; strides: readonly number[]; data: ArrayLike<number> },
  timeAxisIndex: number,
  channelAxisIndex: number | null,
): Float32Array[] => {
  const samples = window.shape[timeAxisIndex] ?? 0;
  const channels = channelAxisIndex == null ? 1 : (window.shape[channelAxisIndex] ?? 1);
  const tStride = window.strides[timeAxisIndex] ?? 1;
  const cStride = channelAxisIndex == null ? 0 : (window.strides[channelAxisIndex] ?? 0);

  // One contiguous channel that already IS the column (a single-channel trace
  // read zero-copy): no de-interleaving pass, no copy. Read-only by contract.
  if (channels === 1 && tStride === 1 && window.data instanceof Float32Array && window.data.length === samples) {
    return [window.data];
  }

  const out: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    const column = new Float32Array(samples);
    const base = c * cStride;
    for (let i = 0; i < samples; i++) column[i] = window.data[base + i * tStride];
    out.push(column);
  }
  return out;
};
