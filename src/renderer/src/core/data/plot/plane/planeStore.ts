import { createStore } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/core/util/createScopedStore";
import type { LegendEntry, LegendScale } from "./PlaneLegend";
import { clampView, isValidView, padded, type PlaneExtent, type PlaneView } from "./planeView";

/**
 * The state of one plane: the view (live at pointer rate, committed once a
 * gesture settles), the data extent the fit returns to, the canvas size, and the
 * hovered point.
 *
 * The two-plane rule (P17) as in the 1-D range store: gestures write `live`, the
 * camera follows it with a vanilla subscription, and only `committed` -- and the
 * hover, coalesced per frame -- wake React.
 */

const MAX_HISTORY = 50;

/** Where the pointer is, in data space and on the canvas; null off the canvas. */
export type PlaneHover = { x: number; y: number; px: number; py: number } | null;

export type PlaneLayerLegend = { entries: readonly LegendEntry[]; scale: LegendScale | null };

export type PlaneState = {
  live: PlaneView;
  committed: PlaneView;
  /** What a fit shows: the union of every layer's reported extent. */
  extent: PlaneExtent | null;
  /** Each layer's extent, by id; the union is `extent`. */
  extents: Record<string, PlaneExtent>;
  /** True once a person moved the view: a later extent no longer refits it. */
  touched: boolean;
  sizePx: { width: number; height: number };
  hover: PlaneHover;
  /**
   * Member labels of a categorical x axis (the groups of a box plot), by the
   * layer that reported them. Keyed like `extents` and `legends`, so one layer
   * clearing its own (a histogram, a box still loading, an unmount) never wipes
   * another's; the host reads the layer whose axis it draws (`categoriesOf`).
   */
  xCategories: Record<string, readonly string[]>;
  /** What each layer adds to the legend: its groups, and a colour scale. */
  legends: Record<string, PlaneLayerLegend>;
  history: PlaneView[];
  future: PlaneView[];

  setLive: (view: PlaneView) => void;
  commit: () => void;
  /** Jump (committed at once, undoable): a box zoom, a fit. */
  jumpTo: (view: PlaneView) => void;
  reportExtent: (layerId: string, extent: PlaneExtent | null) => void;
  fit: () => void;
  setSize: (size: { width: number; height: number }) => void;
  setHover: (hover: PlaneHover) => void;
  setXCategories: (layerId: string, categories: readonly string[] | null) => void;
  setLegend: (layerId: string, legend: PlaneLayerLegend | null) => void;
  undo: () => void;
  redo: () => void;
};

const DEFAULT_VIEW: PlaneView = { x0: 0, x1: 1, y0: 0, y1: 1 };

const unionOf = (extents: Record<string, PlaneExtent>): PlaneExtent | null => {
  let out: PlaneExtent | null = null;
  for (const e of Object.values(extents)) {
    out = out
      ? { x0: Math.min(out.x0, e.x0), x1: Math.max(out.x1, e.x1), y0: Math.min(out.y0, e.y0), y1: Math.max(out.y1, e.y1) }
      : { ...e };
  }
  return out;
};

const sameView = (a: PlaneView, b: PlaneView) => a.x0 === b.x0 && a.x1 === b.x1 && a.y0 === b.y0 && a.y1 === b.y1;

export const createPlaneStore = (options: { padding?: number } = {}) => {
  const padding = options.padding ?? 0.05;
  return createStore<PlaneState>((set, get) => ({
    live: DEFAULT_VIEW,
    committed: DEFAULT_VIEW,
    extent: null,
    extents: {},
    touched: false,
    sizePx: { width: 1, height: 1 },
    hover: null,
    xCategories: {},
    legends: {},
    history: [],
    future: [],

    setLive: (view) => {
      if (!isValidView(view)) return;
      set({ live: clampView(view, get().extent), touched: true });
    },
    commit: () => {
      const { live, committed, history } = get();
      if (sameView(live, committed)) return;
      set({ committed: live, history: [...history, committed].slice(-MAX_HISTORY), future: [] });
    },
    jumpTo: (view) => {
      if (!isValidView(view)) return;
      const next = clampView(view, get().extent);
      const { committed, history } = get();
      set({ live: next, committed: next, touched: true, history: [...history, committed].slice(-MAX_HISTORY), future: [] });
    },
    reportExtent: (layerId, extent) => {
      const extents = { ...get().extents };
      if (extent) extents[layerId] = extent;
      else delete extents[layerId];
      const union = unionOf(extents);
      const patch: Partial<PlaneState> = { extents, extent: union };
      // Until someone moves it, the view follows the data in.
      if (union && !get().touched) {
        const view = padded(union, padding);
        patch.live = view;
        patch.committed = view;
      }
      set(patch);
    },
    fit: () => {
      const { extent } = get();
      if (!extent) return;
      get().jumpTo(padded(extent, padding));
      set({ touched: false });
    },
    setSize: (size) => {
      const current = get().sizePx;
      if (current.width === size.width && current.height === size.height) return;
      set({ sizePx: size });
    },
    setHover: (hover) => set({ hover }),
    setLegend: (layerId, legend) => {
      const legends = { ...get().legends };
      if (legend) legends[layerId] = legend;
      else if (!(layerId in legends)) return;
      else delete legends[layerId];
      set({ legends });
    },
    setXCategories: (layerId, categories) => {
      const all = get().xCategories;
      const current = all[layerId] ?? null;
      if (current === categories) return;
      if (current && categories && current.length === categories.length && current.every((c, i) => c === categories[i])) return;
      const next = { ...all };
      if (categories) next[layerId] = categories;
      else delete next[layerId];
      set({ xCategories: next });
    },
    undo: () => {
      const { history, future, committed } = get();
      const previous = history[history.length - 1];
      if (!previous) return;
      set({ live: previous, committed: previous, history: history.slice(0, -1), future: [committed, ...future].slice(0, MAX_HISTORY) });
    },
    redo: () => {
      const { history, future, committed } = get();
      const next = future[0];
      if (!next) return;
      set({ live: next, committed: next, history: [...history, committed].slice(-MAX_HISTORY), future: future.slice(1) });
    },
  }));
};

export type PlaneStoreApi = ReturnType<typeof createPlaneStore>;

const hooks = createScopedStoreHooks<PlaneState, PlaneStoreApi>("PlaneStore");
export const PlaneStoreContext = hooks.StoreContext;
export const usePlaneStore = hooks.useScopedStore;
export const usePlaneStoreApi = hooks.useStoreApi;
