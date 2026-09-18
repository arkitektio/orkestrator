import type { StoreApi } from "zustand/vanilla";
import { LayerDriverRegistry } from "../platform/drivers/layerDriver";
import type { ExperimentStoreState } from "../platform/stores/experimentStore";
import type { RangeState } from "../platform/stores/rangeStore";
import type { ViewerState } from "../platform/stores/viewerStore";
import type { ParquetQueryEngine } from "@/lib/parquet/parquetEngine";
import { AnnotationMarksIndexer } from "../features/annotations/AnnotationMarksIndexer";
import type { AnnotationSlice } from "../features/annotations/store/annotationSlice";
import { EventTableDriver } from "../features/events/EventTableDriver";
import type { EventsSlice } from "../features/events/store/eventsSlice";
import { SpikeRasterDriver, type SparseReader } from "../features/spikes/SpikeRasterDriver";
import type { SpikesSlice } from "../features/spikes/store/spikesSlice";
import { TraceTileDriver, type ReadWindow } from "../features/traces/TraceTileDriver";
import type { TraceSlice } from "../features/traces/store/traceSlice";
import type { PickerSlice } from "../platform/pickers/pickerSlice";
import { TraceMemoryBudget } from "../platform/quality/traceBudget";
import { PickerValuesService, type TableMeta } from "../platform/pickers/pickerValuesService";

/** How many finest-level samples the narrowest window must still show. */
export const MIN_VISIBLE_SAMPLES = 8;

export type ExperimentScopeStores = {
  experiment: StoreApi<ExperimentStoreState>;
  range: StoreApi<RangeState>;
  viewer: StoreApi<ViewerState>;
};

/**
 * What the drivers need from outside the stores. Read through GETTERS, so a
 * dependency arriving late (the parquet engine, a client) reaches the drivers
 * without rebuilding them — a rebuild would refetch every tile.
 */
export type ExperimentDeps = {
  readonly readWindow: ReadWindow;
  readonly engine: () => ParquetQueryEngine | null;
  readonly sparse: () => SparseReader | null;
  readonly fetchTable: (id: string) => Promise<TableMeta | null>;
};

export type ExperimentSystem = {
  registry: LayerDriverRegistry;
  dispose: () => void;
};

/**
 * Build and start the experiment's render-plane system — mikro's
 * `createBrickSystem`, over time. The ONE construction site: every driver
 * factory, and every cross-store subscription the scope needs, is wired here
 * and torn down by `dispose`.
 */
export const createExperimentSystem = (
  stores: ExperimentScopeStores,
  deps: ExperimentDeps,
): ExperimentSystem => {
  const { experiment, range } = stores;
  const viewer = stores.viewer as StoreApi<
    ViewerState & TraceSlice & EventsSlice & SpikesSlice & PickerSlice & AnnotationSlice
  >;

  // One picker service per scope: every driver, card and editor shares its caches.
  const pickers = new PickerValuesService({ engine: deps.engine, fetchTable: deps.fetchTable });
  viewer.getState().setPickerService(pickers);
  // Every annotation layer's marks, once per fold — drawn or not (cards and the
  // panel read hidden layers' marks too).
  const annotations = new AnnotationMarksIndexer(experiment, viewer);

  // The range follows the experiment's extent, whoever moves it: a fold (a layer
  // arriving) or a layer reporting what it read (an event table).
  const unsubscribeWorld = experiment.subscribe((state, previous) => {
    if (state.worldSpan === previous.worldSpan) return;
    range.getState().setWorld(state.worldSpan, state.finestPeriod * MIN_VISIBLE_SAMPLES);
  });

  // DuckDB-WASM's cold start (~1 s) is paid up front, in parallel with the zarr
  // reads, as soon as the scene has a layer that will read parquet — not by the
  // first events or unit-table read.
  let warmed = false;
  const warmParquet = () => {
    if (warmed) return;
    const needsParquet = experiment
      .getState()
      .layers.some((l) => l.kind === "events" || (l.kind === "spikes" && l.raster?.rowOrderColumn != null));
    const engine = deps.engine();
    if (!needsParquet || !engine) return;
    warmed = true;
    engine.warmUp();
  };
  warmParquet();
  const unsubscribeWarm = experiment.subscribe((state, previous) => {
    if (state.layers !== previous.layers) warmParquet();
  });

  // One decoded-bytes budget for every trace layer of the scope.
  const traceBudget = new TraceMemoryBudget();

  const registry = new LayerDriverRegistry(experiment, viewer, {
    TraceLayer: (layer) =>
      new TraceTileDriver(layer, {
        experimentApi: experiment,
        rangeApi: range,
        viewerApi: viewer,
        readWindow: (store, ranges, opts) => deps.readWindow(store, ranges, opts),
        budget: traceBudget,
      }),
    EventsLayer: (layer) =>
      new EventTableDriver(layer, {
        experimentApi: experiment,
        rangeApi: range,
        viewerApi: viewer,
        engine: deps.engine,
        pickers: () => pickers,
      }),
    SpikesLayer: (layer) =>
      new SpikeRasterDriver(layer, {
        experimentApi: experiment,
        rangeApi: range,
        viewerApi: viewer,
        sparse: deps.sparse,
        engine: deps.engine,
        pickers: () => pickers,
      }),
  }).start();

  return {
    registry,
    dispose: () => {
      // Followers FIRST. Drivers write on their way out (an event table withdraws
      // its reported span), and a teardown write that still reached the range
      // store would move the committed window — which `TimeRangeUrlSync` turns
      // into a navigation back to this experiment, i.e. leaving the page reloads it.
      unsubscribeWorld();
      unsubscribeWarm();
      registry.dispose();
      annotations.dispose();
      viewer.getState().setPickerService(null);
      pickers.dispose();
    },
  };
};
