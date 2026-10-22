/**
 * Where each frame of a layer sits along a WORLD axis it does not render — time,
 * almost always — so one world-unit slider can pick each layer's own frame.
 *
 * The scene used to scrub non-rendered dims by INDEX: "index 7 means the eighth
 * timepoint on every layer, whatever the units". That is wrong as soon as two
 * layers are sampled differently — a 20 Hz movie and an event-triggered one whose
 * frames were taken at `0, 0.1, 0.15, 2.0 s` share no index space at all. The
 * server already says where each frame sits: a row of `asAffine` for a regularly
 * sampled axis, or an entry of `asAffine.fields` for one given by an array of
 * instants (a field read along one axis: a lookup). This module turns either into one sorted table per layer and dim:
 *
 *     times[k]   the world coordinate of the k-th frame the layer can show
 *     indices[k] that frame's DATASET level-0 index (what the brick path fetches)
 *
 * and answers "which frame at world t?" with the LAST frame at or before t — the
 * frame that was on screen at that moment. Before a layer's first frame there is
 * no such frame, and `indexAt` says so with null.
 *
 * Pure and structural: no generated types, so it runs in node and is shared by
 * the scene and anything else that scrubs a world axis.
 */

/** The `asAffine` shape this module reads, structurally. */
export type PlacementWithFields = {
  matrix?: readonly (readonly number[])[] | null;
  inputAxes?: readonly string[] | null;
  outputAxes?: readonly string[] | null;
  fields?: readonly PlacementFieldLike[] | null;
};

/**
 * One `asAffine.fields` entry: a destination axis given by an array's values. A
 * field read along ONE source axis -- a lookup -- also states `inputAxis`,
 * `innerScale` and `innerOffset`; a warp or any other field leaves them null.
 */
export type PlacementFieldLike = {
  outputAxis: string;
  inputAxis?: string | null;
  innerScale?: number | null;
  innerOffset?: number | null;
  component?: number | null;
  scale: number;
  offset: number;
};

/** A field read along one source axis: world = scale * values[innerScale * i + innerOffset] + offset. */
export type PlacementLookupLike = PlacementFieldLike & {
  inputAxis: string;
  innerScale: number;
  innerOffset: number;
};

/** Whether a field is a lookup: a 1-D array read along one source axis. */
export const isLookup = (field: PlacementFieldLike): field is PlacementLookupLike =>
  field.inputAxis != null && field.innerScale != null && field.innerOffset != null && field.component == null;

/** The positions of a lens along one dim, as dataset indices: start + j * step, j < length. */
export type LensPositions = { start: number; step: number; length: number };

/** One layer's frames along one world axis, sorted by world coordinate. */
export type AxisInstants = {
  /** The layer's own (dataset) axis name, e.g. `t`. */
  dim: string;
  /** The world axis its frames land on, e.g. `t`. */
  worldAxis: string;
  /** World coordinate of each frame, strictly increasing. */
  times: Float64Array;
  /** Dataset level-0 index of each frame, parallel to `times`. */
  indices: Int32Array;
};

/**
 * Index of the last element `<= value` in an ascending array, or -1 when every
 * element is greater. Binary search; the one copy every world-axis reader uses.
 */
export const lastLE = (sorted: ArrayLike<number>, value: number): number => {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
};

/**
 * A lookup's value at a possibly fractional index: linear between the two sample
 * centres around it, extrapolated with the end spacing beyond them. That is the
 * map's contract (a pyramid level's index is fractional), not a rendering choice.
 */
export const valueAt = (values: ArrayLike<number>, index: number): number => {
  const n = values.length;
  if (n === 0) return Number.NaN;
  if (n === 1) return values[0];
  const lower = Math.min(n - 2, Math.max(0, Math.floor(index)));
  const fraction = index - lower;
  return values[lower] + fraction * (values[lower + 1] - values[lower]);
};

