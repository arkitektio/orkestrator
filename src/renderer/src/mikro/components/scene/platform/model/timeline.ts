/**
 * A table's timeline: the distinct times it observed, and each row's position
 * in them.
 *
 * **Index space, not t space.** A table-backed layer's time column holds raw
 * values — frame numbers, seconds, whatever the writer put there — but every
 * scrubber in the scene speaks INDICES (`viewerStore.dimSelections`, an index
 * into an axis). Resolving rows to positions in the observed timeline once, at
 * read time, is what lets a track table and the image it was tracked on share
 * one `t` slider: index 7 means "the eighth timepoint" on both sides, whatever
 * the table's units were.
 *
 * It also means the timeline is a fact about the DATA, not about the fragment —
 * unknowable until the scan returns, which is why table-backed layers PUBLISH
 * their extents (`sceneStore.layerDimExtents`) where a lens-backed layer's are
 * simply declared.
 *
 * Lives in `platform/` because both the tracks and the points features need it
 * and features may not import each other (`architecture.test.ts`).
 */

/** The distinct values of a column, ascending — the layer's timeline. */
export const distinctAscending = (column: ArrayLike<number>): Float64Array => {
  const seen = new Set<number>();
  for (let index = 0; index < column.length; index += 1) {
    const value = column[index];
    if (Number.isFinite(value)) seen.add(value);
  }
  return Float64Array.from(seen).sort();
};

/**
 * Each row's time as its position in the timeline.
 *
 * A `Map` rather than a binary search per row: the timeline is small (one entry
 * per frame) and the column is large, so one pass building the lookup beats
 * `n log m` probes. A row whose time is not finite lands at index 0 rather than
 * at NaN, which draws it at the start instead of never.
 */
export const indexRows = (
  column: ArrayLike<number>,
  timeline: Float64Array,
): Float32Array => {
  const positions = new Map<number, number>();
  for (let index = 0; index < timeline.length; index += 1) positions.set(timeline[index], index);
  const out = new Float32Array(column.length);
  for (let index = 0; index < column.length; index += 1) {
    out[index] = positions.get(column[index]) ?? 0;
  }
  return out;
};

/** Both halves in one pass: the observed timeline and every row's index into it. */
export const resolveTimeline = (
  column: ArrayLike<number> | null | undefined,
): { timeline: Float64Array; rowIndices: Float32Array } | null => {
  if (!column) return null;
  const timeline = distinctAscending(column);
  if (timeline.length === 0) return null;
  return { timeline, rowIndices: indexRows(column, timeline) };
};
