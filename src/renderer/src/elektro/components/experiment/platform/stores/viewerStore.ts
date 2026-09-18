import { createStore } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";

/**
 * Viewer state that is neither the experiment's content nor the time window.
 *
 * ONE store composed of slices, as mikro's `viewerStore` is (its Phase-3
 * conclusion, pinned there by `viewerStoreComposition.test.ts`): one `set`, one
 * context. The reason is the same atomic-write hazard — a tile landing both seeds
 * its layer's clim (layout slice) and updates its stats (stats slice), and those
 * must not arrive on opposite sides of a store boundary.
 *
 * Slices:
 *  - **layout**  row bands per (layer, channel), row count, layout mode, clims
 *  - **stats**   per-layer pyramid readout: level, residency, coverage, value range
 *  - **probe**   the hovered time
 *  - **viewport** the canvas' pixel size
 */

export type LayoutMode = "STACKED" | "SHARED";

/** The value range a row maps to its full height. */
export type Clim = { lo: number; hi: number };

/**
 * Where one channel of one view is drawn: a band of world y, and whose clims map
 * values into it.
 *
 * `climIds` is one view in STACKED mode and the whole group in SHARED mode, where
 * views of the same physical dimension overlay on one axis and must therefore share
 * one scale — otherwise two traces in the same row would each be stretched to
 * fill it and their amplitudes would be incomparable, which is the one thing
 * overlaying them was for.
 */
export type Band = { bottom: number; top: number; climIds: string[] };

export type RowInfo = {
  /** Row index, 0 at the top. */
  index: number;
  label: string;
  unit: string | null;
  color: string;
  layerIds: string[];
  /** Per sub-band label (STACKED, multi-channel): what each channel is called. */
  channelLabels?: (string | null)[];
};

export type TraceStats = {
  /** Index into the view's levels of the finest level being drawn. */
  levelIndex: number;
  /** The `DataArray.level` of it. */
  level: number;
  levelCount: number;
  /**
   * Level index DRAWN at the centre of the window — the served level, which lags
   * the target while finer tiles are still in flight. Null before anything lands.
   */
  centerLevelIndex: number | null;
  /** The level the plan is refining towards (0 = finest). */
  targetLevelIndex: number;
  /** Finest samples per drawn sample at the centre (1 = full resolution). */
  centerFactor: number | null;
  tilesPlanned: number;
  tilesResident: number;
  /** Fraction of the visible window covered by resident data. */
  coverage: number;
  residentBytes: number;
  valueMin: number | null;
  valueMax: number | null;
  loading: boolean;
  error: string | null;
};

export const bandKey = (layerId: string, channel: number): string => `${layerId}:${channel}`;

// --- slices ---------------------------------------------------------------------

export type LayoutSlice = {
  layoutMode: LayoutMode;
  rowCount: number;
  rows: RowInfo[];
  bands: Record<string, Band>;
  /** Held fixed once seeded — fixed gain; change only on autoscale or an edit. */
  clims: Record<string, Clim>;
  setLayoutMode: (mode: LayoutMode) => void;
  setLayout: (layout: { rowCount: number; rows: RowInfo[]; bands: Record<string, Band> }) => void;
  /** Seed a layer's clim from its first data. A no-op once one is set. */
  seedClim: (layerId: string, clim: Clim) => void;
  setClim: (layerId: string, clim: Clim) => void;
  /**
   * Rescale a layer (or every layer) to the range currently resident. Returns
   * the clims it set, so a caller can persist them.
   */
  autoscale: (layerId?: string) => Record<string, Clim>;
};

/**
 * What a non-trace layer (spikes, events) reports about its last read: how many
 * marks it drew of how many there are, whether it fell back to a density view,
 * and what went wrong. The card's diagnostic line.
 */
export type LayerReadout = {
  /** Marks drawn (in the window, or in total for a whole-table read). */
  count: number | null;
  /** Marks that exist, when known. */
  total: number | null;
  /** A read limit cut the window short. */
  truncated: boolean;
  /** Drawn as a density strip / rate histogram rather than marks. */
  density: boolean;
  loading: boolean;
  error: string | null;
  /** Anything else worth one line on the card ("12 units", "3 lanes"). */
  note: string | null;
};

export const EMPTY_READOUT: LayerReadout = {
  count: null,
  total: null,
  truncated: false,
  density: false,
  loading: false,
  error: null,
  note: null,
};

