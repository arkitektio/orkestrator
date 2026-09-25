import type { StoreApi } from "zustand/vanilla";
import { perfMonitor } from "../perf/perfMonitor";
import {
  computeSceneVisibility,
  sameViewRanges,
  sameVisibleIds,
} from "./visibility";
import { layersPlanKey, sameLayerElements } from "../model/layerPlanKey";
import type { SceneState } from "../stores/sceneStore";
import type { ViewerState } from "../stores/viewerStore";
import type { ViewState } from "../stores/viewStore";

/**
 * Store-level driver for the visibility computation (`platform/visibility/visibility.ts`).
 * Subscribes to the camera matrix (viewStore), the registered trackables
 * (viewerStore) and the layer list (sceneStore), coalesces any burst of
 * changes into ONE recompute per animation frame, and writes results back to
 * the viewer store only when they actually changed — so consumers like
 * `PlaneLayer.updateChunks` don't re-run on camera settles that didn't move
 * the visible ranges.
 *
 * Deliberately synchronous compute: it is a handful of matrix ops per layer,
 * runs only after the camera-settle debounce, and THREE scene-graph objects
 * cannot cheaply cross a worker boundary. The async part is the coalescing.
 */

type VisibilityStores = {
  viewStore: StoreApi<ViewState>;
  viewerStore: StoreApi<ViewerState>;
  sceneStore: StoreApi<SceneState>;
};

const scheduleFrame: (callback: () => void) => void =
  typeof requestAnimationFrame !== "undefined"
    ? (callback) => requestAnimationFrame(callback)
    : (callback) => setTimeout(callback, 0);

export function startVisibilityTracking({
  viewStore,
  viewerStore,
  sceneStore,
}: VisibilityStores): () => void {
  let stopped = false;
  let scheduled = false;

  const recompute = () => {
    const { viewProjectionMatrix, viewportSize, cameraPose } = viewStore.getState();
    if (!viewProjectionMatrix) return;

    perfMonitor.markVisibilityRecompute(); // no-op unless a perf recording is armed
    const viewerState = viewerStore.getState();
    const { visibleIds, ranges } = computeSceneVisibility({
      projScreenMatrix: viewProjectionMatrix,
      viewportSize,
      trackables: viewerState.trackables,
      layers: sceneStore.getState().layers,
      coordinateSystem: cameraPose?.coordinateSystem,
    });

    // Write-if-changed: skipping no-op writes keeps every subscriber of
    // visibleLayers / layerViewRanges quiet when nothing moved.
    if (!sameVisibleIds(viewerState.visibleLayers, visibleIds)) {
      viewerState.setVisible(visibleIds);
    }
    // The view SNAPSHOT rides in the same write as the ranges (see
    // `ViewSnapshot` in viewerStore): the node planner builds its camera
    // from it, so camera and visible box are structurally same-moment —
    // coherence no longer rests on this manager's subscription being
    // installed before the planner's. Unchanged ranges with a NEWER view
    // still publish the snapshot: the new view provably produces these very
    // ranges, so the pair stays coherent (identity compares — viewStore
    // preserves object identity on no-change emissions).
    const prevSnapshot = viewerState.viewSnapshot;
    const snapshotChanged =
      !prevSnapshot ||
      prevSnapshot.viewProjectionMatrix !== viewProjectionMatrix ||
      prevSnapshot.viewportSize !== viewportSize ||
      prevSnapshot.cameraPose !== cameraPose;
    const rangesChanged = !sameViewRanges(viewerState.layerViewRanges, ranges);
    if (rangesChanged || snapshotChanged) {
      viewerState.setLayerViewRanges(
        rangesChanged ? ranges : viewerState.layerViewRanges,
        { viewProjectionMatrix, viewportSize, cameraPose },
      );
    }
  };

  const schedule = () => {
    if (stopped || scheduled) return;
    scheduled = true;
    scheduleFrame(() => {
      scheduled = false;
      if (!stopped) recompute();
    });
  };

  // Only the inputs trigger a recompute; our own result writes to the viewer
  // store don't change `trackables` and thus don't reschedule.
  let lastMatrix = viewStore.getState().viewProjectionMatrix;
  let lastSize = viewStore.getState().viewportSize;
  const unsubscribeView = viewStore.subscribe((state) => {
    if (state.viewProjectionMatrix !== lastMatrix || state.viewportSize !== lastSize) {
      lastMatrix = state.viewProjectionMatrix;
      lastSize = state.viewportSize;
      schedule();
    }
  });

  let lastTrackables = viewerStore.getState().trackables;
  const unsubscribeViewer = viewerStore.subscribe((state) => {
    if (state.trackables !== lastTrackables) {
      lastTrackables = state.trackables;
      schedule();
    }
  });

  let lastLayers = sceneStore.getState().layers;
  let lastLayersKey = layersPlanKey(lastLayers);
  const unsubscribeScene = sceneStore.subscribe((state) => {
    if (state.layers === lastLayers) return;
    const previous = lastLayers;
    lastLayers = state.layers;
    // Same guard as nodePlanTracker's, same reasons: an identical-elements
    // republish is `touchImageLayers` asking for a recompute; a real element
    // replacement recomputes only when a field the visibility walk reads
    // moved (placement, axis mapping, lens — see layerPlanKey.ts). A clim
    // drag moves none of them.
    if (sameLayerElements(previous, state.layers)) {
      schedule();
      return;
    }
    const key = layersPlanKey(state.layers);
    if (key !== lastLayersKey) {
      lastLayersKey = key;
      schedule();
    }
  });

  schedule();

  return () => {
    stopped = true;
    unsubscribeView();
    unsubscribeViewer();
    unsubscribeScene();
  };
}
