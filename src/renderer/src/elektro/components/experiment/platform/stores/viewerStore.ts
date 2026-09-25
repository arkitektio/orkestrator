import { createStore, type StoreApi } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/core/lib/generic/createScopedStore";
import { useStore } from "zustand";
import { createChromeSlice, type ChromeSlice } from "./viewer/chromeSlice";
import { createLayoutSlice, type LayoutSlice } from "./viewer/layoutSlice";
import { createModeSlice, type ModeSlice } from "./viewer/modeSlice";
import { createProbeSlice, type ProbeSlice } from "./viewer/probeSlice";
import { anyLoadingOf, createStatsSlice, type StatsSlice } from "./viewer/statsSlice";
import { createViewportSlice, type ViewportSlice } from "./viewer/viewportSlice";

/**
 * Viewer state that is neither the experiment's content nor the time window.
 *
 * ONE store composed of slices, as mikro's `viewerStore` is: one `set`, one
 * context. The reason is the atomic-write hazard — a tile landing both seeds
 * its layer's clim (layout slice) and updates its stats (stats slice), and those
 * must not arrive on opposite sides of a store boundary.
 *
 * Core slices live in `./viewer/`:
 *  - **layout**   row bands per (layer, channel), row count, layout mode, clims
 *  - **stats**    per-layer readouts: trace pyramid stats, read summaries, labels
 *  - **probe**    the hovered time and what each layer draws there
 *  - **viewport** the canvas' pixel size
 *  - **mode**     what a drag does
 *  - **chrome**   the optional reading aids (value axis, grid) and their spacing
 *
 * FEATURE slices (a trace layer's packed lines, an events layer's marks, …)
 * name feature types, and `platform/` may not import a feature — so they are
 * passed in at composition (`extraSlices`, from the shell) and read through the
 * hooks `makeViewerSliceHooks` builds, exactly as mikro's `BrickSlice` is.
 */

export type * from "./viewer/layoutSlice";
export type * from "./viewer/statsSlice";
export type * from "./viewer/probeSlice";
export type * from "./viewer/viewportSlice";
export type * from "./viewer/modeSlice";
export type * from "./viewer/chromeSlice";
export { bandKey, drawableClim, effectiveClim } from "./viewer/layoutSlice";
export { EMPTY_READOUT } from "./viewer/statsSlice";
export { interactionModeOptions } from "./viewer/modeSlice";
export {
  MAX_GRID_SPACING_PX,
  MIN_GRID_SPACING_PX,
  valueSpacingFor,
} from "./viewer/chromeSlice";

/** Store-level lifecycle, spanning slices. */
export type LifecycleSlice = {
  /**
   * Forget everything the viewer holds for one layer — stats, readout, labels,
   * probe data, clim — in ONE write. The single cleanup a layer driver's
   * `dispose` calls, so no layer kind can leave a stale readout behind.
   * Feature slices clear their own entries (their drivers own them).
   *
   * `keepClim` for a layer that is only HIDDEN: its scale is fixed gain, and
   * showing it again must not re-seed it from whatever window comes first.
   */
  clearLayer: (layerId: string, options?: { keepClim?: boolean }) => void;
};

export type ViewerState = LayoutSlice &
  StatsSlice &
  ProbeSlice &
  ViewportSlice &
  ModeSlice &
  ChromeSlice &
  LifecycleSlice;

/** A feature slice: built with the whole store's `set`/`get`. */
export type ViewerSliceOf<S> = (
  set: StoreApi<ViewerState & S>["setState"],
  get: StoreApi<ViewerState & S>["getState"],
) => S;

/** Erased at the composition point, so one array can hold every feature's slice. */
export type AnyViewerSlice = (...args: never[]) => object;

export const createViewerStore = (extraSlices: readonly AnyViewerSlice[] = []) =>
  createStore<ViewerState>((set, get) => ({
    ...createLayoutSlice(set, get),
    ...createStatsSlice(set, get),
    ...createProbeSlice(set, get),
    ...createViewportSlice(set, get),
    ...createModeSlice(set, get),
    ...createChromeSlice(set),
    clearLayer: (layerId, options = {}) => {
      const state = get();
      const probed = state.probeSources.delete(layerId);
      const stats = { ...state.stats };
      const readouts = { ...state.readouts };
      const markLabels = { ...state.markLabels };
      const clims = { ...state.clims };
      const droppedClim = !options.keepClim && clims[layerId] !== undefined;
      delete stats[layerId];
      delete readouts[layerId];
      delete markLabels[layerId];
      if (!options.keepClim) delete clims[layerId];
      set({
        stats,
        readouts,
        markLabels,
        clims,
        climVersion: state.climVersion + (droppedClim ? 1 : 0),
        statsVersion: state.statsVersion + 1,
        labelsVersion: state.labelsVersion + 1,
        probeVersion: state.probeVersion + (probed ? 1 : 0),
        anyLoading: anyLoadingOf({ stats, readouts }),
      });
    },
    ...Object.assign({}, ...extraSlices.map((slice) => slice(set as never, get as never))),
  }));

export type ViewerStoreApi = ReturnType<typeof createViewerStore>;

const hooks = createScopedStoreHooks<ViewerState, ViewerStoreApi>("ExperimentViewerStore");
export const ViewerStoreContext = hooks.StoreContext;
export const useViewerStore = hooks.useScopedStore;
export const useViewerStoreApi = hooks.useStoreApi;

/**
 * Typed hooks over ONE feature slice of the viewer store — mikro's
 * `makeViewerSliceHooks`. Same store, same context; the hook's name is what
 * tells the reader which module owns the field.
 */
export const makeViewerSliceHooks = <S extends object>() => {
  const useSliceStoreApi = () => useViewerStoreApi() as unknown as StoreApi<ViewerState & S>;
  const useSliceStore = <T,>(selector: (state: ViewerState & S) => T): T =>
    useStore(useSliceStoreApi(), selector);
  return { useSliceStore, useSliceStoreApi };
};
