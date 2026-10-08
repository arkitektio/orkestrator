import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  applyRendererBudgetSettings,
  resetRendererBudgetForTests,
} from "@/core/settings/renderer/rendererBudget";
import { startNodePlanTracking } from "./nodePlanTracker";
import type { LayerNodePlan } from "../octree/nodePlanning";
import { resetDecodedChunkCacheBytesForTests, resolvePoolBudget } from "../octree/poolBudget";
import type { LayerState } from "../../../platform/model/layerModel";
import type { ModeState } from "../../../platform/stores/modeStore";
import type { SceneState } from "../../../platform/stores/sceneStore";
import type { ViewerState, LayerViewRange } from "../../../platform/stores/viewerStore";
import type { ViewState } from "../../../platform/stores/viewStore";
import type { BrickSlice } from "../store/brickSlice";

const LAYER_ID = "layer-1";

const layer = {
  id: LAYER_ID,
  visible: true,
  affineMatrix: null,
  xAxis: "x",
  yAxis: "y",
  zAxis: null,
  intensityAxis: "c",
  fixedLOD: null,
  lens: {
    slices: [],
    axisNames: ["y", "x", "c"],
    shape: [512, 512, 1],
    dataset: {
      axisNames: ["y", "x", "c"],
      dataArrays: [
        { level: 0, scaleFactors: null, store: { id: "store-0" } },
        { level: 1, scaleFactors: [2, 2, 1], store: { id: "store-1" } },
      ],
    },
  },
} as unknown as LayerState;

const ARRAYS: Record<string, { shape: number[]; chunks: number[]; dtype: string }> = {
  "store-0": { shape: [512, 512, 1], chunks: [256, 256, 1], dtype: "float32" },
  "store-1": { shape: [256, 256, 1], chunks: [256, 256, 1], dtype: "float32" },
};

const FULL_VIEW: LayerViewRange = { xRange: [0, 512], yRange: [0, 512], zRange: null, scale: 2 };

/** The 2D spec this fixture resolves to: 256×256×1 payload, no border, one
 * channel, float32 atlas. Five bricks in the pyramid (L0 2×2, L1 1×1). */
const SLOT_BYTES = 256 * 256 * 1 * 1 * 4;
const PYRAMID_BRICKS = 5;

type ViewerSubset = Pick<
  ViewerState,
  | "layerViewRanges"
  | "lodBias"
  | "currentZ"
  | "residencyVersion"
  | "nodePlans"
  | "unplannableLayers"
  | "getArrayForStoreId"
  | "setNodePlans"
  | "setUnplannableLayers"
> & { brickSystem: { poolAtlasBytes: (poolKey: string) => number | null } | null };

const makeStores = (
  layers: LayerState[] = [layer],
  /** Bytes `BrickResidencyManager.poolAtlasBytes` reports for the live atlas —
   * null (default) = no pool allocated yet, which skips the tracker's clamp. */
  liveAtlasBytes: number | null = null,
) => {
  const viewerStore = createStore<ViewerSubset>((set) => ({
    layerViewRanges: {},
    lodBias: 1,
    currentZ: 0,
    residencyVersion: 0,
    nodePlans: {},
    unplannableLayers: {},
    brickSystem: liveAtlasBytes === null ? null : { poolAtlasBytes: () => liveAtlasBytes },
    getArrayForStoreId: ((storeId: string) => {
      const arr = ARRAYS[storeId];
      if (!arr) throw new Error(`unknown store ${storeId}`);
      return arr;
    }) as ViewerSubset["getArrayForStoreId"],
    setNodePlans: (plans: Record<string, LayerNodePlan>) => set({ nodePlans: plans }),
    setUnplannableLayers: (unplannable) => set({ unplannableLayers: unplannable }),
  })) as unknown as StoreApi<ViewerState & BrickSlice>;

  const sceneStore = createStore<Pick<SceneState, "layers">>(() => ({
    layers,
  })) as unknown as StoreApi<SceneState>;

  const viewStore = createStore<Pick<ViewState, "viewProjectionMatrix" | "viewportSize" | "cameraPose">>(
    () => ({
      viewProjectionMatrix: null,
      viewportSize: { width: 800, height: 600 },
      cameraPose: null,
    }),
  ) as unknown as StoreApi<ViewState>;

  const modeStore = createStore<Pick<ModeState, "displayMode">>(() => ({
    displayMode: "2D" as const,
  })) as unknown as StoreApi<ModeState>;

  return { viewerStore, sceneStore, viewStore, modeStore };
};

