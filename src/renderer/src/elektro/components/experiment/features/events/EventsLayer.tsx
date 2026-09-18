import { useEffect, useMemo } from "react";
import { Color } from "three";
import type { ExpEventsLayerFragment } from "@/elektro/api/graphql";
import { sampleColorMapRgb, type ColorMap } from "@/lib/scene/gpu/colormaps";
import {
  activeEntries,
  colorResolver,
  ruleKeeps,
  type PickerEntry,
} from "../../platform/pickers/pickerModel";
import { normalizeKey, usePickerValues } from "../../platform/pickers/usePickerValues";
import { unitIdColumn } from "../../platform/sources/unitTable";
import { BarMesh, TickLines, densityQuads } from "../../platform/marks/BandMarks";
import { countInWindow, densityBins, shouldDrawDensity } from "../../platform/marks/density";
import { useExperimentStore } from "../../platform/stores/experimentStore";
import { useRangeStore } from "../../platform/stores/rangeStore";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";
import { useLayerState } from "../traces/useLayerState";
import { useEventMarks } from "./useEventMarks";

/**
 * An events layer: a parquet table of instants and intervals, drawn in the
 * layer's row — one sub-lane per distinct `laneColumn` value.
 *
 *  - instants → ticks; intervals (a `stopColumn`) → shaded bars;
 *  - more instants in view than pixel columns → a density strip instead (the
 *    same rule the spike raster follows: never more marks than pixels);
 *  - labels (a `labelColumn`) go to the DOM overlay only when few enough marks
 *    are in view to read them;
 *  - the active colour-by colours each mark, the active filter-bys drop rows
 *    (AND across rules) — their columns ride along on the events read, and a
 *    joined entry's values come from one walk keyed by the row's foreign key.
 *
 * Reads and density follow the COMMITTED window: a gesture moves the camera over
 * what is already drawn, and the strip is recomputed when it settles.
 */

/** At most this many labelled marks in view before labels are dropped. */
export const LABEL_BUDGET = 40;