/** Sort (time, index) pairs by time and drop non-finite times. */
const sortedInstants = (
  dim: string,
  worldAxis: string,
  pairs: { time: number; index: number }[],
): AxisInstants | null => {
  const finite = pairs.filter((pair) => Number.isFinite(pair.time));
  if (finite.length === 0) return null;
  finite.sort((a, b) => a.time - b.time);
  return {
    dim,
    worldAxis,
    times: Float64Array.from(finite, (pair) => pair.time),
    indices: Int32Array.from(finite, (pair) => pair.index),
  };
};

/**
 * The world axis a regularly sampled dim lands on, read off `asAffine`: the one
 * output row whose ONLY input coefficient is that dim. A row that mixes the dim
 * with another axis (a rotation through t, which nobody writes) is not a time map
 * and yields nothing rather than a wrong one.
 */
export const affineInstants = (
  placement: PlacementWithFields | null | undefined,
  dim: string,
  positions: LensPositions,
): AxisInstants | null => {
  const row = soleRow(placement, dim);
  if (!row) return null;
  const pairs = Array.from({ length: positions.length }, (_, j) => ({
    time: row.factor * j + row.offset,
    index: positions.start + j * positions.step,
  }));
  return sortedInstants(dim, row.worldAxis, pairs);
};

/**
 * A TABLE's timeline on a world axis. A point or track table's time is a column,
 * not an axis with positions, so its frames are the distinct values it observed
 * (`timeline`), and `indices[k]` is the position k in that timeline — the index the
 * layer's cull already speaks. `column` is the coordinate column's name, which is
 * the table space's axis name and so `asAffine`'s input axis; `dim` is the name
 * the layer scrubs under (`t`).
 */
export const columnInstants = (
  placement: PlacementWithFields | null | undefined,
  column: string,
  dim: string,
  timeline: ArrayLike<number>,
): AxisInstants | null => {
  const row = soleRow(placement, column);
  if (!row) return null;
  const pairs = Array.from({ length: timeline.length }, (_, k) => ({
    time: row.factor * timeline[k] + row.offset,
    index: k,
  }));
  return sortedInstants(dim, row.worldAxis, pairs);
};

/** The one output row of `asAffine` that reads ONLY `axis`, as its world axis, factor and offset. */
const soleRow = (
  placement: PlacementWithFields | null | undefined,
  axis: string,
): { worldAxis: string; factor: number; offset: number } | null => {
  const inputs = placement?.inputAxes ?? [];
  const outputs = placement?.outputAxes ?? [];
  const matrix = placement?.matrix ?? [];
  const column = inputs.indexOf(axis);
  if (column < 0) return null;
  for (let row = 0; row < outputs.length; row += 1) {
    const coefficients = matrix[row];
    if (!coefficients) continue;
    const factor = coefficients[column];
    if (!factor) continue;
    const only = coefficients
      .slice(0, inputs.length)
      .every((value, index) => index === column || value === 0);
    if (!only) continue;
    return { worldAxis: outputs[row], factor, offset: coefficients[inputs.length] ?? 0 };
  }
  return null;
};

/** The lookup `asAffine` carries for a dim, if any: the field read along it alone. */
export const lookupFor = (
  placement: PlacementWithFields | null | undefined,
  dim: string,
): PlacementLookupLike | null =>
  placement?.fields?.filter(isLookup).find((field) => field.inputAxis === dim) ?? null;

/**
 * A dim given by a lookup, once its array's `values` are in hand. Lens position
 * `j` reads the array at `innerScale * j + innerOffset` — which already folds in
 * the lens' slice offset, the server having composed it.
 */
export const lookupInstants = (
  lookup: PlacementLookupLike,
  values: ArrayLike<number>,
  positions: LensPositions,
): AxisInstants | null => {
  const pairs = Array.from({ length: positions.length }, (_, j) => ({
    time: lookup.scale * valueAt(values, lookup.innerScale * j + lookup.innerOffset) + lookup.offset,
    index: positions.start + j * positions.step,
  }));
  return sortedInstants(lookup.inputAxis, lookup.outputAxis, pairs);
};

/**
 * The frame on screen at world coordinate `value`: the last one at or before it.
 * Null before the first frame — the layer had nothing to show yet.
 */
export const indexAt = (instants: AxisInstants, value: number): number | null => {
  const k = lastLE(instants.times, value);
  return k < 0 ? null : instants.indices[k];
};

