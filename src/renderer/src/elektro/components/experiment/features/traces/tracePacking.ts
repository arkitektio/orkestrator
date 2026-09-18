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
};

/** A gap wider than this many local periods breaks the run. */
export const GAP_TOLERANCE = 1.5;

const EMPTY: PackedChannel = {
  pairs: new Float32Array(0),
  segmentCount: 0,
  xs: new Float64Array(0),
  ys: new Float32Array(0),
  valueMin: null,
  valueMax: null,
};

export const packChannel = (
  segments: readonly DrawSegment[],
  channel: number,
  timeOrigin: number,
): PackedChannel => {
  const xs: number[] = [];
  const ys: number[] = [];
  const periods: number[] = [];

  for (const segment of segments) {
    const { tile } = segment;
    const column = tile.channels[channel];
    if (!column) continue;
    const period = tile.period;
    if (!period) continue;

    // Sample indices (within the tile) whose times fall inside the clip. Solved
    // rather than scanned, and ordered, since a negative period runs backwards.
    const toLocal = (t: number) => (t - tile.t0) / period - tile.samples.start;
    const a = toLocal(segment.start);
    const b = toLocal(segment.end);
    const first = Math.max(0, Math.ceil(Math.min(a, b) - 1e-9));
    const last = Math.min(column.length - 1, Math.floor(Math.max(a, b) + 1e-9));

    const step = period > 0 ? 1 : -1;
    const from = period > 0 ? first : last;
    const to = period > 0 ? last : first;
    for (let i = from; period > 0 ? i <= to : i >= to; i += step) {
      const value = column[i];
      if (!Number.isFinite(value)) continue;
      xs.push(tile.t0 + period * (tile.samples.start + i) - timeOrigin);
      ys.push(value);
      periods.push(Math.abs(period));
    }
  }

  if (xs.length < 2) {
    return xs.length === 0
      ? EMPTY
      : { ...EMPTY, xs: Float64Array.from(xs), ys: Float32Array.from(ys), valueMin: ys[0], valueMax: ys[0] };
  }

  // Runs: split wherever consecutive points are further apart than the local
  // sample spacing allows — that is a coverage gap, and must not be bridged.
  const runs: { start: number; length: number }[] = [];
  let runStart = 0;
  for (let i = 1; i < xs.length; i++) {
    const allowed = GAP_TOLERANCE * Math.max(periods[i], periods[i - 1]);
    if (xs[i] - xs[i - 1] > allowed + 1e-9) {
      runs.push({ start: runStart, length: i - runStart });
      runStart = i;
    }
  }
  runs.push({ start: runStart, length: xs.length - runStart });

  const segmentCount = runs.reduce((acc, run) => acc + segmentCountFor(run.length), 0);
  const pairs = new Float32Array(segmentCount * FLOATS_PER_SEGMENT);
  const coords = { x: xs, y: ys, z: null };
  let offset = 0;
  for (const run of runs) {
    const written = writeRunPairs(pairs, offset, coords, run.start, run.length);
    if (written < 0) throw new Error("tracePacking: pair buffer undersized");
    offset += written;
  }

  let valueMin = Infinity;
  let valueMax = -Infinity;
  for (const v of ys) {
    if (v < valueMin) valueMin = v;
    if (v > valueMax) valueMax = v;
  }

  return {
    pairs,
    segmentCount,
    xs: Float64Array.from(xs),
    ys: Float32Array.from(ys),
    valueMin,
    valueMax,
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

  const out: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    const column = new Float32Array(samples);
    const base = c * cStride;
    for (let i = 0; i < samples; i++) column[i] = window.data[base + i * tStride];
    out.push(column);
  }
  return out;
};
