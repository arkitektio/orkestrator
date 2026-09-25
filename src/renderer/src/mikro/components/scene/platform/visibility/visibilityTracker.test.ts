import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createStore, type StoreApi } from "zustand/vanilla";
import { startVisibilityTracking } from "./visibilityTracker";
import type { LayerState } from "../model/layerModel";
import type { SceneState } from "../stores/sceneStore";
import type { ViewerState } from "../stores/viewerStore";
import type { ViewState } from "../stores/viewStore";

const LAYER_ID = "layer-1";

const layer = {
  id: LAYER_ID,
  affineMatrix: null,
  xAxis: "x",
  yAxis: "y",
  zAxis: null,
  intensityAxis: null,
  lens: { axisNames: ["y", "x"], shape: [50, 100] },
} as unknown as LayerState;

const makeMatrix = () => {
  const camera = new THREE.OrthographicCamera(-100, 100, 50, -50, 0.1, 1000);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
};

// Minimal store fakes carrying only the state the tracker touches.
const makeStores = () => {
  const viewStore = createStore<Pick<ViewState, "viewProjectionMatrix" | "viewportSize">>(() => ({
    viewProjectionMatrix: null,
    viewportSize: { width: 200, height: 100 },
  })) as unknown as StoreApi<ViewState>;

  // Corner-anchored: the unit-centered box offset by half its size, so the
  // layer's world box spans [0,100]×[0,50] (the brick layers' arrangement).
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(100, 50, 1));
  mesh.position.set(50, 25, 0);
  mesh.updateMatrixWorld(true);
  const trackable = { kind: "layer" as const, id: LAYER_ID, ref: { current: mesh } };

  type ViewerSubset = Pick<
    ViewerState,
    | "trackables"
    | "visibleLayers"
    | "layerViewRanges"
    | "viewSnapshot"
    | "setVisible"
    | "setLayerViewRanges"
  >;
  const viewerStore = createStore<ViewerSubset>((set) => ({
    trackables: new Set([trackable]) as ViewerSubset["trackables"],
    visibleLayers: [],
    layerViewRanges: {},
    viewSnapshot: null,
    setVisible: (visibleSet) => set({ visibleLayers: Array.from(visibleSet) }),
    setLayerViewRanges: (ranges, snapshot) =>
      set(snapshot ? { layerViewRanges: ranges, viewSnapshot: snapshot } : { layerViewRanges: ranges }),
  })) as unknown as StoreApi<ViewerState>;

  const sceneStore = createStore<Pick<SceneState, "layers">>(() => ({
    layers: [layer],
  })) as unknown as StoreApi<SceneState>;

  return { viewStore, viewerStore, sceneStore };
};

// The tracker coalesces via setTimeout(0) outside the browser.
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("startVisibilityTracking", () => {
  it("computes visibility once the camera matrix syncs", async () => {
    const stores = makeStores();
    const stop = startVisibilityTracking(stores);

    await settle();
    expect(stores.viewerStore.getState().visibleLayers).toEqual([]); // no matrix yet

    stores.viewStore.setState({ viewProjectionMatrix: makeMatrix() });
    await settle();

    expect(stores.viewerStore.getState().visibleLayers).toEqual([LAYER_ID]);
    expect(stores.viewerStore.getState().layerViewRanges[LAYER_ID].xRange).toEqual([0, 100]);

    stop();
  });

  it("skips store writes when the result is unchanged", async () => {
    const stores = makeStores();
    const stop = startVisibilityTracking(stores);
    stores.viewStore.setState({ viewProjectionMatrix: makeMatrix() });
    await settle();

    let notifications = 0;
    const unsubscribe = stores.viewerStore.subscribe(() => notifications++);

    // A layer edit that doesn't move anything (same content, new array —
    // e.g. a contrast tweak) must not ripple into visibility writes.
    stores.sceneStore.setState({ layers: [layer] });
    await settle();

    expect(notifications).toBe(0);
    unsubscribe();
    stop();
  });

  it("publishes the view snapshot atomically with the ranges (W3 coherence)", async () => {
    const stores = makeStores();
    const stop = startVisibilityTracking(stores);
    const matrix = makeMatrix();
    stores.viewStore.setState({ viewProjectionMatrix: matrix });
    await settle();

    // The snapshot carries the EXACT emission the ranges were computed from.
    const state = stores.viewerStore.getState();
    expect(state.viewSnapshot?.viewProjectionMatrix).toBe(matrix);
    expect(state.viewSnapshot?.viewportSize).toBe(stores.viewStore.getState().viewportSize);

    // A NEW view producing the SAME ranges still refreshes the snapshot —
    // the pair stays coherent (this view provably yields these ranges) and
    // the planner reschedules off the snapshot identity.
    const sameValueMatrix = makeMatrix();
    stores.viewStore.setState({ viewProjectionMatrix: sameValueMatrix });
    await settle();
    const after = stores.viewerStore.getState();
    expect(after.layerViewRanges).toBe(state.layerViewRanges); // unchanged, identity kept
    expect(after.viewSnapshot?.viewProjectionMatrix).toBe(sameValueMatrix);

    stop();
  });

  it("stops reacting after cleanup", async () => {
    const stores = makeStores();
    const stop = startVisibilityTracking(stores);
    stop();

    stores.viewStore.setState({ viewProjectionMatrix: makeMatrix() });
    await settle();

    expect(stores.viewerStore.getState().visibleLayers).toEqual([]);
  });
});
