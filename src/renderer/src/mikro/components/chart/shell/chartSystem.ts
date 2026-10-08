import type { StoreApi } from "zustand/vanilla";
import type { ParquetQueryEngine } from "@/core/data/parquet/parquetEngine";
import { LayerDriverRegistry } from "@/core/data/plot/drivers/layerDriver";
import { TileLineDriver, type ReadWindow } from "@/core/data/plot/lines/TileLineDriver";
import type { TraceSlice } from "@/core/data/plot/lines/traceSlice";
import { TraceMemoryBudget } from "@/core/data/plot/quality/traceBudget";
import { followWorldSpan } from "@/core/data/plot/scope/PlotScopeProvider";
import type { RangeStoreApi } from "@/core/data/plot/stores/rangeStore";
import type { ViewerState } from "@/core/data/plot/stores/viewerStore";
import { SeriesTableDriver } from "../features/series/SeriesTableDriver";
import type { ChartLayerState } from "../platform/model/chartLayerModel";
import type { ChartStoreApi } from "../platform/stores/chartStore";

/** How many finest-level samples the narrowest window must still show. */
export const MIN_VISIBLE_SAMPLES = 8;

export type ChartScopeStores = {
  chart: ChartStoreApi;
  range: RangeStoreApi;
  viewer: StoreApi<ViewerState>;
};

/**
 * What the drivers need from outside the stores. Read through GETTERS, so a
 * dependency arriving late (the parquet engine, the client) reaches the drivers
 * without rebuilding them — a rebuild would refetch every tile.
 */
export type ChartDeps = {
  readonly readWindow: ReadWindow;
  readonly engine: () => ParquetQueryEngine | null;
};

export type ChartSystem = {
  registry: LayerDriverRegistry<ChartLayerState>;
  dispose: () => void;
};

/**
 * Build and start the chart's render-plane system. The ONE construction site:
 * every driver factory, and every cross-store subscription the scope needs, is
 * wired here and torn down by `dispose`.
 *
 * Two kinds read: a trace through the plot engine's tile pipeline, a series
 * through its table driver. An annotation layer is drawn straight from its
 * collection and needs no driver.
 */
export const createChartSystem = (stores: ChartScopeStores, deps: ChartDeps): ChartSystem => {
  const { chart, range } = stores;
  const viewer = stores.viewer as StoreApi<ViewerState & TraceSlice>;

  // The range follows the chart's extent, whoever moves it: a fold (a layer
  // arriving) or a series reporting what its table holds.
  const unfollow = followWorldSpan(chart, range, MIN_VISIBLE_SAMPLES);

  // DuckDB-WASM's cold start is paid up front, in parallel with the zarr reads,
  // as soon as the chart has a series — not by its first read.
  let warmed = false;
  const warmParquet = () => {
    if (warmed) return;
    const engine = deps.engine();
    if (!engine || !chart.getState().layers.some((l) => l.kind === "series")) return;
    warmed = true;
    engine.warmUp();
  };
  warmParquet();
  const unsubscribeWarm = chart.subscribe((state, previous) => {
    if (state.layers !== previous.layers) warmParquet();
  });

  // One decoded-bytes budget for every trace of the chart.
  const budget = new TraceMemoryBudget();

  const registry = new LayerDriverRegistry<ChartLayerState>(chart, viewer, {
    TraceChartLayer: (layer) =>
      new TileLineDriver<ChartLayerState>(layer, {
        origin: () => chart.getState().timeOrigin,
        rangeApi: range,
        viewerApi: viewer,
        readWindow: (store, ranges, opts) => deps.readWindow(store, ranges, opts),
        budget,
      }),
    SeriesChartLayer: (layer) =>
      new SeriesTableDriver(layer, {
        plotApi: chart,
        rangeApi: range,
        viewerApi: viewer,
        engine: deps.engine,
      }),
  }).start();

  return {
    registry,
    dispose: () => {
      // Followers FIRST: drivers write on their way out (a series withdraws its
      // reported extent), and that must not reach the range store.
      unfollow();
      unsubscribeWarm();
      registry.dispose();
    },
  };
};