/** A label to draw over the canvas at a world time, in a layer's row. */
export type MarkLabel = { time: number; text: string; lane: number; laneCount: number };

export type StatsSlice = {
  stats: Record<string, TraceStats>;
  setStats: (layerId: string, stats: TraceStats) => void;
  clearStats: (layerId: string) => void;
  readouts: Record<string, LayerReadout>;
  setReadout: (layerId: string, readout: LayerReadout) => void;
  /** Merge into a layer's readout (starting from `EMPTY_READOUT`). */
  patchReadout: (layerId: string, patch: Partial<LayerReadout>) => void;
  /** Per layer, the labels worth drawing now (only when there is room for them). */
  markLabels: Record<string, MarkLabel[]>;
  setMarkLabels: (layerId: string, labels: MarkLabel[] | null) => void;
};

/** What a trace layer has drawn, for the probe to read back. */
export type ProbeChannel = {
  /** time − timeOrigin, ascending. */
  xs: ArrayLike<number>;
  ys: ArrayLike<number>;
};

export type ProbeSlice = {
  /** World time under the pointer, or null. Coalesced to one write per frame. */
  hoverTime: number | null;
  setHoverTime: (time: number | null) => void;
  /**
   * Per view, the channels its layer currently draws. A plain Map MUTATED IN PLACE
   * and never `set`: it changes whenever tiles land, and nothing should re-render
   * for that. The readout reads it on demand when the hovered time moves.
   */
  probeSources: Map<string, ProbeChannel[]>;
};

export type ViewportSlice = {
  viewportPx: { width: number; height: number };
  setViewportPx: (size: { width: number; height: number }) => void;
};

/**
 * What a drag on the canvas does — the timeline's counterpart of mikro's scene
 * modes, with the same iconography (Hand / SquarePen) and the same hold-A key.
 *
 *  - EXPLORE: drag a box to zoom into that stretch of time (undoable, ⌘Z steps
 *    back out); shift- or middle-drag pans; the wheel zooms at the cursor.
 *  - ANNOTATE: click drops an event, drag spans an epoch. Offered only where there
 *    is an experiment to draw on.
 */
export type InteractionMode = "EXPLORE" | "ANNOTATE";

export type InteractionModeOption = {
  value: InteractionMode;
  label: string;
  description: string;
};

/** Labels and help text, in one place — the buttons and the shortcut sheet read these. */
export const interactionModeOptions: InteractionModeOption[] = [
  {
    value: "EXPLORE",
    label: "Explore",
    description: "Drag a box to zoom into it; shift-drag pans; scroll zooms at the cursor",
  },
  {
    value: "ANNOTATE",
    label: "Annotate",
    description: "Click to mark an event, drag to mark an epoch (hold A)",
  },
];

/**
 * The rubber band of an EXPLORE drag, in world time, while it is being drawn.
 * Written at pointer rate — read imperatively by its overlay, never by a render.
 */
export type ZoomBox = { from: number; to: number } | null;

export type ModeSlice = {
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
  zoomBox: ZoomBox;
  setZoomBox: (box: ZoomBox) => void;
};

export type ViewerState = LayoutSlice &
  StatsSlice &
  ProbeSlice &
  ViewportSlice &
  ModeSlice;

/**
 * A clim that can actually be drawn. A flat trace (lo === hi) would divide by zero
 * in the row map; pad it so a constant line sits in the middle of its row.
 */
export const drawableClim = (clim: Clim): Clim => {
  if (clim.hi > clim.lo) return clim;
  const pad = Math.max(Math.abs(clim.lo) * 0.05, 1e-6);
  return { lo: clim.lo - pad, hi: clim.hi + pad };
};

/** Replace a record entry only if it changed, so unchanged keys keep identity. */
const sameBand = (a: Band | undefined, b: Band): boolean =>
  a !== undefined &&
  a.bottom === b.bottom &&
  a.top === b.top &&
  a.climIds.length === b.climIds.length &&
  a.climIds.every((id, i) => id === b.climIds[i]);

/**
 * The effective value range for a band: the union of the clims it names. Null when
 * none of them has been seeded yet — the layer then draws nothing rather than
 * guessing a scale that would snap on the first real data.
 */
