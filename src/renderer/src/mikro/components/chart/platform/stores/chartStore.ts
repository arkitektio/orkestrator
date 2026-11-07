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
import type { ChartLayoutValue } from "../model/chartStructure";
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

export type ChartAxis = { name: string; unit: string | null; type: string | null };

type ChartExtra = {
  chartId: string;
  /**
   * The one measured axis along-axis layers (traces, series, marks) are laid
   * along: what every position there is measured along, and in. Null when the
   * world is not one measured axis — then there is no axis plot, only value panels.
   */
  axis: ChartAxis | null;
  worldId: string | null;
  /**
   * The chart's layout as the SERVER last said it — not the mode on screen,
   * which is the viewer's `layoutMode`. `ChartLayoutSync` applies it when it
   * changes, and only then, so a refetch never undoes a toggle in flight.
   */
  layout: ChartLayoutValue;
  /**
   * The row a click pinned on a chart of values — what the Probe tab follows
   * (`rowPlan`). Session-only; set with `setState`, read per field.
   */
  pinnedRow: PinnedRow | null;
};

/** A pinned point: which layer drew it, which row of which table it is, and where it sits. */
export type PinnedRow = {
  layerId: string;
  /** The table's id (what `rowPlan` is asked for). */
  table: string;
  /** The row's INDEX value. */
  id: number | bigint | string;
  label: string;
  color: string;
  at: { x: number; y: number } | null;
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
