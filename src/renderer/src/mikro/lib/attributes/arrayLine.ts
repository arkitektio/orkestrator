import { LruMap } from "@/core/util/lruMap";
import type { AxisCoords } from "../coords/axisPath";
import type { WindowReader, WindowStore } from "../zarr/windowReader";
import type { ArrayHopLike, AttributePlanLike, PlanRowsState, PlanSeries } from "./attributeTypes";
import { hopKey } from "./attributeTypes";
import type { HeldValue } from "./planExec";

/**
 * The ARRAY hop's reader: one object's line through a dense array.
 *
 * The held id selects one position along the hop's key axis (through
 * `keyMap`, the derivation edge the server already inverted); the read is
 * that position across the whole value axis — a cell's trace out of a
 * `(cell, t)` array. It goes through the shared window reader, so it uses the
 * grant, the opened arrays and the chunk cache every other window read does.
 *
 * Lines are kept per (hop, position): the cursor re-crossing a cell answers
 * from memory, which is what lets the tracker's instant path include the hop.
 */

/** A line longer than this is read at a stride. A readout a few hundred
 * pixels wide shows no more, and the whole line would be megabytes per hover. */
export const ARRAY_LINE_SAMPLE_CAP = 16_384;

const DEFAULT_LINE_CAP = 128;

export type ArrayLineRead = {
  store: WindowStore;
  /** Positional, in the dataset's axis order. */
  ranges: ({ start: number; stop: number; step?: number } | null)[];
  axis: string;
  valueAxisIndex: number;
  index: number;
  stride: number;
};

export type ArrayLinePlan =
  | { kind: "read"; read: ArrayLineRead }
  /** The id maps past the array's extent: this object has no line. */
  | { kind: "absent" }
  | { kind: "error"; error: string };

/** What to read for `id`, decided from the hop alone. Pure. */
export const planArrayLine = (hop: ArrayHopLike, id: HeldValue): ArrayLinePlan => {
  const { arrayDataset: dataset, lookup } = hop;
  if (lookup.valueAxes.length !== 1 || dataset.axisNames.length !== 2) {
    return {
      kind: "error",
      error: `a line needs one key axis and one value axis, got (${dataset.axisNames.join(", ")})`,
    };
  }
  const axis = lookup.valueAxes[0];
  const keyAxisIndex = dataset.axisNames.indexOf(lookup.keyAxis);
  const valueAxisIndex = dataset.axisNames.indexOf(axis);
  if (keyAxisIndex < 0 || valueAxisIndex < 0 || keyAxisIndex === valueAxisIndex) {
    return { kind: "error", error: `the array has no axes ${lookup.keyAxis} and ${axis}` };
  }
  // Level 0: the grid the key map and the dataset's shape are stated on.
  const level =
    dataset.dataArrays.find((candidate) => candidate.level === 0) ??
    dataset.dataArrays.find(
      (candidate) =>
        candidate.shape?.length === dataset.shape.length &&
        candidate.shape.every((extent, d) => extent === dataset.shape[d]),
    );
  if (!level) return { kind: "error", error: "the array has no stored level" };

  const scale = lookup.keyMap?.scale ?? 1;
  const offset = lookup.keyMap?.offset ?? 0;
  const index = Number(id) * scale + offset;
  if (!Number.isInteger(index)) {
    return { kind: "error", error: `id ${String(id)} does not map onto a position along ${lookup.keyAxis}` };
  }
  if (index < 0 || index >= dataset.shape[keyAxisIndex]) return { kind: "absent" };

  const length = dataset.shape[valueAxisIndex];
  const stride = Math.max(1, Math.ceil(length / ARRAY_LINE_SAMPLE_CAP));
  const ranges: ArrayLineRead["ranges"] = [null, null];
  ranges[keyAxisIndex] = { start: index, stop: index + 1 };
  ranges[valueAxisIndex] = stride > 1 ? { start: 0, stop: length, step: stride } : null;
  return { kind: "read", read: { store: level.store, ranges, axis, valueAxisIndex, index, stride } };
};