// Long enough to cross the tracker's MIN_REPLAN_INTERVAL_MS debounce.
const settle = () => new Promise((resolve) => setTimeout(resolve, 280));

describe("startNodePlanTracking", () => {
  it("plans coarsest immediately, then refines when a view range arrives", async () => {
    const stores = makeStores();
    const stop = startNodePlanTracking(stores);

    await settle();
    let plan = stores.viewerStore.getState().nodePlans[LAYER_ID];
    expect(plan.targetLevel).toBe(1);
    expect(plan.nodes.map((n) => n.key)).toEqual(["1:0:0:0"]);

    stores.viewerStore.setState({ layerViewRanges: { [LAYER_ID]: FULL_VIEW } });
    await settle();

    plan = stores.viewerStore.getState().nodePlans[LAYER_ID];
    expect(plan.targetLevel).toBe(0);
    expect(plan.nodes.filter((n) => n.role === "target")).toHaveLength(4);
    expect(plan.nodes.filter((n) => n.role === "keep").map((n) => n.key)).toEqual(["1:0:0:0"]);

    stop();
  });

  it("refines a SMALL pyramid whose atlas is smaller than the headroom target", async () => {
    // The reported regression: a 5-brick pyramid gets an atlas sized to exactly
    // itself (resolvePoolBudget's "whole pyramid fits" branch, headroomSlots 0),
    // and the tracker's live-atlas clamp then subtracted a flat
    // MIN_POOL_HEADROOM_SLOTS (64) from it. That went negative, floored at ONE
    // slot, which zeroed planLayerNodes' refineBudgetBytes (maxPlanBytes minus
    // the coarsest reservation) — so every child was rejected and the plan sat
    // at the coarsest level at every zoom, on every small image.
    const stores = makeStores([layer], PYRAMID_BRICKS * SLOT_BYTES);
    const stop = startNodePlanTracking(stores);
    stores.viewerStore.setState({ layerViewRanges: { [LAYER_ID]: FULL_VIEW } });
    await settle();

    const plan = stores.viewerStore.getState().nodePlans[LAYER_ID];
    expect(plan.targetLevel).toBe(0);
    expect(plan.nodes.filter((n) => n.role === "target")).toHaveLength(4);
    // The whole pyramid fits the atlas that exists, so the plan may spend all
    // of it — no headroom is reserved when nothing can ever be out-of-plan.
    expect(plan.planBudgetBytes).toBe(PYRAMID_BRICKS * SLOT_BYTES);
    expect(plan.refineBudgetBytes).toBeGreaterThan(0);

    stop();
  });

  it("still clamps the plan to a live atlas too small for the pyramid", async () => {
    // The clamp's original job (a pool allocated while more pools were open)
    // must survive the cap: 3 slots of atlas → headroom min(64, 1) = 1 slot →
    // 2 slots of plan, which cannot hold all 4 L0 bricks.
    const stores = makeStores([layer], 3 * SLOT_BYTES);
    const stop = startNodePlanTracking(stores);
    stores.viewerStore.setState({ layerViewRanges: { [LAYER_ID]: FULL_VIEW } });
    await settle();

    const plan = stores.viewerStore.getState().nodePlans[LAYER_ID];
    expect(plan.planBudgetBytes).toBe(2 * SLOT_BYTES);
    expect(plan.planBytes).toBeLessThanOrEqual(3 * SLOT_BYTES);

    stop();
  });

  it("preserves plan identity when a replan is value-equal", async () => {
    const stores = makeStores();
    const stop = startNodePlanTracking(stores);
    stores.viewerStore.setState({ layerViewRanges: { [LAYER_ID]: FULL_VIEW } });
    await settle();

    const planBefore = stores.viewerStore.getState().nodePlans[LAYER_ID];
    let notifications = 0;
    const unsubscribe = stores.viewerStore.subscribe(() => notifications++);

    stores.viewerStore.setState({ layerViewRanges: { [LAYER_ID]: { ...FULL_VIEW } } });
    await settle();

    expect(notifications).toBe(1); // only the input write itself
    expect(stores.viewerStore.getState().nodePlans[LAYER_ID]).toBe(planBefore);
    unsubscribe();
    stop();
  });

  it("ignores a window-only layer replacement, but replans on a touch republish", async () => {
    const stores = makeStores();
    const stop = startNodePlanTracking(stores);
    stores.viewerStore.setState({ layerViewRanges: { [LAYER_ID]: FULL_VIEW } });
    await settle();
    const planBefore = stores.viewerStore.getState().nodePlans[LAYER_ID];

    // `schedule()` (and a recompute) read the view store; a quiet spy after
    // the initial settle is therefore "no replan was even scheduled".
    const viewReads = vi.spyOn(stores.viewStore, "getState");

    // The exact pushChannels shape: fresh channels/sources arrays and moved
    // window fields, every planning input spread through unchanged. Sixty of
    // these a second is a contrast drag, and none may cost a replan.
    stores.sceneStore.setState({
      layers: [
        {
          ...layer,
          channels: [{ transfer: { climMin: 5, climMax: 60 } }],
          sources: [{ transfer: { climMin: 5, climMax: 60 } }],
          climMin: 5,
          climMax: 60,
        } as unknown as LayerState,
      ],
    });
    await settle();
    expect(viewReads).not.toHaveBeenCalled();
    expect(stores.viewerStore.getState().nodePlans[LAYER_ID]).toBe(planBefore);

    // `touchImageLayers`: IDENTICAL elements in a fresh array — the explicit
    // replan request for a zarr store that opened late. Must schedule.
    stores.sceneStore.setState({ layers: [...stores.sceneStore.getState().layers] });
    await settle();
    expect(viewReads).toHaveBeenCalled();

    viewReads.mockRestore();
    stop();
  });

  it("replans when the display mode flips", async () => {
    const stores = makeStores();
    const stop = startNodePlanTracking(stores);
    stores.viewerStore.setState({ layerViewRanges: { [LAYER_ID]: FULL_VIEW } });
    await settle();
    expect(stores.viewerStore.getState().nodePlans[LAYER_ID].mode).toBe("2D");

    stores.modeStore.setState({ displayMode: "3D" });
    await settle();
    expect(stores.viewerStore.getState().nodePlans[LAYER_ID].mode).toBe("3D");

    stop();
  });

  it("refuses a layer whose coarsest-level pool floor exceeds the budget (P18)", async () => {
    // Single-level 16384² float32 image: 2D brick grid 64×64 → (4096+64)
    // slots × 256·256·4 B ≈ 1.09 GB floor > the 512 MB default budget.
    const hugeLayer = {
      ...layer,
      id: "huge-single-level",
      lens: {
        ...layer.lens,
        shape: [16384, 16384, 1],
        dataset: {
          axisNames: ["y", "x", "c"],
          dataArrays: [{ level: 0, scaleFactors: null, store: { id: "store-huge" } }],
        },
      },
    } as unknown as LayerState;
    ARRAYS["store-huge"] = {
      shape: [16384, 16384, 1],
      chunks: [256, 256, 1],
      dtype: "float32",
    };

    const stores = makeStores([layer, hugeLayer]);
    const stop = startNodePlanTracking(stores);
    await settle();

    const state = stores.viewerStore.getState();
    // No plan, no fetch, no pool for the oversized layer…
    expect(state.nodePlans["huge-single-level"]).toBeUndefined();
    // …with the reason surfaced for the UI badge…
    const info = state.unplannableLayers["huge-single-level"];
    expect(info).toBeDefined();
    expect(info.mode).toBe("2D");
    expect(info.floorBytes).toBeGreaterThan(info.capBytes);
    // …while the viable layer alongside still plans normally.
    expect(state.nodePlans[LAYER_ID]).toBeDefined();
    expect(state.unplannableLayers[LAYER_ID]).toBeUndefined();

    stop();
    delete ARRAYS["store-huge"];
  });

  describe("a 64³-chunked volume, through the real budget chain", () => {
    // 4096² × 1024 uint16, five isotropic levels, every level in 64³ chunks:
    // a slab brick is cut from 16 chunks, 64 slices deep, per channel.
    const MiB = 1024 * 1024;
    const DIMS = ["c", "z", "y", "x"];
    const volumeLayer = (channels: number) => {
      const id = `volume-${channels}ch`;
      for (let level = 0; level < 5; level++) {
        ARRAYS[`${id}-${level}`] = {
          shape: [channels, 1024 >> level, 4096 >> level, 4096 >> level],
          chunks: [1, 64, 64, 64],
          dtype: "uint16",
        };
      }
      return {
        ...layer,
        id,
        zAxis: "z",
        lens: {
          slices: [],
          axisNames: DIMS,
          shape: [channels, 1024, 4096, 4096],
          dataset: {
            axisNames: DIMS,
            dataArrays: [0, 1, 2, 3, 4].map((level) => ({
              level,
              scaleFactors: level === 0 ? null : [1, 1 << level, 1 << level, 1 << level],
              store: { id: `${id}-${level}` },
            })),
          },
        },
      } as unknown as LayerState;
    };
    /** A 2200 × 1300 px viewport at one pixel per voxel: 10 × 6 L0 bricks. */
    const SCREEN: LayerViewRange = {
      xRange: [948, 3148],
      yRange: [1398, 2698],
      zRange: [0, 1024],
      scale: 1,
    };
    const onScreenL0 = (plan: LayerNodePlan) =>
      plan.nodes.filter(
        (node) =>
          node.level === 0 &&
          node.coords[0] >= 3 &&
          node.coords[0] <= 12 &&
          node.coords[1] >= 5 &&
          node.coords[1] <= 10,
      ).length;

    const planWith = async (
      channels: number,
      budgets: { gpuMB: number; decodeCacheMB: number },
    ) => {
      applyRendererBudgetSettings({
        rendererGpuBudgetMB: budgets.gpuMB,
        rendererDecodeCacheMB: budgets.decodeCacheMB,
      });
      resetDecodedChunkCacheBytesForTests();
      const volume = volumeLayer(channels);
      // 256² × 1 r16f texels per channel; the atlas the pool would allocate.
      const slotBytes = 256 * 256 * channels * 2;
      const { atlasBytes } = resolvePoolBudget({
        deviceBudgetBytes: budgets.gpuMB * MiB,
        poolCount: 1,
        slotBytes,
        totalBrickBytes: Number.MAX_SAFE_INTEGER,
      });
      const stores = makeStores([volume], atlasBytes);
      const stop = startNodePlanTracking(stores);
      try {
        await settle();
        stores.viewerStore.setState({ layerViewRanges: { [volume.id]: SCREEN } });
        await settle();
        return { plan: stores.viewerStore.getState().nodePlans[volume.id], slotBytes };
      } finally {
        stop();
        resetRendererBudgetForTests();
        resetDecodedChunkCacheBytesForTests();
      }
    };

    it("holds the whole screen at L0 on the budgets an RTX 4070 earns", async () => {
      const { plan, slotBytes } = await planWith(1, { gpuMB: 6141, decodeCacheMB: 3070 });
      expect(plan.decodeBudgetBytes).toBe(Math.floor(0.9 * 3070 * MiB));
      expect(plan.targetLevel).toBe(0);
      expect(onScreenL0(plan)).toBe(60);
      // Neither currency binds: slots to spare, chunks inside the cache share.
      expect(plan.nodes.length * slotBytes).toBeLessThan(plan.refineBudgetBytes / 4);
      expect(plan.decodeBytesPlanned).toBeLessThan(plan.decodeBudgetBytes);
    });

    it("is bounded by the decode cache, not by slots, with four channels", async () => {
      // 32 MiB of chunks per brick now: the cache share runs out first, on
      // either machine, and the plan says so.
      for (const budgets of [
        { gpuMB: 6141, decodeCacheMB: 3070 },
        { gpuMB: 1475, decodeCacheMB: 737 },
      ]) {
        const { plan, slotBytes } = await planWith(4, budgets);
        const budget = Math.floor(0.9 * budgets.decodeCacheMB * MiB);
        expect(plan.decodeBudgetBytes).toBe(budget);
        expect(plan.decodeBytesPlanned).toBeLessThanOrEqual(budget);
        expect(budget - plan.decodeBytesPlanned).toBeLessThan(32 * MiB);
        expect(plan.nodes.length * slotBytes).toBeLessThan(plan.refineBudgetBytes / 4);
        expect(onScreenL0(plan)).toBeLessThan(60);
      }
    });

    /** A class's FIRST plan with the view already known (a layer switched on
     * in an open scene), then the replan any later input causes. */
    const firstAndSecondPlan = async (displayMode: "2D" | "3D", viewRange: LayerViewRange) => {
      applyRendererBudgetSettings({ rendererGpuBudgetMB: 1475, rendererDecodeCacheMB: 737 });
      resetDecodedChunkCacheBytesForTests();
      const volume = volumeLayer(1);
      const stores = makeStores([volume]);
      stores.modeStore.setState({ displayMode });
      stores.viewerStore.setState({ layerViewRanges: { [volume.id]: viewRange } });
      const stop = startNodePlanTracking(stores);
      try {
        await settle();
        const first = stores.viewerStore.getState().nodePlans[volume.id];
        stores.viewerStore.setState({ lodBias: 1.0001 });
        await settle();
        return { first, second: stores.viewerStore.getState().nodePlans[volume.id] };
      } finally {
        stop();
        resetRendererBudgetForTests();
        resetDecodedChunkCacheBytesForTests();
      }
    };
    const CHUNK_BUDGET = Math.floor(0.9 * 737 * MiB);

    it("holds the chunk budget back for a first 3D plan (the cold-open gate)", async () => {
      const { first, second } = await firstAndSecondPlan("3D", {
        xRange: [0, 4096],
        yRange: [0, 4096],
        zRange: [0, 1024],
        scale: 1,
      });
      // The coarse set a 3D scene has always opened on: floor only.
      expect(first.mode).toBe("3D");
      expect(first.decodeAllowanceBytes).toBe(0);
      expect(first.decodeBudgetBytes).toBe(0);
      expect(first.nodes.every((node) => node.level >= first.budgetMinLevel)).toBe(true);
      // From the next plan on, allowance and budget both.
      expect(second.decodeAllowanceBytes).toBeGreaterThan(0);
      expect(second.decodeBudgetBytes).toBe(CHUNK_BUDGET);
      expect(second.nodes.length).toBeGreaterThan(first.nodes.length);
    });

    it("holds it back again for the first 3D plan after a switch from 2D", async () => {
      applyRendererBudgetSettings({ rendererGpuBudgetMB: 1475, rendererDecodeCacheMB: 737 });
      resetDecodedChunkCacheBytesForTests();
      const volume = volumeLayer(1);
      const stores = makeStores([volume]);
      stores.viewerStore.setState({ layerViewRanges: { [volume.id]: SCREEN } });
      const stop = startNodePlanTracking(stores);
      try {
        await settle();
        expect(stores.viewerStore.getState().nodePlans[volume.id].decodeBudgetBytes).toBe(CHUNK_BUDGET);

        // New pools, nothing resident: a cold open in all but name.
        stores.modeStore.setState({ displayMode: "3D" });
        stores.viewerStore.setState({
          layerViewRanges: {
            [volume.id]: { xRange: [0, 4096], yRange: [0, 4096], zRange: [0, 1024], scale: 1 },
          },
        });
        await settle();
        const first = stores.viewerStore.getState().nodePlans[volume.id];
        expect(first.mode).toBe("3D");
        expect(first.decodeBudgetBytes).toBe(0);

        // The next plan that differs (a value-equal replan keeps the old
        // plan object, and with it the old debug figures).
        stores.viewerStore.setState({
          layerViewRanges: {
            [volume.id]: { xRange: [0, 2048], yRange: [0, 2048], zRange: [0, 1024], scale: 1 },
          },
        });
        await settle();
        const second = stores.viewerStore.getState().nodePlans[volume.id];
        expect(second).not.toBe(first);
        expect(second.decodeBudgetBytes).toBe(CHUNK_BUDGET);
      } finally {
        stop();
        resetRendererBudgetForTests();
        resetDecodedChunkCacheBytesForTests();
      }
    });

    it("gives a first 2D plan the chunk budget straight away", async () => {
      const { first } = await firstAndSecondPlan("2D", SCREEN);
      expect(first.mode).toBe("2D");
      expect(first.decodeAllowanceBytes).toBe(0);
      expect(first.decodeBudgetBytes).toBe(CHUNK_BUDGET);
      expect(first.targetLevel).toBe(0);
    });
  });

  it("plans co-pool layers with identical placement ONCE, sharing plan identity", async () => {
    // The per-channel-layer case: same dataset, same affine, same view range →
    // one equivalence class → one DFS, every member handed the same object.
    const twin = { ...layer, id: "layer-2" } as unknown as LayerState;
    const stores = makeStores([layer, twin]);
    const stop = startNodePlanTracking(stores);
    stores.viewerStore.setState({
      layerViewRanges: { [LAYER_ID]: FULL_VIEW, "layer-2": { ...FULL_VIEW } },
    });
    await settle();

    const plans = stores.viewerStore.getState().nodePlans;
    expect(plans[LAYER_ID]).toBeDefined();
    expect(plans["layer-2"]).toBe(plans[LAYER_ID]);

    stop();
  });

  it("a co-pool member with a different affine plans separately", async () => {
    const moved = {
      ...layer,
      id: "layer-moved",
      affineMatrix: [
        [1, 0, 0, 128],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ],
    } as unknown as LayerState;
    const stores = makeStores([layer, moved]);
    const stop = startNodePlanTracking(stores);
    stores.viewerStore.setState({
      layerViewRanges: { [LAYER_ID]: FULL_VIEW, "layer-moved": { ...FULL_VIEW } },
    });
    await settle();

    const plans = stores.viewerStore.getState().nodePlans;
    expect(plans[LAYER_ID]).toBeDefined();
    expect(plans["layer-moved"]).toBeDefined();
    expect(plans["layer-moved"]).not.toBe(plans[LAYER_ID]);

    stop();
  });

  it("throttles replans while the camera is moving, catches up on settle", async () => {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const stores = makeStores();
    const stop = startNodePlanTracking(stores);
    await settle(); // initial coarsest plan lands (~t=0)

    // Gesture: the MOTION interval (500 ms) governs. Under the idle interval
    // (200 ms, already elapsed) this view-range change would replan on the
    // next animation frame — 150 ms later it must still be pending. On an
    // overloaded runner the wait itself can overshoot the motion window, so
    // the still-pending claim is only asserted when the clock stayed honest.
    stores.viewStore.setState({ cameraMoving: true });
    const changedAt = performance.now();
    stores.viewerStore.setState({ layerViewRanges: { [LAYER_ID]: FULL_VIEW } });
    await wait(150);
    if (performance.now() - changedAt < 400) {
      expect(stores.viewerStore.getState().nodePlans[LAYER_ID].targetLevel).toBe(1);
    }

    // Settle edge: the deferred sharp replan lands promptly (well before the
    // motion timer would have fired).
    stores.viewStore.setState({ cameraMoving: false });
    await wait(100);
    expect(stores.viewerStore.getState().nodePlans[LAYER_ID].targetLevel).toBe(0);

    stop();
  });

  it("never plans FINER than the last plan while the camera moves; the settle replan does", async () => {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const stores = makeStores();
    const stop = startNodePlanTracking(stores);
    await settle(); // initial coarsest plan (targetLevel 1)
    expect(stores.viewerStore.getState().nodePlans[LAYER_ID].targetLevel).toBe(1);

    // A zoom-in during a gesture: the motion replan (500 ms) runs under the
    // ceiling — the previous plan's targetLevel — so no intermediate/finer
    // bricks are planned (and therefore fetched) mid-gesture.
    stores.viewStore.setState({ cameraMoving: true });
    stores.viewerStore.setState({ layerViewRanges: { [LAYER_ID]: FULL_VIEW } });
    await wait(650);
    expect(stores.viewerStore.getState().nodePlans[LAYER_ID].targetLevel).toBe(1);

    // Settle edge: ceiling lifted, the fine plan lands promptly.
    stores.viewStore.setState({ cameraMoving: false });
    await wait(100);
    expect(stores.viewerStore.getState().nodePlans[LAYER_ID].targetLevel).toBe(0);

    stop();
  });

  it("REMOVES the plan when a layer turns invisible (visibility must reach the renderer)", async () => {
    const stores = makeStores();
    const stop = startNodePlanTracking(stores);
    stores.viewerStore.setState({ layerViewRanges: { [LAYER_ID]: FULL_VIEW } });
    await settle();
    expect(stores.viewerStore.getState().nodePlans[LAYER_ID]).toBeDefined();

    // Same layer, now hidden: it is filtered from planning, and the stale plan
    // must be PUBLISHED away — residency reconciles pools (and merged passes
    // drop the member) off the nodePlans identity change.
    stores.sceneStore.setState({
      layers: [{ ...layer, visible: false } as unknown as LayerState],
    } as never);
    await settle();
    expect(stores.viewerStore.getState().nodePlans[LAYER_ID]).toBeUndefined();

    stop();
  });

  it("builds the NodeCamera from the published viewSnapshot, not the live view", async () => {
    // W3 coherence: the planner's camera must come from viewerStore's
    // viewSnapshot (published atomically with the ranges) — a live viewStore
    // read paired a fresh camera with one-visibility-hop-stale boxes.
    const makeView = (position: [number, number, number]) => {
      const cam = new THREE.PerspectiveCamera(60, 800 / 600, 1, 100000);
      cam.position.set(...position);
      cam.lookAt(256, 256, 0.5);
      cam.updateMatrixWorld(true);
      cam.updateProjectionMatrix();
      return {
        viewProjectionMatrix: new THREE.Matrix4().multiplyMatrices(
          cam.projectionMatrix,
          cam.matrixWorldInverse,
        ),
        viewportSize: { width: 800, height: 600 },
        cameraPose: {
          position,
          isPerspective: true,
          fovY: THREE.MathUtils.degToRad(60),
          coordinateSystem: THREE.WebGLCoordinateSystem,
        },
      };
    };
    const near = makeView([-100, 256, 0.5]); // 100 voxels off the x face → refines
    const far = makeView([20000, 256, 0.5]); // footprint ≪ 1 px → stays coarse

    const planFor = async (
      live: ReturnType<typeof makeView>,
      snapshot: ReturnType<typeof makeView> | null,
    ) => {
      const stores = makeStores();
      stores.modeStore.setState({ displayMode: "3D" } as never);
      stores.viewStore.setState(live as never);
      stores.viewerStore.setState({
        layerViewRanges: { [LAYER_ID]: FULL_VIEW },
        ...(snapshot ? { viewSnapshot: snapshot } : {}),
      } as never);
      const stop = startNodePlanTracking(stores);
      await settle();
      stop();
      return stores.viewerStore.getState().nodePlans[LAYER_ID];
    };

    const nearLive = await planFor(near, null);
    const farLive = await planFor(far, null);
    expect(nearLive.targetLevel).not.toBe(farLive.targetLevel); // the two views are distinguishable
    // Live view says FAR, snapshot says NEAR: the snapshot must win.
    const snapshotWins = await planFor(far, near);
    expect(snapshotWins.targetLevel).toBe(nearLive.targetLevel);
    expect(snapshotWins.nodes.map((n) => n.key)).toEqual(nearLive.nodes.map((n) => n.key));
  });

  it("stops reacting after cleanup", async () => {
    const stores = makeStores();
    const stop = startNodePlanTracking(stores);
    await settle();
    stop();

    stores.viewerStore.setState({ layerViewRanges: { [LAYER_ID]: FULL_VIEW } });
    await settle();

    expect(stores.viewerStore.getState().nodePlans[LAYER_ID].targetLevel).toBe(1);
  });
});