export const effectiveClim = (
  clims: Record<string, Clim>,
  band: Pick<Band, "climIds">,
): Clim | null => {
  let lo = Infinity;
  let hi = -Infinity;
  for (const id of band.climIds) {
    const c = clims[id];
    if (!c) continue;
    if (c.lo < lo) lo = c.lo;
    if (c.hi > hi) hi = c.hi;
  }
  return lo <= hi ? drawableClim({ lo, hi }) : null;
};

export const createViewerStore = () =>
  createStore<ViewerState>((set, get) => ({
    // layout
    layoutMode: "STACKED",
    rowCount: 0,
    rows: [],
    bands: {},
    clims: {},
    setLayoutMode: (layoutMode) => set({ layoutMode }),
    setLayout: ({ rowCount, rows, bands }) => {
      // Keep the identity of every band that did not move. Trace layers bind to
      // their band imperatively; a relayout that re-allocated all of them would
      // make every layer rewrite its matrix and request a frame for nothing.
      const previous = get().bands;
      const merged: Record<string, Band> = {};
      for (const [key, band] of Object.entries(bands)) {
        merged[key] = sameBand(previous[key], band) ? previous[key] : band;
      }
      set({ rowCount, rows, bands: merged });
    },
    seedClim: (layerId, clim) => {
      if (get().clims[layerId]) return;
      set((state) => ({ clims: { ...state.clims, [layerId]: drawableClim(clim) } }));
    },
    setClim: (layerId, clim) =>
      set((state) => ({ clims: { ...state.clims, [layerId]: drawableClim(clim) } })),
    autoscale: (layerId) => {
      const { stats, clims } = get();
      const next = { ...clims };
      const changed: Record<string, Clim> = {};
      const ids = layerId ? [layerId] : Object.keys(stats);
      for (const id of ids) {
        const s = stats[id];
        if (!s || s.valueMin == null || s.valueMax == null) continue;
        next[id] = changed[id] = drawableClim({ lo: s.valueMin, hi: s.valueMax });
      }
      set({ clims: next });
      return changed;
    },

    // stats
    stats: {},
    setStats: (layerId, stats) =>
      set((state) => ({ stats: { ...state.stats, [layerId]: stats } })),
    clearStats: (layerId) =>
      set((state) => {
        const stats = { ...state.stats };
        const readouts = { ...state.readouts };
        const markLabels = { ...state.markLabels };
        delete stats[layerId];
        delete readouts[layerId];
        delete markLabels[layerId];
        return { stats, readouts, markLabels };
      }),
    readouts: {},
    setReadout: (layerId, readout) =>
      set((state) => ({ readouts: { ...state.readouts, [layerId]: readout } })),
    patchReadout: (layerId, patch) =>
      set((state) => ({
        readouts: {
          ...state.readouts,
          [layerId]: { ...(state.readouts[layerId] ?? EMPTY_READOUT), ...patch },
        },
      })),
    markLabels: {},
    setMarkLabels: (layerId, labels) =>
      set((state) => {
        if (!labels && !state.markLabels[layerId]) return state;
        const next = { ...state.markLabels };
        if (labels) next[layerId] = labels;
        else delete next[layerId];
        return { markLabels: next };
      }),

    // probe
    probeSources: new Map(),
    hoverTime: null,
    setHoverTime: (hoverTime) => {
      if (get().hoverTime === hoverTime) return;
      set({ hoverTime });
    },

    // mode
    interactionMode: "EXPLORE",
    setInteractionMode: (interactionMode) => {
      if (get().interactionMode === interactionMode) return;
      // A half-drawn zoom box belongs to the mode it was started in.
      set({ interactionMode, zoomBox: null });
    },
    zoomBox: null,
    setZoomBox: (zoomBox) => set({ zoomBox }),

    // viewport
    viewportPx: { width: 0, height: 0 },
    setViewportPx: (size) => {
      const current = get().viewportPx;
      if (current.width === size.width && current.height === size.height) return;
      set({ viewportPx: size });
    },
  }));

export type ViewerStoreApi = ReturnType<typeof createViewerStore>;

const hooks = createScopedStoreHooks<ViewerState, ViewerStoreApi>("ExperimentViewerStore");
export const ViewerStoreContext = hooks.StoreContext;
export const useViewerStore = hooks.useScopedStore;
export const useViewerStoreApi = hooks.useStoreApi;