/**
 * Where the probed point sits along the line, as an index into its samples;
 * null when the hop does not relate the value axis to the probed system, the
 * point does not carry that axis, or it falls off the line.
 */
export const markerFor = (
  hop: ArrayHopLike,
  series: Pick<PlanSeries, "axis" | "stride" | "values">,
  probed: AxisCoords | null | undefined,
): number | null => {
  const map = hop.lookup.valueAxisMaps?.find((candidate) => candidate.axis === series.axis);
  const at = map && probed ? probed[map.probedAxis] : undefined;
  if (!map || typeof at !== "number" || !Number.isFinite(at)) return null;
  const marker = (at * map.scale + map.offset) / series.stride;
  return marker >= 0 && marker <= series.values.length - 1 ? marker : null;
};

/** The executor's view of the reader (structural, like the sparse one). */
export type ArrayLineReaderLike = {
  read(
    plan: AttributePlanLike,
    hop: ArrayHopLike,
    id: HeldValue,
    options: { isStale?: () => boolean },
  ): Promise<PlanRowsState | null>;
  peek(plan: AttributePlanLike, hop: ArrayHopLike, id: HeldValue): PlanRowsState | null;
  warm(plan: AttributePlanLike, hop: ArrayHopLike): void;
  dispose(): void;
};

export type ArrayLineReaderDeps = {
  read: WindowReader["read"];
  lineCap?: number;
};

const ABSENT: PlanRowsState = { status: "rows", rows: [] };

const errorState = (error: unknown): PlanRowsState => ({
  status: "error",
  rows: [],
  error: error instanceof Error ? error.message : String(error),
});

export function createArrayLineReader(deps: ArrayLineReaderDeps): ArrayLineReaderLike {
  const pending = new LruMap<Promise<PlanRowsState>>(deps.lineCap ?? DEFAULT_LINE_CAP);
  const settled = new LruMap<PlanRowsState>(deps.lineCap ?? DEFAULT_LINE_CAP);
  let disposed = false;

  const lineFor = (key: string, read: ArrayLineRead): Promise<PlanRowsState> => {
    const cached = pending.get(key);
    if (cached) return cached;
    const line = (async () => {
      const window = await deps.read(read.store, read.ranges);
      const length = window.shape[read.valueAxisIndex] ?? 0;
      const step = window.strides[read.valueAxisIndex] ?? 1;
      // A copy: the window may be the cached chunk itself.
      const values = new Float32Array(length);
      for (let i = 0; i < length; i++) values[i] = window.data[i * step];
      const state: PlanRowsState = {
        status: "rows",
        rows: [],
        series: { values, axis: read.axis, index: read.index, stride: read.stride, marker: null },
      };
      settled.set(key, state);
      return state;
    })();
    pending.set(key, line);
    // Self-evict on failure, so a transient error does not stick for the session.
    line.catch(() => {
      if (pending.get(key) === line) pending.take(key);
    });
    return line;
  };

  return {
    async read(plan, hop, id, options) {
      if (disposed) return null;
      const planned = planArrayLine(hop, id);
      if (planned.kind === "absent") return ABSENT;
      if (planned.kind === "error") return errorState(new Error(planned.error));
      let state: PlanRowsState;
      try {
        state = await lineFor(`${hopKey(plan, hop)}|${planned.read.index}`, planned.read);
      } catch (error) {
        return errorState(error);
      }
      return options.isStale?.() || disposed ? null : state;
    },

    peek(plan, hop, id) {
      const planned = planArrayLine(hop, id);
      if (planned.kind === "absent") return ABSENT;
      if (planned.kind === "error") return null;
      return settled.get(`${hopKey(plan, hop)}|${planned.read.index}`) ?? null;
    },

    // Nothing to open ahead: the first read opens the array, and the window
    // reader keeps it.
    warm() {},

    dispose() {
      disposed = true;
      pending.drain();
      settled.drain();
    },
  };
}