/** The world coordinate a layer shows at dataset index `index`, or null when it never shows it. */
export const timeOfIndex = (instants: AxisInstants, index: number): number | null => {
  const k = instants.indices.indexOf(index);
  return k < 0 ? null : instants.times[k];
};

/** One world-axis scrubber: its range and the instants a step lands on. */
export type WorldScrubber = {
  axis: string;
  min: number;
  max: number;
  /** Every contributing frame's world coordinate, ascending and de-duplicated. */
  snaps: number[];
  layers: { id: string; dim: string; count: number }[];
};

/**
 * One scrubber per world axis, over the UNION of every layer's frames. Snapping
 * to that union is what makes stepping land on "the next event" whichever layer
 * it belongs to, and the range covers the earliest first frame to the latest last.
 */
export const foldWorldScrubbers = (
  contributions: readonly { layerId: string; instants: readonly AxisInstants[] }[],
): WorldScrubber[] => {
  const byAxis = new Map<string, { values: number[]; layers: WorldScrubber["layers"] }>();
  for (const { layerId, instants } of contributions) {
    for (const entry of instants) {
      if (entry.times.length < 2) continue;
      const bucket = byAxis.get(entry.worldAxis) ?? { values: [], layers: [] };
      for (const time of entry.times) bucket.values.push(time);
      bucket.layers.push({ id: layerId, dim: entry.dim, count: entry.times.length });
      byAxis.set(entry.worldAxis, bucket);
    }
  }
  return [...byAxis.entries()]
    .map(([axis, { values, layers }]) => {
      values.sort((a, b) => a - b);
      const snaps: number[] = [];
      for (const value of values) {
        const last = snaps[snaps.length - 1];
        // Equal within float noise is one instant: two layers on one clock.
        if (last === undefined || Math.abs(value - last) > 1e-9 * Math.max(1, Math.abs(value))) {
          snaps.push(value);
        }
      }
      return { axis, min: snaps[0], max: snaps[snaps.length - 1], snaps, layers };
    })
    .sort((a, b) => a.axis.localeCompare(b.axis));
};

/** The snap point nearest `value`. */
export const nearestSnap = (snaps: readonly number[], value: number): number => {
  if (snaps.length === 0) return value;
  const k = lastLE(snaps, value);
  if (k < 0) return snaps[0];
  if (k >= snaps.length - 1) return snaps[snaps.length - 1];
  return value - snaps[k] <= snaps[k + 1] - value ? snaps[k] : snaps[k + 1];
};

/** Milliseconds per one of each time unit an axis may carry; anything else is not a clock. */
const MS_PER_UNIT: Record<string, number> = {
  ps: 1e-9, picosecond: 1e-9,
  ns: 1e-6, nanosecond: 1e-6,
  us: 1e-3, "µs": 1e-3, microsecond: 1e-3,
  ms: 1, millisecond: 1,
  s: 1000, sec: 1000, second: 1000,
  min: 60_000, minute: 60_000,
  h: 3_600_000, hour: 3_600_000,
  d: 86_400_000, day: 86_400_000,
};

/**
 * The wall-clock instant of world coordinate `t`: `epoch + t * unit`. The epoch is
 * a reference of the SPACE, set when it was created — the coordinates on its time
 * axis are absolute in it, so this is the only arithmetic there is. Null when the
 * space has no epoch or its axis is not in a time unit.
 */
export const wallClockAt = (
  epoch: string | Date | null | undefined,
  t: number,
  unit: string | null | undefined,
): Date | null => {
  if (!epoch || !Number.isFinite(t)) return null;
  const factor = MS_PER_UNIT[String(unit ?? "").trim().toLowerCase()];
  if (factor === undefined) return null;
  const origin = typeof epoch === "string" ? Date.parse(epoch) : epoch.getTime();
  if (!Number.isFinite(origin)) return null;
  return new Date(origin + t * factor);
};

/** `HH:MM:SS.mmm` in UTC — a clock reading, its date left to the caller. */
export const formatClock = (instant: Date): string => instant.toISOString().slice(11, 23);
