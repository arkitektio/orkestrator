import type { SliceGet, SliceSet } from "./sliceTypes";
import { fitCameraToObject } from "@/core/lib/scene/camera/cameraFit";
import * as THREE from "three";
import type { CanvasContext, LayerViewRange, TrackableObject, ViewSnapshot } from "../viewerStore";
/**
 * The camera-derived view: what is trackable, what is visible, the ranges
 * and the snapshot they were computed from, and the canvas handle.
 */
export interface ViewSlice {
  // We store the actual refs to perform math on them in the loop
  trackables: Set<TrackableObject>

  register: (ref: TrackableObject) => void
  unregister: (ref: TrackableObject) => void
  // We store strings (names/IDs) for the React UI to consume
  visibleLayers: string[]
  setVisible: (visibleSet: Set<string>) => void
  // Visible image-coordinate ranges per layer
  layerViewRanges: Record<string, LayerViewRange>
  /** See `ViewSnapshot`: the view the ranges above were computed from. Null
   * until the first visibility recompute. */
  viewSnapshot: ViewSnapshot | null
  /** `snapshot` is optional so range-only callers (tests, tools) keep
   * working; `visibilityTracker` — the production writer — always passes it,
   * in the same atomic write as the ranges. */
  setLayerViewRanges: (
    ranges: Record<string, LayerViewRange>,
    snapshot?: ViewSnapshot,
  ) => void
  frustumNear: number;
  frustumFar: number;
  canvas: CanvasContext | null;
  registerCanvas: (ctx: CanvasContext) => void;
  /**
   * Renders the current scene to an offscreen target and returns a PNG Blob.
   * Null until an in-Canvas component (SceneScreenshot) registers it; the
   * registered fn resolves to null if the capture itself fails. Registered from
   * inside <Canvas> because the renderer/scene live in R3F world, not the store.
   */
  captureScreenshot: (() => Promise<Blob | null>) | null;
  registerCapture: (fn: (() => Promise<Blob | null>) | null) => void;
  /**
   * Has the brick pipeline finished streaming everything the current view
   * asked for — i.e. is the picture on screen the FINAL one, not a blurry
   * half-streamed pyramid?
   *
   * Tri-state on purpose:
   * - `null`  — no volumetric work has been observed at all. A mesh-only or
   *   sparse-only scene sits here forever, so a consumer that waits for `true`
   *   would wait forever; `null` says "there is nothing to wait for", not
   *   "not ready yet".
   * - `false` — the pipeline is streaming. The image WILL still change.
   * - `true`  — the pipeline drained. This is the settled picture.
   *
   * Written by `BrickResidencyManager` at the two edges where it already
   * opens and closes its time-to-sharp clock, so this costs no new bookkeeping.
   */
  sharp: boolean | null;
  setSharp: (sharp: boolean | null) => void;
  /** Fit the camera so that the given layer fills the viewport */
  fitToLayer: (layerId: string) => void;
  worldUnitsPerPixel: number;
  setWorldUnitsPerPixel: (v: number) => void;
}

export const createViewSlice = (
  set: SliceSet<ViewSlice>,
  get: SliceGet<ViewSlice>,
): ViewSlice => ({
  trackables: new Set(),
  register: (ref) => set((state) => ({
    trackables: new Set(state.trackables).add(ref),
  })),
  unregister: (ref) => set((state) => {
    const trackables = new Set(state.trackables);
    trackables.delete(ref);
    return { trackables };
  }),
  visibleLayers: [],
  setVisible: (visibleSet) => set({ visibleLayers: Array.from(visibleSet) }),
  layerViewRanges: {},
  viewSnapshot: null,
  setLayerViewRanges: (ranges, snapshot) =>
    set(snapshot ? { layerViewRanges: ranges, viewSnapshot: snapshot } : { layerViewRanges: ranges }),
  frustumNear: 0.1,
  frustumFar: 100000,
  canvas: null,
  registerCanvas: (ctx) => set({ canvas: ctx }),
  captureScreenshot: null,
  registerCapture: (fn) => set({ captureScreenshot: fn }),
  sharp: null,
  setSharp: (sharp) => set({ sharp }),
  fitToLayer: (layerId) => {
    const { trackables, canvas } = get();

    if (!canvas) throw new Error("Canvas context is not registered in viewer store");

    // Find the trackable matching this layer
    let target: THREE.Object3D | undefined;
    for (const t of trackables) {
      if (t.kind === "layer" && t.id === layerId && t.ref.current) {
        target = t.ref.current;
        break;
      }
    }
    if (!target) throw new Error(`Target for layer ${layerId} not found`);

    fitCameraToObject(target, canvas);
  },
  worldUnitsPerPixel: 1,
  setWorldUnitsPerPixel: (v) => set({ worldUnitsPerPixel: v }),
});
