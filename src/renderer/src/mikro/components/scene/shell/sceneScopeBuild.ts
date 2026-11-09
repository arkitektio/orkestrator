import type { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import type { useMikro } from "@/mikro/api/funcs";
import type { SceneFragment } from "@/mikro/api/graphql";
import { resolveSceneCameraFrame } from "../platform/camera/cameraState";
import { resolvePreferredDisplayMode } from "../platform/camera/preferredView";
import { collectSceneLensFacts } from "../platform/model/channelLens";
import { lensRegistry, type LensRegistry } from "@/mikro/lib/lenses/lensRegistry";
import {
  createConfiguredSceneStores,
  openMissingSceneArrays,
} from "../platform/sources/zarrSources";
import { openSceneArrays } from "@/core/data/zarr/openArray";
import { assertWebGPUSupported } from "@/core/data/scene/gpu/webgpuSupport";
import { createAnimationStore } from "../platform/stores/animationStore";
import { createBrushSkeletonStore } from "../features/annotations/enhancers/brushSkeletonStore";
import { createModeStore } from "../platform/stores/modeStore";
import { createMeshDesignStore } from "../features/meshDesign/store/meshDesignStore";
import { createRoiDrawSessionStore } from "../features/annotations/roiDrawSessionStore";
import { createRoiDrawingStore } from "../features/annotations/roiDrawingStore";
import { createRoiSelectionStore } from "../features/annotations/roiSelectionStore";
import { createSceneStore } from "../platform/stores/sceneStore";
import type { useSceneViewAxes } from "../platform/stores/sceneViewAxes";
import { createSelectionStore } from "../platform/stores/selectionStore";
import { createViewStore } from "../platform/stores/viewStore";
import { createViewerStore } from "../platform/stores/viewerStore";
import { createBrickSlice } from "../features/bricks/store/brickSlice";
import { createMeshSlice } from "../features/meshes/store/meshSlice";
import { createNetworkSlice } from "../features/network/store/networkSlice";
import { createLayerRunSlice } from "../features/layerRun/layerRunSlice";
import { coldOpenTimeline } from "../platform/perf/coldOpenTimeline";

/**
 * The scene's IO, with no React in it: building a store scope for a scene,
 * folding a changed layer set into a live one, and reopening arrays that
 * failed. WHEN each of these runs — and against which fragment — is the scene
 * session's business (`sceneSession.ts`); these only do the work they are
 * handed.
 */

export type MikroClient = ReturnType<typeof useMikro>;
export type DatalayerEndpoint = ReturnType<typeof useDatalayerEndpoint>;
export type SceneViewAxes = ReturnType<typeof useSceneViewAxes>;


/**
 * The scene's store scope: one vanilla zustand store per concern, all created
 * together for one scene and provided together. Everything under a
 * `SceneProvider` reaches them through the scoped store hooks.
 */
export type SceneScope = {
  modeStore: ReturnType<typeof createModeStore>;
  viewStore: ReturnType<typeof createViewStore>;
  viewerStore: Awaited<ReturnType<typeof createViewerStore>>;
  selectionStore: ReturnType<typeof createSelectionStore>;
  sceneStore: ReturnType<typeof createSceneStore>;
  animationStore: ReturnType<typeof createAnimationStore>;
  roiDrawingStore: ReturnType<typeof createRoiDrawingStore>;
  roiDrawSessionStore: ReturnType<typeof createRoiDrawSessionStore>;
  roiSelectionStore: ReturnType<typeof createRoiSelectionStore>;
  brushSkeletonStore: ReturnType<typeof createBrushSkeletonStore>;
  meshDesignStore: ReturnType<typeof createMeshDesignStore>;
};

/**
 * How long a scene waits for the lenses it names by bare id before it is drawn
 * without them. The lookup overlaps the zarr metadata open, which is slower, so
 * this is normally never reached; when it is, the layers that wanted an id draw
 * at their fallback and `refreshLensSelections` corrects them when it lands.
 */
const LENS_LOOKUP_BUDGET_MS = 1500;

/**
 * Seed the session's lens registry from a scene payload and START resolving
 * the lenses it names by id alone (a render-graph node's channel, a sparse
 * colouring's position).
 *
 * Returns null — nothing to wait for, nothing sent — for every scene whose
 * layers carry their lenses as objects, which is every scene of intensity, rgb,
 * phasor and label layers, and for any scene whose ids the session already
 * knows. The returned promise never rejects.
 */
const startLensLookup = (
  registry: LensRegistry,
  layers: SceneFragment["layers"],
): { ids: string[]; settled: Promise<void> } | null => {
  const facts = collectSceneLensFacts(layers);
  for (const selection of facts.known) registry.seed(selection);
  const ids = registry.missing(facts.bareIds);
  return ids.length > 0 ? { ids, settled: registry.resolveMany(ids) } : null;
};

/** How long after a failed lens lookup the one retry is sent. */
const LENS_LOOKUP_RETRY_MS = 2000;

/**
 * What happens to a lookup the scene did not wait out, or that came back
 * short: once it settles — after one retry, if ids are still unknown — the
 * layers that were drawn at a fallback are re-derived. Nothing else would ask
 * again: a layer that changed only in content is never re-normalized.
 */
const followUpLensLookup = (
  registry: LensRegistry,
  lookup: { ids: string[]; settled: Promise<void> },
  refresh: () => void,
): void => {
  void lookup.settled.then(async () => {
    if (registry.missing(lookup.ids).length > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, LENS_LOOKUP_RETRY_MS));
      await registry.resolveMany(lookup.ids);
    }
    refresh();
  });
};

