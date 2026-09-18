import { densityQuads } from "../../platform/marks/BandMarks";
import { countInWindow, densityBins, shouldDrawDensity } from "../../platform/marks/density";
import {
  colorResolver,
  ruleKeeps,
  type ColorByLike,
  type FilterByLike,
  type PickerEntry,
} from "../../platform/pickers/pickerModel";
import { normalizeKey } from "../../platform/pickers/pickerValuesService";
import type { EventMarks } from "../../platform/sources/eventSource";
import type { MarkLabel } from "../../platform/stores/viewerStore";

/**
 * From read marks to what an events layer DRAWS — pure, so the driver's output
 * is testable without a canvas.
 */

/** At most this many labelled marks in view before labels are dropped. */
export const LABEL_BUDGET = 40;

export type EventDraw = {
  instants: Float64Array;
  instantLanes: Uint16Array;
  instantColors: Float32Array | null;
  /** `[x0, x1, y0, y1]` per interval, lane units. */
  intervalQuads: Float32Array;
  intervalColors: Float32Array | null;
  laneCount: number;
  /** Drawn as a density strip rather than ticks. */
  density: boolean;
  densityQuads: Float32Array | null;
  /** Marks kept by the filters. */
  count: number;
};

/** An entry's value for one event row: its own column, or looked up through its join. */
export const pickerValueAt = (
  entry: PickerEntry,
  column: ArrayLike<unknown> | undefined,
  map: Map<unknown, unknown> | undefined,
  row: number,
): unknown => {
  if (!column) return undefined;
  const raw = column[row];
  return (entry.joinPath ?? []).length === 0 ? raw : map?.get(normalizeKey(raw));
};

/** Drop the rows any active filter rejects (AND across rules). */
export const filterMarks = (
  marks: EventMarks,
  keeps: ((row: number) => boolean) | null,
): EventMarks => {
  if (!keeps) return marks;
  const inst = [...marks.instantRows.keys()].filter((i) => keeps(marks.instantRows[i]));
  const intv = [...marks.intervalRows.keys()].filter((i) => keeps(marks.intervalRows[i]));
  return {
    ...marks,
    instants: Float64Array.from(inst, (i) => marks.instants[i]),
    instantLanes: Uint16Array.from(inst, (i) => marks.instantLanes[i]),
    instantRows: Uint32Array.from(inst, (i) => marks.instantRows[i]),
    intervals: Float64Array.from(intv.flatMap((i) => [marks.intervals[i * 2], marks.intervals[i * 2 + 1]])),
    intervalLanes: Uint16Array.from(intv, (i) => marks.intervalLanes[i]),
    intervalRows: Uint32Array.from(intv, (i) => marks.intervalRows[i]),
    count: inst.length + intv.length,
  };
};

export const rowFilter = (
  filters: readonly { entry: FilterByLike; valueAt: (row: number) => unknown }[],
): ((row: number) => boolean) | null =>
  filters.length === 0 ? null : (row) => filters.every(({ entry, valueAt }) => ruleKeeps(entry, valueAt(row)));

/** One RGB per mark from the active colour-by; null when there is nothing to colour by. */
export const markColors = (
  marks: EventMarks,
  entry: ColorByLike,
  valueAt: (row: number) => unknown,
  base: [number, number, number],
  sample: (colormap: string | null, t: number) => [number, number, number],
): { instants: Float32Array; intervals: Float32Array } | null => {
  const rowValues = Array.from({ length: marks.labels.length }, (_, row) => valueAt(row));
  if (rowValues.every((v) => v === undefined)) return null;
  const resolve = colorResolver(entry, rowValues, sample);
  const rgbOf = (row: number) => resolve(rowValues[row]) ?? base;
  const instants = new Float32Array(marks.instantRows.length * 3);
  marks.instantRows.forEach((row, i) => instants.set(rgbOf(row), i * 3));
  const intervals = new Float32Array(marks.intervalRows.length * 3);
  marks.intervalRows.forEach((row, i) => intervals.set(rgbOf(row), i * 3));
  return { instants, intervals };
};

export const intervalQuadsOf = (marks: EventMarks): Float32Array => {
  const n = marks.intervals.length / 2;
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const lane = marks.intervalLanes[i];
    out.set([marks.intervals[i * 2], marks.intervals[i * 2 + 1], -(lane + 0.12), -(lane + 0.88)], i * 4);
  }
  return out;
};

/** What to draw for a window (in origin-relative time) at a canvas width. */
export const eventDrawFor = (
  marks: EventMarks,
  colors: { instants: Float32Array; intervals: Float32Array } | null,
  window: { start: number; end: number },
  widthPx: number,
): EventDraw => {
  const density = shouldDrawDensity(countInWindow(marks.instants, window.start, window.end), widthPx);
  return {
    instants: marks.instants,
    instantLanes: marks.instantLanes,
    instantColors: colors?.instants ?? null,
    intervalQuads: intervalQuadsOf(marks),
    intervalColors: colors?.intervals ?? null,
    laneCount: Math.max(1, marks.lanes.length),
    density,
    densityQuads: density
      ? densityQuads(densityBins(marks.instants, window.start, window.end, Math.max(1, widthPx / 2)), window.start, window.end)
      : null,
    count: marks.count,
  };
};

/** The labels worth drawing in a window — null when there are too many, or none. */
export const markLabelsFor = (
  marks: EventMarks,
  window: { start: number; end: number },
  timeOrigin: number,
): MarkLabel[] | null => {
  const laneCount = Math.max(1, marks.lanes.length);
  const labels: MarkLabel[] = [];
  const push = (x: number, row: number, lane: number) => {
    const text = marks.labels[row];
    if (text && x >= window.start && x <= window.end) labels.push({ time: x + timeOrigin, text, lane, laneCount });
  };
  marks.instants.forEach((x, i) => push(x, marks.instantRows[i], marks.instantLanes[i]));
  for (let i = 0; i < marks.intervalRows.length; i++) {
    push(marks.intervals[i * 2], marks.intervalRows[i], marks.intervalLanes[i]);
  }
  return labels.length > 0 && labels.length <= LABEL_BUDGET ? labels : null;
};