export const EventsLayer = ({ layerId }: { layerId: string }) => {
  const layer = useLayerState(layerId);
  const raw = useExperimentStore((s) => s.rawLayers[layerId]) as ExpEventsLayerFragment | undefined;
  const table = raw?.tableDataset ?? null;

  const pickers = useMemo(() => (raw ? activeEntries(raw) : { colorBy: null, filters: [] }), [raw]);
  const pickerEntries = useMemo(
    () => [...(pickers.colorBy ? [pickers.colorBy] : []), ...pickers.filters],
    [pickers],
  );
  // One extra column per entry: its own column (direct) or the foreign key its
  // join starts from.
  const extras = useMemo(
    () =>
      pickerEntries.map(({ key, entry }) => ({
        alias: `__p_${key}`,
        sql: `"${((entry.joinPath ?? [])[0]?.column ?? entry.column).replaceAll('"', '""')}"`,
      })),
    [pickerEntries],
  );
  const root = useMemo(
    () => (table ? { id: table.id, store: table.store, idColumn: unitIdColumn(table) } : null),
    [table],
  );
  const { maps } = usePickerValues(root, pickerEntries, 1);
  const { marks: allMarks, extra } = useEventMarks(layerId, layer?.events ?? null, extras);

  /** An entry's value for one event row. */
  const valueAt = useMemo(() => {
    const byKey = new Map(pickerEntries.map((e) => [e.key, e.entry]));
    return (key: string, row: number): unknown => {
      const entry = byKey.get(key) as PickerEntry | undefined;
      const column = extra[`__p_${key}`];
      if (!entry || !column) return undefined;
      const raw = column[row];
      return (entry.joinPath ?? []).length === 0 ? raw : maps[key]?.get(normalizeKey(raw));
    };
  }, [pickerEntries, extra, maps]);

  // Filters: drop rows any active rule rejects.
  const marks = useMemo(() => {
    if (!allMarks || pickers.filters.length === 0) return allMarks;
    const keeps = (row: number) =>
      pickers.filters.every(({ key, entry }) => ruleKeeps(entry, valueAt(key, row)));
    const inst = [...allMarks.instantRows.keys()].filter((i) => keeps(allMarks.instantRows[i]));
    const intv = [...allMarks.intervalRows.keys()].filter((i) => keeps(allMarks.intervalRows[i]));
    return {
      ...allMarks,
      instants: Float64Array.from(inst, (i) => allMarks.instants[i]),
      instantLanes: Uint16Array.from(inst, (i) => allMarks.instantLanes[i]),
      instantRows: Uint32Array.from(inst, (i) => allMarks.instantRows[i]),
      intervals: Float64Array.from(intv.flatMap((i) => [allMarks.intervals[i * 2], allMarks.intervals[i * 2 + 1]])),
      intervalLanes: Uint16Array.from(intv, (i) => allMarks.intervalLanes[i]),
      intervalRows: Uint32Array.from(intv, (i) => allMarks.intervalRows[i]),
      count: inst.length + intv.length,
    };
  }, [allMarks, pickers.filters, valueAt]);

  // Colour: one RGB per mark from the active colour-by.
  const markColors = useMemo(() => {
    if (!marks || !pickers.colorBy) return null;
    const key = pickers.colorBy.key;
    const rowValues = Array.from({ length: marks.labels.length }, (_, row) => valueAt(key, row));
    if (rowValues.every((v) => v === undefined)) return null;
    const resolve = colorResolver(pickers.colorBy.entry, rowValues, (colormap, t) =>
      sampleColorMapRgb(colormap as ColorMap | null, t),
    );
    const base = new Color().setStyle(layer?.color ?? "#ffffff");
    const rgbOf = (row: number) => resolve(rowValues[row]) ?? [base.r, base.g, base.b];
    const instants = new Float32Array(marks.instantRows.length * 3);
    marks.instantRows.forEach((row, i) => instants.set(rgbOf(row), i * 3));
    const intervals = new Float32Array(marks.intervalRows.length * 3);
    marks.intervalRows.forEach((row, i) => intervals.set(rgbOf(row), i * 3));
    return { instants, intervals };
  }, [marks, pickers.colorBy, valueAt, layer?.color]);
  const committed = useRangeStore((s) => s.committedRange);
  const timeOrigin = useExperimentStore((s) => s.timeOrigin);
  const widthPx = useViewerStore((s) => s.viewportPx.width);
  const viewerApi = useViewerStoreApi();

  const laneCount = marks ? Math.max(1, marks.lanes.length) : 1;
  const start = committed.start - timeOrigin;
  const end = committed.end - timeOrigin;

  const inView = useMemo(
    () => (marks ? countInWindow(marks.instants, start, end) : 0),
    [marks, start, end],
  );
  const density = shouldDrawDensity(inView, widthPx);

  const densityBars = useMemo(() => {
    if (!marks || !density) return null;
    return densityQuads(densityBins(marks.instants, start, end, Math.max(1, widthPx / 2)), start, end);
  }, [marks, density, start, end, widthPx]);

  const intervalQuads = useMemo(() => {
    if (!marks) return new Float32Array(0);
    const n = marks.intervals.length / 2;
    const out = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const lane = marks.intervalLanes[i];
      out.set([marks.intervals[i * 2], marks.intervals[i * 2 + 1], -(lane + 0.12), -(lane + 0.88)], i * 4);
    }
    return out;
  }, [marks]);

  // Density is part of the readout: the card says the strip is not the events.
  useEffect(() => {
    if (viewerApi.getState().readouts[layerId]?.density !== density) {
      viewerApi.getState().patchReadout(layerId, { density });
    }
  }, [viewerApi, layerId, density, marks]);

  // Labels, only when there is room for them.
  useEffect(() => {
    const setLabels = viewerApi.getState().setMarkLabels;
    if (!marks || !layer?.events?.labelColumn || density) {
      setLabels(layerId, null);
      return;
    }
    const labels: { time: number; text: string; lane: number; laneCount: number }[] = [];
    const push = (x: number, row: number, lane: number) => {
      const text = marks.labels[row];
      if (text && x >= start && x <= end) labels.push({ time: x + timeOrigin, text, lane, laneCount });
    };
    marks.instants.forEach((x, i) => push(x, marks.instantRows[i], marks.instantLanes[i]));
    for (let i = 0; i < marks.intervalRows.length; i++) {
      push(marks.intervals[i * 2], marks.intervalRows[i], marks.intervalLanes[i]);
    }
    setLabels(layerId, labels.length <= LABEL_BUDGET ? labels : null);
  }, [viewerApi, layerId, marks, layer?.events?.labelColumn, density, start, end, timeOrigin, laneCount]);

  useEffect(() => () => viewerApi.getState().setMarkLabels(layerId, null), [viewerApi, layerId]);

  if (!layer || !marks) return null;
  return (
    <group>
      {intervalQuads.length > 0 && (
        <BarMesh
          layerId={layerId}
          quads={intervalQuads}
          laneCount={laneCount}
          color={layer.color}
          colors={markColors?.intervals ?? null}
          opacity={0.3}
        />
      )}
      {density && densityBars ? (
        <BarMesh layerId={layerId} quads={densityBars} laneCount={1} color={layer.color} opacity={0.8} />
      ) : (
        <TickLines
          layerId={layerId}
          xs={marks.instants}
          lanes={marks.instantLanes}
          laneCount={laneCount}
          height={0.8}
          color={layer.color}
          colors={markColors?.instants ?? null}
          lineWidth={Math.max(1, layer.lineWidth)}
        />
      )}
    </group>
  );
};