/** True when `lookup` settled inside the budget. */
const settledInBudget = (lookup: Promise<void>): Promise<boolean> =>
  new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(false), LENS_LOOKUP_BUDGET_MS);
    void lookup.then(() => {
      window.clearTimeout(timer);
      resolve(true);
    });
  });

/**
 * Build the store scope for `scene`. Rejects when the scene cannot be drawn at
 * all (no WebGPU, no datalayer, stores that will not open).
 *
 * `isCancelled` is asked only by work that outlives the build (the late lens
 * follow-up): a build whose result nobody wants is simply dropped by the
 * caller.
 */
export async function buildSceneScope(args: {
  scene: SceneFragment;
  viewAxes: SceneViewAxes;
  client: MikroClient;
  datalayer: DatalayerEndpoint;
  isCancelled: () => boolean;
}): Promise<SceneScope> {
  const { scene, viewAxes, client, datalayer, isCancelled } = args;
  // Gate before anything expensive: a scene without WebGPU cannot render
  // at all, so fail here rather than mount a Canvas that would silently
  // downgrade itself to a backend we no longer support.
  await assertWebGPUSupported();
  coldOpenTimeline.stamp("webgpuDevice");

  if (!datalayer) {
    throw new Error("No datalayer endpoint configured");
  }

  // Started BEFORE the stores open and awaited after, so the one request
  // it may send rides alongside the credentials and metadata fetches
  // instead of in front of them. Null for a scene that names no lens by
  // bare id: nothing is sent and nothing is awaited.
  const registry = lensRegistry(client);
  const lensLookup = startLensLookup(registry, scene.layers);

  // Opening the scene's zarr arrays belongs here, not in a store: the store
  // is a state container, not a fetcher. Stamped here so the cold-open
  // timeline still sees the same moment it used to.
  const storesById = await createConfiguredSceneStores(scene, client, datalayer);
  const arraysByStoreId = await openSceneArrays(storesById);
  coldOpenTimeline.stamp("arraysOpen");

  const lensesInTime = lensLookup ? await settledInBudget(lensLookup.settled) : true;

  const sceneStore = createSceneStore({ scene, resolveLens: registry.peek, viewAxes });
  if (lensLookup && (!lensesInTime || registry.missing(lensLookup.ids).length > 0)) {
    followUpLensLookup(registry, lensLookup, () => {
      if (!isCancelled()) sceneStore.getState().refreshLensSelections();
    });
  }
  // Both the opening view and the pose frame are facts about the scene AS
  // LOADED, so they are resolved from the normalized layers the scene
  // store just built rather than re-derived per consumer.
  const layers = sceneStore.getState().layers;

  return {
    modeStore: createModeStore({
      displayMode: resolvePreferredDisplayMode(scene.preferredView, layers),
    }),
    viewStore: createViewStore(),
    // Feature-owned slices are composed HERE: they name brick and mesh
    // types, and platform/ may not import a feature. Same store, same
    // set — this is composition, not a split.
    viewerStore: createViewerStore(arraysByStoreId, [
      createBrickSlice,
      createMeshSlice,
      createNetworkSlice,
      createLayerRunSlice,
    ]),
    selectionStore: createSelectionStore(),
    sceneStore,
    animationStore: createAnimationStore({
      scene,
      frame: resolveSceneCameraFrame(scene.worldCoordinateSystem, layers),
    }),
    roiDrawingStore: createRoiDrawingStore(),
    roiDrawSessionStore: createRoiDrawSessionStore(),
    roiSelectionStore: createRoiSelectionStore(),
    brushSkeletonStore: createBrushSkeletonStore(),
    meshDesignStore: createMeshDesignStore(),
  };
}

