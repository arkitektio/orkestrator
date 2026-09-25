/**
 * Turning a track table into the buffers a fat line draws from.
 *
 * One `LineSegments2` for the whole layer — one geometry, one material, one
 * draw call — rather than a `<Line>` per trajectory, which would be N materials
 * and N draws for a dataset whose whole point is that N is large.
 *
 * The packing is where the correctness lives. Every trajectory's segments are
 * written into ONE pair buffer at a running offset, and the run bounds are what
 * stop the last point of one track being paired with the first point of the
 * next. That bridging segment is the characteristic failure of this shape: it
 * leaps across the field between two unrelated cells and looks enough like data
 * to be believed. `writeRunPairs` takes the bounds rather than trusting a
 * caller's loop, and `lineBuffer.test.ts` asserts the absence directly.
 */
import {
  FLOATS_PER_SEGMENT,
  writeRunPairs,
  writeRunScalars,
} from "@/core/lib/scene/gpu/lineBuffer";
import { readTrackPositions, type TrackColumns } from "@/mikro/lib/attributes/columnarReads";
import type { AttributeLookupEngine } from "@/mikro/lib/attributes/lookupEngine";
import type { ParquetStoreLike } from "@/mikro/lib/attributes/attributeTypes";
import { distinctAscending, indexRows } from "../../platform/model/timeline";

/**
 * The refusal budget, in the same spirit as the point layer's.
 *
 * A segment costs 6 position floats plus a time and a measure — 32 bytes — and
 * three's own geometry adds its instance views over the same pair buffer. 16 MB
 * is about 500k segments.
 *
 * Refuse LOUDLY rather than subsample. Drawing a random subset of trajectories
 * misrepresents which cells were tracked at all, which is a quieter failure than
 * drawing nothing and a worse one. There is no LOD to fall back on: unlike a
 * mesh collection there is no pre-authored coarser geometry, and unlike an image
 * there is no pyramid.
 */
const TRACK_BYTES_EACH = FLOATS_PER_SEGMENT * 4 + 4 + 4;
const TRACK_MAX_BYTES = 16 * 1024 * 1024;
export const TRACK_MAX_SEGMENTS = Math.floor(TRACK_MAX_BYTES / TRACK_BYTES_EACH);

export type TrackGeometry = {
  /** Positions in the interleaved pair layout `LineSegmentsGeometry` reads. */
  pairs: Float32Array;
  /**
   * Per-segment time, as an INDEX into `timeline` — the later endpoint's.
   * Null when the table has no t column.
   */
  times: Float32Array | null;
  /** Per-segment colour measure. Null when no colorBy column is set. */
  values: Float32Array | null;
  segmentCount: number;
  /** How many trajectories the segments came from — for the card's readout. */
  trackCount: number;
  /**
   * The distinct observed times, ascending. The scene's time slider is an
   * INDEX, so this is what an index means for this layer.
   *
   * Working in index space rather than in raw t is what makes an unevenly
   * sampled table behave: if a movie jumps from t=10 to t=90, "ten timepoints
   * of tail" means ten OBSERVATIONS, not ten units of t — and a tail measured
   * in t would vanish across the gap. It is also what lets a track share the
   * `t` slider with an image layer, whose t has only ever been an index.
   *
   * Null when the table has no t column.
   */
  timeline: Float64Array | null;
};

export type TrackLoadResult = TrackGeometry | { error: string };

export const isTrackLoadError = (
  result: TrackLoadResult | null,
): result is { error: string } => result !== null && "error" in result;

/**
 * Read a track table and pack it, or say why not.
 *
 * Returns `{ error }` for a refusal the user should see, and `null` only when
 * the read could not answer columnwise — the caller refuses either way, but the
 * two are different sentences.
 */
export const loadTrackGeometry = async (
  engine: AttributeLookupEngine,
  store: ParquetStoreLike,
  columns: TrackColumns,
): Promise<TrackLoadResult | null> => {
  const read = await readTrackPositions(engine, store, columns);
  if (!read) return null;

  if (read.segmentCount > TRACK_MAX_SEGMENTS) {
    return {
      error:
        `this table holds ${read.runs.length.toLocaleString()} tracks and ` +
        `${read.segmentCount.toLocaleString()} segments, which is ` +
        `${Math.round((read.segmentCount * TRACK_BYTES_EACH) / 1e6)} MB of line buffer — ` +
        `over the ${Math.round(TRACK_MAX_BYTES / 1e6)} MB this layer will allocate. ` +
        `Narrow the table before drawing it.`,
    };
  }
  if (read.segmentCount === 0) {
    return {
      error:
        read.count === 0
          ? "this table has no rows to draw"
          : `every one of these ${read.runs.length.toLocaleString()} tracks is a single observation, so there is nothing to join`,
    };
  }

  const pairs = new Float32Array(read.segmentCount * FLOATS_PER_SEGMENT);
  const times = read.t ? new Float32Array(read.segmentCount) : null;
  const values = read.value ? new Float32Array(read.segmentCount) : null;

  // Rows carry raw t; the slider speaks indices. Resolve once, here, so the
  // packing and the shader both work in the one space.
  const timeline = read.t ? distinctAscending(read.t) : null;
  const rowIndices = read.t && timeline ? indexRows(read.t, timeline) : null;

  let written = 0;
  for (const run of read.runs) {
    const segments = writeRunPairs(pairs, written, read, run.start, run.length);
    // -1 means the buffer was sized wrong, which would be an arithmetic bug
    // here rather than bad data — stop rather than write past a run.
    if (segments < 0) return { error: "internal: track buffer undersized" };
    if (times && rowIndices) writeRunScalars(times, written, rowIndices, run.start, run.length);
    if (values && read.value) writeRunScalars(values, written, read.value, run.start, run.length);
    written += segments;
  }

  return {
    pairs,
    times,
    values,
    segmentCount: written,
    trackCount: read.runs.length,
    timeline,
  };
};

/** Min/max over the packed per-segment times, skipping non-finite entries. */
const spanOf = (times: Float32Array): { min: number; max: number } | null => {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < times.length; index += 1) {
    const value = times[index];
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
};

/** Min/max over the packed per-segment colour measure. */
export const valueSpanOf = (
  values: Float32Array | null,
): { min: number; max: number } => {
  if (!values || values.length === 0) return { min: 0, max: 1 };
  const span = spanOf(values);
  if (!span) return { min: 0, max: 1 };
  // A constant column would give a zero-width ramp and divide to NaN downstream;
  // widen it instead, the same way `valueWindowOf` does.
  return span.max === span.min ? { min: span.min, max: span.min + 1 } : span;
};
