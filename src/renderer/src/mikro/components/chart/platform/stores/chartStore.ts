import {
  createPlotStore,
  plotStoreHooks,
  type PlotStoreState,
  type Span,
} from "@/core/data/plot/stores/plotStore";
import type {
  ChartAnnotationLayerFragment,
  ChartDistributionLayerFragment,
  ChartPointsLayerFragment,
  ChartSeriesLayerFragment,
  ChartTraceLayerFragment,
} from "@/mikro/api/graphql";
import { withPersisted, type ChartLayerState, type PersistedChartLayer } from "../model/chartLayerModel";
import { finestPeriodOf } from "../model/foldChart";

/**
 * The chart as its renderer sees it: its axis, its normalized layers, and the
 * origin the GPU works relative to.
 *
 * The plot engine's store (`@/core/data/plot/stores/plotStore` — the two layer
 * lists, the optimistic overlay, the extents) instantiated for the chart's
 * layer model, plus what only a chart has: its id and the one axis it is laid
 * out along.
 */

export type ChartLayerFragment =
  | ChartTraceLayerFragment
  | ChartSeriesLayerFragment
  | ChartAnnotationLayerFragment
  | ChartPointsLayerFragment
  | ChartDistributionLayerFragment;

/** AXIS: laid along its world's one axis. VALUES: draws its world's rows at the values of their columns. */
export type ChartKindValue = "AXIS" | "VALUES";

export type ChartAxis = { name: string; unit: string | null; type: string | null };

type ChartExtra = {
  chartId: string;
  kind: ChartKindValue;
  /** An AXIS chart's one axis: what every position is measured along, and in. Null for VALUES. */
  axis: ChartAxis | null;
  worldId: string | null;
};

export type ChartStoreState = PlotStoreState<ChartLayerState, PersistedChartLayer, ChartLayerFragment> &
  ChartExtra;

export const createChartStore = (
  initial: ChartExtra & {
    layers: ChartLayerState[];
    rawLayers: Record<string, ChartLayerFragment>;
    timeOrigin: number;
    worldSpan: Span | null;
  },
) =>
  createPlotStore<ChartLayerState, PersistedChartLayer, ChartLayerFragment, ChartExtra>(initial, {
    withPersisted,
    finestPeriodOf,
  });

export type ChartStoreApi = ReturnType<typeof createChartStore>;

// The engine's ONE plot-store context, typed as a chart's.
const hooks = plotStoreHooks<ChartStoreState>();
export const useChartStore = hooks.useScopedStore;
export const useChartStoreApi = hooks.useStoreApi;

/** One layer's normalized state, by id — O(1), stable until a fold or an edit touches it. */
export const useChartLayer = (layerId: string): ChartLayerState | undefined =>
  useChartStore((s) => s.layerIndex.get(layerId));

/** One layer's raw fragment, narrowed to its kind (undefined for another kind). */
export const useRawChartLayer = <T extends NonNullable<ChartLayerFragment["__typename"]>>(
  layerId: string,
  typename: T,
): Extract<ChartLayerFragment, { __typename?: T }> | undefined =>
  useChartStore((s) => {
    const raw = s.rawLayers[layerId];
    return raw?.__typename === typename
      ? (raw as Extract<ChartLayerFragment, { __typename?: T }>)
      : undefined;
  });
