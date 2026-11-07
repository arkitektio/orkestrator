import { createStore } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/core/util/createScopedStore";

/** What a grid layer's read reports, for its card: progress, failure, and the value range found. */
export type GridReadout = { loading: boolean; error: string | null; note: string | null; lo: number | null; hi: number | null };

const EMPTY: GridReadout = { loading: false, error: null, note: null, lo: null, hi: null };

export type GridStoreState = {
  readouts: Record<string, GridReadout>;
  patch: (layerId: string, patch: Partial<GridReadout>) => void;
  drop: (layerId: string) => void;
};

/**
 * A grid's client state beside what the server holds: each layer's readout.
 * The layers themselves are the query's (Apollo's normalized cache), and an edit
 * is a mutation whose answer updates that cache -- a grid has no optimistic
 * overlay to keep.
 */
export const createGridStore = () =>
  createStore<GridStoreState>((set) => ({
    readouts: {},
    patch: (layerId, patch) =>
      set((state) => ({ readouts: { ...state.readouts, [layerId]: { ...(state.readouts[layerId] ?? EMPTY), ...patch } } })),
    drop: (layerId) =>
      set((state) => {
        if (!(layerId in state.readouts)) return state;
        const readouts = { ...state.readouts };
        delete readouts[layerId];
        return { readouts };
      }),
  }));

export type GridStoreApi = ReturnType<typeof createGridStore>;
const hooks = createScopedStoreHooks<GridStoreState, GridStoreApi>("GridStore");
export const GridStoreContext = hooks.StoreContext;
export const useGridStore = hooks.useScopedStore;
export const useGridStoreApi = hooks.useStoreApi;
