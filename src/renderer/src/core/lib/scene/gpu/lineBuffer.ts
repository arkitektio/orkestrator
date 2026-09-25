/**
 * In-place writers for `LineSegmentsGeometry`'s interleaved buffers.
 *
 * three's own `LineGeometry.setPositions` / `LineSegments2.computeLineDistances`
 * allocate a fresh Float32Array, a fresh InstancedInterleavedBuffer and fresh
 * InterleavedBufferAttributes on every call. New attribute objects mean new
 * attribute ids, which trips the renderer's `needsGeometryUpdate` and orphans
 * the previous GPU buffers until the geometry is disposed — fine once, ruinous
 * per pointer move.
 *
 * These write into the buffers that already exist, so the caller only has to set
 * `needsUpdate` and the backend issues a single `writeBuffer`. Valid only while
 * the point COUNT is unchanged; the caller falls back to `setPositions` when it
 * is not (`platform/draw/PreviewLine.tsx`).
 */

/** Floats per pair-buffer segment: (start.xyz, end.xyz). */
export const FLOATS_PER_SEGMENT = 6;

/** A polyline of N points is N-1 segments. */
export const segmentCountFor = (pointCount: number): number =>
  Math.max(0, pointCount - 1);

export const pairBufferLength = (pointCount: number): number =>
  segmentCountFor(pointCount) * FLOATS_PER_SEGMENT;

/**
 * Expand a polyline into the PAIR layout `LineGeometry.setPositions` produces:
 * segment `i` occupies `[6i .. 6i+5]` as `(P[i].xyz, P[i+1].xyz)`, so every
 * interior vertex is written twice. That duplication IS the layout, not waste —
 * `instanceStart` and `instanceEnd` are two views onto the same interleaved
 * buffer at offsets 0 and 3.
 *
 * Returns the number of segments written, or -1 when `target` is too small — the
 * caller must then reallocate through `setPositions`.
 */
export function writePolylinePairs(
  target: Float32Array,
  points: readonly (readonly [number, number, number])[],
): number {
  const segments = segmentCountFor(points.length);
  if (segments === 0) return 0;
  if (target.length < segments * FLOATS_PER_SEGMENT) return -1;

  for (let index = 0; index < segments; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const offset = index * FLOATS_PER_SEGMENT;

    target[offset] = start[0];
    target[offset + 1] = start[1];
    target[offset + 2] = start[2];
    target[offset + 3] = end[0];
    target[offset + 4] = end[1];
    target[offset + 5] = end[2];
  }

  return segments;
}

/** Parallel coordinate columns, as a columnar read hands them back. */
export type RunCoordinates = {
  x: ArrayLike<number>;
  y: ArrayLike<number>;
  /** Null for a 2D table; every z is then written as 0. */
  z: ArrayLike<number> | null;
};

/**
 * Write ONE run of a multi-run buffer, at a segment offset.
 *
 * `writePolylinePairs` above writes a single polyline from row 0. A track layer
 * draws many trajectories in one `LineSegments2` — one geometry, one material,
 * one draw call instead of N — and that needs two things this adds:
 *
 *  - **An offset**, so run K starts where run K-1 ended.
 *  - **A bounded slice** (`start`, `length`), so the last point of one
 *    trajectory is never paired with the first point of the next. That pairing
 *    is the failure mode this signature exists to make unrepresentable: it
 *    draws a segment leaping across the field between two unrelated tracks,
 *    and it looks enough like data to be believed.
 *
 * Coordinates are taken as PARALLEL COLUMNS rather than as `[x,y,z]` tuples,
 * because that is how `readTrackPositions` returns them — materialising tuples
 * for millions of rows is precisely the allocation cost the columnar read path
 * exists to avoid.
 *
 * Returns the number of segments written, or -1 when `target` is too small for
 * this run at this offset.
 */
export function writeRunPairs(
  target: Float32Array,
  segmentOffset: number,
  coords: RunCoordinates,
  start: number,
  length: number,
): number {
  const segments = segmentCountFor(length);
  if (segments === 0) return 0;
  const base = segmentOffset * FLOATS_PER_SEGMENT;
  if (target.length < base + segments * FLOATS_PER_SEGMENT) return -1;

  const { x, y, z } = coords;
  for (let index = 0; index < segments; index += 1) {
    const from = start + index;
    const to = from + 1;
    const offset = base + index * FLOATS_PER_SEGMENT;

    target[offset] = x[from];
    target[offset + 1] = y[from];
    target[offset + 2] = z ? z[from] : 0;
    target[offset + 3] = x[to];
    target[offset + 4] = y[to];
    target[offset + 5] = z ? z[to] : 0;
  }

  return segments;
}

/**
 * One scalar per segment, at a segment offset — the companion to
 * `writeRunPairs` for a per-segment attribute (a time, a measure).
 *
 * The value taken is the segment's LATER endpoint, `source[from + 1]`. For a
 * time that is what makes "has this segment happened yet" answerable with a
 * single comparison: a segment exists once its far end does. Taking the near
 * end would draw each segment one timepoint early.
 *
 * `source` is indexed in ROW space (parallel to the coordinates); `target` in
 * SEGMENT space. Returns segments written, or -1 when `target` is too small.
 */
export function writeRunScalars(
  target: Float32Array,
  segmentOffset: number,
  source: ArrayLike<number>,
  start: number,
  length: number,
): number {
  const segments = segmentCountFor(length);
  if (segments === 0) return 0;
  if (target.length < segmentOffset + segments) return -1;

  for (let index = 0; index < segments; index += 1) {
    target[segmentOffset + index] = source[start + index + 1];
  }

  return segments;
}

/**
 * Cumulative arc length per segment endpoint, in the `(d0, d1)` interleaved
 * layout the dash shader reads. Stride 2 per segment; `d1` of one segment is
 * `d0` of the next, which is what makes the dash pattern continuous across
 * corners.
 *
 * Leaving these stale while the geometry moves is visibly wrong — the dash pitch
 * drifts near the moving end — so the preview rewrites them alongside the
 * positions.
 */
export function writeLineDistances(
  target: Float32Array,
  pairs: Float32Array,
  segmentCount: number,
): void {
  let distance = 0;

  for (let index = 0; index < segmentCount; index += 1) {
    const offset = index * FLOATS_PER_SEGMENT;
    const dx = pairs[offset + 3] - pairs[offset];
    const dy = pairs[offset + 4] - pairs[offset + 1];
    const dz = pairs[offset + 5] - pairs[offset + 2];

    const slot = index * 2;
    target[slot] = distance;
    distance += Math.sqrt(dx * dx + dy * dy + dz * dz);
    target[slot + 1] = distance;
  }
}
