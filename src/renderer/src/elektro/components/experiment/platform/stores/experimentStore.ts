import {
  createPlotStore,
  plotStoreHooks,
  type PlotStoreState,
} from "@/core/data/plot/stores/plotStore";
import type { CoordinateSystemLike } from "../coords/timeAxis";
import { withPersisted, type LayerState, type PersistedLayer } from "../model/layerModel";
import { rawLayerOf, type ExperimentLayerFragment, type LayerFragments } from "./layerFragments";

/**
 * The experiment as the renderer sees it: its world, its normalized layers, and
 * the origin the GPU works relative to.
 *
 * The plot engine's store (`@/core/data/plot/stores/plotStore` — the two layer
 * lists, the optimistic overlay, the extents) instantiated for elektro's layer
 * model, plus what only an experiment has: its id, its world, and whether marks
 * can be drawn on it.
 */

type ExperimentExtra = {
  experimentId: string;
  world: CoordinateSystemLike | null;
  /** Whether marks can be drawn on this scene (only a real experiment can be). */
  annotatable: boolean;
};

export type ExperimentStoreState = PlotStoreState<
  LayerState,
  PersistedLayer,
  ExperimentLayerFragment
> &
  ExperimentExtra;

const finestPeriodOf = (layers: readonly LayerState[]): number => {
  let finest = Infinity;
  for (const layer of layers) {
    const p = layer.source?.levels[0]?.period;
    if (p && Math.abs(p) < finest) finest = Math.abs(p);
  }
  return Number.isFinite(finest) ? finest : 0;
};

export const createExperimentStore = (initial: {
  experimentId: string;
  world: CoordinateSystemLike | null;
  annotatable: boolean;
  layers: LayerState[];
  rawLayers: Record<string, ExperimentLayerFragment>;
  timeOrigin: number;
  worldSpan: { start: number; end: number } | null;
}) =>
  createPlotStore<LayerState, PersistedLayer, ExperimentLayerFragment, ExperimentExtra>(initial, {
    withPersisted,
    finestPeriodOf,
  });

export type ExperimentStoreApi = ReturnType<typeof createExperimentStore>;

// The engine's ONE plot-store context, typed as an experiment's.
const hooks = plotStoreHooks<ExperimentStoreState>();
export const ExperimentStoreContext = hooks.StoreContext;
export const useExperimentStore = hooks.useScopedStore;
export const useExperimentStoreApi = hooks.useStoreApi;

/** One layer's normalized state, by id — O(1), stable until a fold or an edit touches it. */
export const useLayerState = (layerId: string): LayerState | undefined =>
  useExperimentStore((s) => s.layerIndex.get(layerId));

/** One layer's raw fragment, narrowed to its kind (undefined for another kind). */
export const useRawLayer = <K extends keyof LayerFragments>(
  layerId: string,
  typename: K,
): LayerFragments[K] | undefined => useExperimentStore((s) => rawLayerOf(s.rawLayers, layerId, typename));

export type { ExperimentLayerFragment, LayerFragments } from "./layerFragments";
export { drawnLayersKey, isLayerHidden } from "@/core/data/plot/stores/plotStore";