/**
 * Fold `scene`'s layer set into a LIVE scope: open the arrays it newly
 * references, then sync the layers and prune what pointed at a layer that
 * left. The canvas keeps rendering throughout.
 *
 * Resolves `null` when it was cancelled before it folded (nothing was
 * changed), otherwise the stores that would not open.
 */
export async function foldSceneLayers(args: {
  scope: SceneScope;
  scene: SceneFragment;
  client: MikroClient;
  datalayer: DatalayerEndpoint;
  isCancelled: () => boolean;
}): Promise<{ failedStoreIds: string[] } | null> {
  const { scope, scene, client, datalayer, isCancelled } = args;
  // As in the scope build: started before the arrays open, awaited after.
  const registry = lensRegistry(client);
  const lensLookup = startLensLookup(registry, scene.layers);

  let failedStoreIds: string[] = [];
  if (datalayer) {
    try {
      const opened = await openMissingSceneArrays({
        scene,
        client,
        datalayer,
        isOpen: scope.viewerStore.getState().hasArrayForStoreId,
      });
      if (isCancelled()) return null;
      // Arrays BEFORE layers: the fold is what wakes the planner.
      scope.viewerStore.getState().registerArrays(opened.arrays);
      failedStoreIds = opened.failedStoreIds;
    } catch (error) {
      if (isCancelled()) return null;
      // Never blanks the scene: fold the layers anyway (see
      // `openMissingSceneArrays`' partial-tolerance contract).
      console.warn("[scene] reconcile could not open zarr arrays", error);
    }
  }

  if (lensLookup) {
    const inTime = await settledInBudget(lensLookup.settled);
    if (isCancelled()) return null;
    if (!inTime || registry.missing(lensLookup.ids).length > 0) {
      followUpLensLookup(registry, lensLookup, () => {
        if (!isCancelled()) scope.sceneStore.getState().refreshLensSelections();
      });
    }
  }

  const { removedLayerIds } = scope.sceneStore.getState().syncSceneLayers(scene.layers);

  // Prune what pointed AT a layer that just left. Done here rather than in
  // the card that deletes, so every removal path is covered — the layer
  // panel's trash, a server-side delete, a future subscription.
  if (removedLayerIds.length > 0) {
    // A pin naming a departed layer would keep naming it. Unpinning the
    // probe also clears one that no longer resolves (`probeAfterPinChange`).
    const viewer = scope.viewerStore.getState();
    if (viewer.probeLayerId && removedLayerIds.includes(viewer.probeLayerId)) {
      viewer.setProbeLayerId(null);
    }
    if (viewer.dataLayerId && removedLayerIds.includes(viewer.dataLayerId)) {
      viewer.setDataLayerId(null);
    }
    // A selection outliving its layer would keep describing a shape that
    // is no longer in the scene.
    scope.roiSelectionStore.getState().dropLayerSelections(removedLayerIds);
  }

  if (failedStoreIds.length > 0) {
    console.warn("[scene] zarr open failed on reconcile", failedStoreIds);
  }
  return { failedStoreIds };
}

/**
 * One more attempt at the arrays a fold could not open. Nothing else would
 * ever retry them: the planner only replans when the layers array identity
 * moves — so on success the same layers are republished to trigger it.
 */
export async function retryFailedArrays(args: {
  scope: SceneScope;
  scene: SceneFragment;
  client: MikroClient;
  datalayer: DatalayerEndpoint;
  isCancelled: () => boolean;
}): Promise<void> {
  const { scope, scene, client, datalayer, isCancelled } = args;
  if (!datalayer) return;
  try {
    const retried = await openMissingSceneArrays({
      scene,
      client,
      datalayer,
      isOpen: scope.viewerStore.getState().hasArrayForStoreId,
    });
    if (isCancelled() || retried.arrays.size === 0) return;
    scope.viewerStore.getState().registerArrays(retried.arrays);
    scope.sceneStore.getState().touchImageLayers();
  } catch (error) {
    console.warn("[scene] zarr reopen retry failed", error);
  }
}
