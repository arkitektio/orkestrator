import { makeViewerSliceHooks, type ViewerSliceOf } from "../../platform/stores/viewerStore";
import type { LayerRunSnapshot } from "./layerRunSnapshot";

/**
 * Where the float attaches: the world point under the right-click, so it
 * follows the camera like a shape's card — or, when the click ray met no plane
 * to put one on, the click's canvas pixel.
 */
export type LayerRunAnchor =
  | { kind: "world"; point: [number, number, number] }
  | { kind: "screen"; point: { x: number; y: number } };

/** A right-click on the image: what was on screen, and where the float opens. */
export type LayerRunMenuRequest = {
  /** The layer it starts on (the float's "Run on" picker can change it). */
  layerId: string;
  /**
   * The view at the click, SNAPSHOT: scrubbing z or t while the float is open
   * does not move what it runs on, and the picker cuts another layer at the
   * same place and frame.
   */
  snapshot: LayerRunSnapshot;
  anchor: LayerRunAnchor;
  /** Bumped per click, so a second right-click reopens the float fresh. */
  serial: number;
};

/**
 * The layer float's slice of the viewer store: the canvas (`SceneContextMenu`)
 * opens it, the DOM overlay (`LayerRunFloat`) draws it. Click cadence.
 */
export interface LayerRunSlice {
  layerRunMenu: LayerRunMenuRequest | null;
  openLayerRunMenu: (request: Omit<LayerRunMenuRequest, "serial">) => void;
  closeLayerRunMenu: () => void;
}

export const createLayerRunSlice: ViewerSliceOf<LayerRunSlice> = (set) => ({
  layerRunMenu: null,
  openLayerRunMenu: (request) =>
    set((state) => ({
      layerRunMenu: { ...request, serial: (state.layerRunMenu?.serial ?? 0) + 1 },
    })),
  closeLayerRunMenu: () => set({ layerRunMenu: null }),
});

export const { useSlice: useLayerRunStore, useSliceApi: useLayerRunStoreApi } =
  makeViewerSliceHooks<LayerRunSlice>();
