import type { ViewerGet, ViewerSet } from "./sliceTypes";
import type { TraceStats } from "./layoutSlice";

/**
 * Per-layer readouts: the trace pyramid stats, the non-trace layers' read
 * summaries, and the labels a layer wants drawn. Written by the layer drivers;
 * cleared in one place (`clearLayer`, on the store).
 */

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
  /**
   * Bumped on every `setStats`: a SCALAR to subscribe to (P17) for readers that
   * summarize all layers' stats — they read the record through `getState()`.
   */
  statsVersion: number;
  /** Any layer is still reading: its trace tiles or its readout say so. */
  anyLoading: boolean;
  setStats: (layerId: string, stats: TraceStats) => void;
  readouts: Record<string, LayerReadout>;
  setReadout: (layerId: string, readout: LayerReadout) => void;
  /** Merge into a layer's readout (starting from `EMPTY_READOUT`). */
  patchReadout: (layerId: string, patch: Partial<LayerReadout>) => void;
  /** Per layer, the labels worth drawing now (only when there is room for them). */
  markLabels: Record<string, MarkLabel[]>;
  /** Bumped when any layer's labels change — the overlay's scalar trigger. */
  labelsVersion: number;
  setMarkLabels: (layerId: string, labels: MarkLabel[] | null) => void;
};


const anyLoadingOf = (state: Pick<StatsSlice, "stats" | "readouts">): boolean =>
  Object.values(state.stats).some((s) => s.loading) ||
  Object.values(state.readouts).some((r) => r.loading);

export const createStatsSlice = (set: ViewerSet, _get: ViewerGet): StatsSlice => ({
  stats: {},
  statsVersion: 0,
  anyLoading: false,
  setStats: (layerId, stats) =>
    set((state) => {
      const next = { ...state.stats, [layerId]: stats };
      return {
        stats: next,
        statsVersion: state.statsVersion + 1,
        anyLoading: anyLoadingOf({ stats: next, readouts: state.readouts }),
      };
    }),
  readouts: {},
  setReadout: (layerId, readout) =>
    set((state) => {
      const readouts = { ...state.readouts, [layerId]: readout };
      return { readouts, anyLoading: anyLoadingOf({ stats: state.stats, readouts }) };
    }),
  patchReadout: (layerId, patch) =>
    set((state) => {
      const readouts = {
        ...state.readouts,
        [layerId]: { ...(state.readouts[layerId] ?? EMPTY_READOUT), ...patch },
      };
      return { readouts, anyLoading: anyLoadingOf({ stats: state.stats, readouts }) };
    }),
  markLabels: {},
  labelsVersion: 0,
  setMarkLabels: (layerId, labels) =>
    set((state) => {
      if (!labels && !state.markLabels[layerId]) return state;
      const next = { ...state.markLabels };
      if (labels) next[layerId] = labels;
      else delete next[layerId];
      return { markLabels: next, labelsVersion: state.labelsVersion + 1 };
    }),
});

export { anyLoadingOf };
