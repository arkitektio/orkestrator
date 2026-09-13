import type { StoreApi } from "zustand/vanilla";
import { workerPool } from "../../../../../workers/pool";
import { createRepackDispatcher } from "../octree/repackDispatcher";
import type { SceneState } from "../../../platform/stores/sceneStore";
import type { ViewerState } from "../../../platform/stores/viewerStore";
import type { ViewState } from "../../../platform/stores/viewStore";
import { BrickResidencyManager } from "./brickResidency";
import type { BrickSlice } from "../store/brickSlice";

/**
 * Was a kill switch (settled ON (OCTREE_RENDERER.md §6.9)) for starting the brick system OUTSIDE the R3F canvas
 * (`orkestrator.earlyBricks`, default ON).
 *
 * Off reproduces the previous arrangement exactly: `BrickSystemProvider`
 * constructs the system itself, inside the canvas, after `renderer.init()` has
 * resolved. Read once at `BrickSystemHost` mount — pool-creation-time
 * semantics, like `orkestrator.occObservedRange` — so toggling it takes effect
 * on the next scene open.
 */



export type BrickSystem = {
  manager: BrickResidencyManager;
  dispose: () => void;
};

/**
 * Build, start and register the brick residency system.
 *
 * The ONE construction site, deliberately: the system now has two possible
 * mount points — `BrickSystemHost` (outside the canvas, the default) and
 * `BrickSystemProvider` (inside it, when `orkestrator.earlyBricks` is off) —
 * and they must not be able to drift on how the manager is wired.
 *
 * Note what is NOT here: the renderer. It is bound later via
 * `manager.attachRenderer`, which is the whole point — fetch, decode and repack
 * are device-independent, so they can run while the WebGPU device is still
 * being created.
 */
export function createBrickSystem(stores: {
  viewerStore: StoreApi<ViewerState & BrickSlice>;
  sceneStore: StoreApi<SceneState>;
  viewStore: StoreApi<ViewState>;
}): BrickSystem {
  const { viewerStore, sceneStore, viewStore } = stores;

  // Module workers (zstd/blosc bundles) cost tens of ms each to spawn and
  // evaluate. Idempotent — `useDatalayerWarmup` normally got here first; this
  // is the backstop for a scene mounted by some other route. Whole pool: a
  // literal count left half of it cold on machines with more cores.
  workerPool.prewarm();

  // Repack workers live exactly as long as the manager they serve.
  const repack = createRepackDispatcher();
  // Only worth spawning if this scene actually streams bricks: `sceneStore`
  // layers are already normalized to brick layers, so an annotation-only scene
  // skips 2–4 module workers it would never use.
  if (sceneStore.getState().layers.length > 0) repack.prewarm?.();

  const manager = new BrickResidencyManager({
    viewerStore,
    sceneStore,
    repack,
    // The streaming render-cadence gate and its off-frame pump read this at
    // fire time (gestures started after a timer was armed still drain under
    // the trickle policy).
    isInteracting: () => viewStore.getState().cameraMoving,
  });

  const stop = manager.start();
  viewerStore.getState().registerBrickSystem(manager);

  return {
    manager,
    dispose: () => {
      stop();
      viewerStore.getState().registerBrickSystem(null);
      manager.dispose();
      repack.dispose();
    },
  };
}
