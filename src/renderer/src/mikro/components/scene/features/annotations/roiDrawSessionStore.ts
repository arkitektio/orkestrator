import { createStore } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";

/**
 * RENDER-PLANE state for the drawing gesture in flight. Written at pointer
 * cadence, up to once per frame (P17).
 *
 * NOTHING may read these fields through `useRoiDrawSessionStore(selector)` — a
 * React subscription here would re-render on every pointer move, which is the
 * whole cost this work exists to remove. The sanctioned readers are
 * `useRoiDrawSessionStoreApi().subscribe(...)` and `.getState()`.
 *
 * This is a store rather than a ref for exactly one reason: the size readout is
 * HTML and lives *outside* the Canvas, so the drawer cannot reach it with a ref.
 * Everything else about a gesture stays in a ref inside the drawer.
 */
export interface RoiDrawReadout {
  label: string;
  /** Canvas-relative CSS pixels — straight from the pointer event's offset. */
  x: number;
  y: number;
}

export interface RoiDrawSessionState {
  /** null when no gesture is in flight. */
  readout: RoiDrawReadout | null;
  setReadout: (readout: RoiDrawReadout | null) => void;
}

export const createRoiDrawSessionStore = () =>
  createStore<RoiDrawSessionState>()((set) => ({
    readout: null,
    setReadout: (readout) => set({ readout }),
  }));

const {
  StoreContext: RoiDrawSessionStoreContext,
  useScopedStore: useRoiDrawSessionStore,
  useStoreApi: useRoiDrawSessionStoreApi,
} = createScopedStoreHooks<RoiDrawSessionState>("RoiDrawSessionStore");

export {
  RoiDrawSessionStoreContext,
  useRoiDrawSessionStore,
  useRoiDrawSessionStoreApi,
};
