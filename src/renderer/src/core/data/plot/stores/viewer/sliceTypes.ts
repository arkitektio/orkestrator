import type { StoreApi } from "zustand/vanilla";
import type { ViewerState } from "../viewerStore";

/**
 * How a slice of the viewer store is written: `set`/`get` of the WHOLE store,
 * so a slice may read (and atomically write) its siblings — one store, one
 * `set`, as in mikro's `platform/stores/viewer/`.
 */
export type ViewerSet = StoreApi<ViewerState>["setState"];
export type ViewerGet = StoreApi<ViewerState>["getState"];
