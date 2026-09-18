import { placementToTimeMap, type AffinePlacementLike, type TimeMap } from "../coords/timeMap";
import { timeAxisName, type CoordinateSystemLike } from "../coords/timeAxis";

/**
 * Turning a spikes layer into something the renderer can read.
 *
 * A spike set is a SPARSE matrix over (unit, time): a nonzero at (u, s) is a
 * spike of unit u at sample s, its value the amplitude. Stored anndata-style —
 * one or more layouts, each compressed along one axis (`indptr` walks it). A
 * raster wants every spike of a unit together, so it reads the layout indexed
 * on the UNIT axis: unit u's spikes are `indices[indptr[u]:indptr[u+1]]`, and a
 * block of units is one contiguous range.
 *
 * The unit and time axes are found by TYPE on the dataset's coordinate system
 * (INDEX, TIME) — never by name or position. The layer's `asAffine` maps the
 * time axis to world time exactly as a trace's maps its sample axis.
 *
 * Pure — runs in node.
 */

export type SparseLayoutLike = {
  path: string;
  indexedAxis: number;
  indexOrder: readonly number[];
  rangeReadable?: boolean | null;
};

export type SparseDatasetLike = {
  id: string;
  name: string;
  axisNames: readonly string[];
  shape: readonly number[];
  coordinateSystem?: CoordinateSystemLike | null;
  arrays: readonly {
    path: string;
    indexedAxis: number;
    store: { id: string; key: string; shape?: readonly number[] | null; layouts: readonly SparseLayoutLike[] };
  }[];
};

export type SpikeSource = {
  datasetId: string;
  /** What `@/lib/sparse/sparseReader.openSparseLayout` takes. */
  choice: {
    store: { id: string; key: string; shape?: readonly number[] | null };
    layout: SparseLayoutLike;
    indexedAxis: number;
    objectAxis: number;
  };
  unitAxis: string;
  timeAxis: string;
  unitCount: number;
  /** Samples along the time axis — the raster's extent, known without a read. */
  timeCount: number;
  /** Sample index along the time axis → world time. */
  timeMap: TimeMap;
};

export type SpikeSourceFailure =
  | "no-unit-axis"
  | "no-time-axis"
  | "not-rank-2"
  | "no-unit-layout"
  | "byte-addressable"
  | "no-placement";

const axisOfType = (dataset: SparseDatasetLike, type: string): string | null => {
  const axes = dataset.coordinateSystem?.axes ?? [];
  const typed = axes.find((a) => a.type === type)?.name ?? null;
  return typed && dataset.axisNames.includes(typed) ? typed : null;
};

export const buildSpikeSource = (args: {
  dataset: SparseDatasetLike;
  asAffine: AffinePlacementLike | null | undefined;
  world: CoordinateSystemLike | null | undefined;
}): { ok: true; source: SpikeSource } | { ok: false; reason: SpikeSourceFailure } => {
  const { dataset } = args;
  if (dataset.axisNames.length !== 2) return { ok: false, reason: "not-rank-2" };
  const unitAxis = axisOfType(dataset, "INDEX");
  if (!unitAxis) return { ok: false, reason: "no-unit-axis" };
  const timeAxis = axisOfType(dataset, "TIME");
  if (!timeAxis) return { ok: false, reason: "no-time-axis" };
  const unitIndex = dataset.axisNames.indexOf(unitAxis);
  const timeIndex = dataset.axisNames.indexOf(timeAxis);

  // The layout indexed on the unit axis — the store's own record of it, matched
  // by path, never a path built here (docstrings disagree on how layouts are named).
  let choice: SpikeSource["choice"] | null = null;
  for (const array of dataset.arrays) {
    if (array.indexedAxis !== unitIndex) continue;
    const layout = array.store.layouts.find((l) => l.path === array.path && l.indexedAxis === unitIndex);
    if (!layout) continue;
    if (layout.rangeReadable) return { ok: false, reason: "byte-addressable" };
    choice = { store: array.store, layout, indexedAxis: unitIndex, objectAxis: timeIndex };
    break;
  }
  if (!choice) return { ok: false, reason: "no-unit-layout" };

  const worldTime = timeAxisName(args.world);
  const timeMap = placementToTimeMap(args.asAffine, timeAxis, worldTime);
  if (!timeMap) return { ok: false, reason: "no-placement" };

  return {
    ok: true,
    source: {
      datasetId: dataset.id,
      choice,
      unitAxis,
      timeAxis,
      unitCount: dataset.shape[unitIndex] ?? 0,
      timeCount: dataset.shape[timeIndex] ?? 0,
      timeMap,
    },
  };
};

/**
 * One block of units as ticks: world-time x (minus origin), the lane (display
 * row) of each, and its amplitude. `laneOf[u]` is unit `from + u`'s display
 * lane, or −1 when the unit is filtered out (its spikes are skipped).
 */
export const packSpikes = (
  block: { offsets: ArrayLike<number>; indices: ArrayLike<number>; values: ArrayLike<number> },
  laneOf: (unitOffset: number) => number,
  map: TimeMap,
  timeOrigin: number,
): { xs: Float64Array; lanes: Uint32Array; values: Float32Array } => {
  const units = block.offsets.length - 1;
  let total = 0;
  for (let u = 0; u < units; u++) {
    if (laneOf(u) >= 0) total += block.offsets[u + 1] - block.offsets[u];
  }
  const xs = new Float64Array(total);
  const lanes = new Uint32Array(total);
  const values = new Float32Array(total);
  let k = 0;
  for (let u = 0; u < units; u++) {
    const lane = laneOf(u);
    if (lane < 0) continue;
    for (let i = block.offsets[u]; i < block.offsets[u + 1]; i++) {
      xs[k] = map.t0 + map.period * block.indices[i] - timeOrigin;
      lanes[k] = lane;
      values[k] = block.values[i];
      k++;
    }
  }
  return { xs, lanes, values };
};

/**
 * The display lane of every unit: `order` (unit indices, top first) as given by
 * `rowOrderColumn`, else index order; units a filter removed get −1.
 */
export const unitLanes = (
  unitCount: number,
  order: readonly number[] | null,
  keep: ((unit: number) => boolean) | null,
): Int32Array => {
  const lanes = new Int32Array(unitCount).fill(-1);
  const sequence = order ?? Array.from({ length: unitCount }, (_, u) => u);
  let lane = 0;
  for (const unit of sequence) {
    if (unit < 0 || unit >= unitCount || lanes[unit] !== -1) continue;
    if (keep && !keep(unit)) continue;
    lanes[unit] = lane++;
  }
  return lanes;
};

/** How many lanes `unitLanes` produced. */
export const laneCountOf = (lanes: Int32Array): number => {
  let max = -1;
  for (const lane of lanes) if (lane > max) max = lane;
  return max + 1;
};
