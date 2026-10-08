import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import { createTraceSlice, type TraceSlice } from "@/core/data/plot/lines/traceSlice";
import { createRangeStore } from "@/core/data/plot/stores/rangeStore";
import { createViewerStore, type ViewerState } from "@/core/data/plot/stores/viewerStore";
import type { ParquetQueryEngine } from "@/core/data/parquet/parquetEngine";
import type { ChartLayerState, SeriesSource } from "../../platform/model/chartLayerModel";
import { SeriesTableDriver, WHOLE_TABLE_MAX } from "./SeriesTableDriver";
import { ENVELOPE_COLUMNS, SERIES_COLUMNS } from "./seriesSql";

type Span = { start: number; end: number };

const source = (overrides: Partial<SeriesSource> = {}): SeriesSource => ({
  store: { id: "p1" },
  coordinateColumn: "time",
  valueColumn: "area",
  // position = 100 + 2 · time
  axisMap: { period: 2, t0: 100, total: true },
  ...overrides,
});

const layerOf = (series: SeriesSource | null, lineShape: "linear" | "steps" = "linear") =>
  ({ id: "L", series, lineShape }) as unknown as ChartLayerState;

/** A parquet engine that answers the driver's three reads from fixed data. */
const fakeEngine = (table: { n: number; lo: number; hi: number; x: number[]; y: number[] }) => {
  const calls: string[] = [];
  const engine = {
    readAcross: async (_stores: unknown, buildSql: (urlOf: (id: string) => string) => string) => {
      calls.push(buildSql(() => "s3://b/k"));
      return [{ n: table.n, lo: table.lo, hi: table.hi }];
    },
    readColumnsTyped: async (
      _stores: unknown,
      buildSql: (urlOf: (id: string) => string) => string,
      columns: readonly string[],
    ) => {
      calls.push(buildSql(() => "s3://b/k"));
      if (columns.includes(SERIES_COLUMNS.x)) {
        return { [SERIES_COLUMNS.x]: Float64Array.from(table.x), [SERIES_COLUMNS.y]: Float64Array.from(table.y) };
      }
      return {
        [ENVELOPE_COLUMNS.minX]: Float64Array.from(table.x),
        [ENVELOPE_COLUMNS.minY]: Float64Array.from(table.y),
        [ENVELOPE_COLUMNS.maxX]: Float64Array.from(table.x),
        [ENVELOPE_COLUMNS.maxY]: Float64Array.from(table.y),
      };
    },
  } as unknown as ParquetQueryEngine;
  return { engine, calls };
};

const scope = () => {
  const reported: Record<string, Span | null> = {};
  const plotApi = createStore(() => ({
    timeOrigin: 100,
    reportSpan: (id: string, span: Span | null) => {
      reported[id] = span;
    },
  }));
  const rangeApi = createRangeStore({ worldSpan: { start: 100, end: 120 } });
  const viewerApi = createViewerStore([createTraceSlice]) as unknown as ReturnType<
    typeof createStore<ViewerState & TraceSlice>
  >;
  viewerApi.getState().setViewportPx({ width: 400, height: 200 });
  return { plotApi, rangeApi, viewerApi, reported };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("SeriesTableDriver", () => {
  it("reads a table whole, places its rows through the layer's map, and reports its extent", async () => {
    const { plotApi, rangeApi, viewerApi, reported } = scope();
    const { engine } = fakeEngine({ n: 3, lo: 0, hi: 10, x: [0, 5, 10], y: [1, 3, 2] });
    new SeriesTableDriver(layerOf(source()), { plotApi, rangeApi, viewerApi, engine: () => engine });
    await settle();

    expect(reported.L).toEqual({ start: 100, end: 120 });
    const packed = viewerApi.getState().packed.L.channels[0];
    // Relative to the origin (100): positions 100, 110, 120.
    expect([...packed.xs]).toEqual([0, 10, 20]);
    expect(viewerApi.getState().clims.L).toEqual({ lo: 1, hi: 3 });
    expect(viewerApi.getState().readouts.L).toMatchObject({ total: 3, loading: false, density: false });
  });

  it("writes rows in ascending axis order when the map runs backwards", async () => {
    const { plotApi, rangeApi, viewerApi } = scope();
    const { engine } = fakeEngine({ n: 2, lo: 0, hi: 10, x: [0, 10], y: [1, 2] });
    const backwards = source({ axisMap: { period: -2, t0: 120, total: true } });
    new SeriesTableDriver(layerOf(backwards), { plotApi, rangeApi, viewerApi, engine: () => engine });
    await settle();
    const packed = viewerApi.getState().packed.L.channels[0];
    expect([...packed.xs]).toEqual([0, 20]);
    expect([...packed.ys]).toEqual([2, 1]);
  });

  it("repacks a restyle without reading again, and rereads on a new source", async () => {
    const { plotApi, rangeApi, viewerApi } = scope();
    const { engine, calls } = fakeEngine({ n: 2, lo: 0, hi: 10, x: [0, 10], y: [1, 2] });
    const series = source();
    const driver = new SeriesTableDriver(layerOf(series), { plotApi, rangeApi, viewerApi, engine: () => engine });
    await settle();
    const reads = calls.length;

    driver.update(layerOf(series, "steps"));
    expect(calls.length).toBe(reads);
    // One segment became a tread and a riser.
    expect(viewerApi.getState().packed.L.channels[0].segmentCount).toBe(2);

    driver.update(layerOf(source({ valueColumn: "perimeter" })));
    await settle();
    expect(calls.length).toBeGreaterThan(reads);
  });

  it("reads a table too large to hold as a per-window envelope", async () => {
    const { plotApi, rangeApi, viewerApi } = scope();
    const { engine, calls } = fakeEngine({ n: WHOLE_TABLE_MAX + 1, lo: 0, hi: 10, x: [0, 5], y: [1, 4] });
    new SeriesTableDriver(layerOf(source()), { plotApi, rangeApi, viewerApi, engine: () => engine });
    await settle();
    await settle();
    expect(calls.some((sql) => sql.includes("arg_min"))).toBe(true);
    expect(viewerApi.getState().readouts.L).toMatchObject({ density: true });
    expect(viewerApi.getState().packed.L).toBeDefined();
  });

  it("withdraws what it published when disposed", async () => {
    const { plotApi, rangeApi, viewerApi, reported } = scope();
    const { engine } = fakeEngine({ n: 2, lo: 0, hi: 10, x: [0, 10], y: [1, 2] });
    const driver = new SeriesTableDriver(layerOf(source()), { plotApi, rangeApi, viewerApi, engine: () => engine });
    await settle();
    driver.dispose();
    expect(viewerApi.getState().packed.L).toBeUndefined();
    expect(reported.L).toBeNull();
  });

  it("says so when there is no engine to read with", async () => {
    const { plotApi, rangeApi, viewerApi } = scope();
    new SeriesTableDriver(layerOf(source()), { plotApi, rangeApi, viewerApi, engine: () => null });
    await settle();
    expect(viewerApi.getState().readouts.L.error).toMatch(/not ready/);
  });
});
