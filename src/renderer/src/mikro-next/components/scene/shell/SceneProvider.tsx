import { useDatalayerEndpoint, useMikro } from "@/app/Arkitekt";
import { SceneFragment } from "@/mikro-next/api/graphql";
import { AttributeServiceProvider } from "@/mikro-next/lib/attributes/AttributeServiceProvider";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { resolveSceneCameraFrame } from "../platform/camera/cameraState";
import { resolvePreferredDisplayMode } from "../platform/camera/preferredView";
import { sceneLayerSignature, sceneScopeSignature } from "../platform/model/sceneStructure";
import {
  createConfiguredSceneStores,
  openMissingSceneArrays,
} from "../platform/sources/zarrSources";
import { openSceneArrays } from "@/lib/zarr/openArray";
import { assertWebGPUSupported } from "@/lib/scene/gpu/webgpuSupport";
import {
  AnimationStoreContext,
  createAnimationStore,
} from "../platform/stores/animationStore";
import {
  BrushSkeletonStoreContext,
  createBrushSkeletonStore,
} from "../features/annotations/enhancers/brushSkeletonStore";
import { ModeStoreContext, createModeStore } from "../platform/stores/modeStore";
import {
  MeshDesignStoreContext,
  createMeshDesignStore,
} from "../features/meshDesign/store/meshDesignStore";
import {
  RoiDrawSessionStoreContext,
  createRoiDrawSessionStore,
} from "../features/annotations/roiDrawSessionStore";
import {
  RoiDrawingStoreContext,
  createRoiDrawingStore,
} from "../features/annotations/roiDrawingStore";
import {
  RoiSelectionStoreContext,
  createRoiSelectionStore,
} from "../features/annotations/roiSelectionStore";
import { SceneStoreContext, createSceneStore } from "../platform/stores/sceneStore";
import {
  SelectionStoreContext,
  createSelectionStore,
} from "../platform/stores/selectionStore";
import { ViewStoreContext, createViewStore } from "../platform/stores/viewStore";
import { ViewerStoreContext, createViewerStore } from "../platform/stores/viewerStore";
import { createBrickSlice } from "../features/bricks/store/brickSlice";
import { createMeshSlice } from "../features/meshes/store/meshSlice";
import { createNetworkSlice } from "../features/network/store/networkSlice";
import { SceneBrandTheme } from "./theme/SceneBrandTheme";
import { coldOpenTimeline } from "../platform/perf/coldOpenTimeline";
import {
  SceneScopeStatusContext,
  type SceneScopeStatus,
} from "../platform/stores/sceneScope";

// The scope-readiness contract lives in platform/ so features can gate on it
// without importing the shell; re-exported here because this is the module
// that publishes the value.
export {
  SceneGuard,
  useSceneScopeStatus,
  type SceneScopeStatus,
} from "../platform/stores/sceneScope";

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
 * Builds the scene's store scope and provides it WITHOUT owning any layout —
 * so a page can wrap its whole ModelPage in it and compose scene panels into
 * places the old all-in-one Scene component could never reach (the page's
 * right-rail sidebar is a sibling panel of the content area).
 *
 * The store contexts are ALWAYS mounted, with null values until the scope is
 * ready: if the provider chain only appeared on readiness, the null→ready
 * transition would change every descendant's parent chain and remount the
 * entire page around it. Consumers are gated by `SceneGuard`, not by the
 * providers' presence.
 *
 * `scene` may be null ("no scene selected" — e.g. a dataset without scenes);
 * the scope build is skipped and the status says so.
 *
 * ## Rebuild contract — two tiers
 *
 * 1. **Rebuild** (`sceneScopeSignature`: scene id, world coordinate system).
 *    A different scene, or a different world frame, is a different scope: the
 *    stores are rebuilt and `SceneGuard` remounts everything under them.
 * 2. **Reconcile** (`sceneLayerSignature`: which layers, in which order,
 *    placed how). The layer set is DYNAMIC — the server mints an
 *    `AnnotationLayer` on a scene's first annotation, layers are added and
 *    deleted, registrations are refined — and none of that may tear the scope
 *    down. The reconcile effect below opens any newly referenced zarr arrays
 *    and folds the new layer set into the LIVE stores while the canvas keeps
 *    rendering.
 * 3. **Ignore** (everything else). Content mutations fold their results into
 *    the stores at their call sites and MUST keep doing so — the provider
 *    deliberately ignores the fragment-identity churn they cause.
 *
 * THE load-bearing invariant: `status.phase` is computed from the SCOPE
 * signature ALONE. The layer signature schedules a reconcile and never gates
 * readiness — the moment a layer change can push `phase` back to
 * "initializing", `SceneViewport` swaps in its fallback frame, the `<Canvas>`
 * unmounts, and the WebGPU renderer plus every brick atlas are disposed. That
 * full reload on the first annotation is exactly what the split exists to kill.
 */
export const SceneProvider = (props: {
  scene: SceneFragment | null | undefined;
  children: ReactNode;
}) => {
  const client = useMikro();
  const datalayer = useDatalayerEndpoint();
  const scene = props.scene ?? null;

  // The rebuild key. Content-only cache re-emissions (a saved render graph, a
  // pinned view, a new animation) and layer-set changes alike leave this
  // string alone, so neither tears the scope down.
  const scopeSignature = useMemo(
    () => (scene ? sceneScopeSignature(scene) : null),
    [scene],
  );
  // The reconcile key. Never read by `status` — see the invariant above.
  const layerSignature = useMemo(
    () => (scene ? sceneLayerSignature(scene) : null),
    [scene],
  );

  // The effects key on signatures, not the fragment, so they must read the
  // CURRENT fragment through a ref — a build or fold uses whatever data is
  // live when it runs.
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // `built` remembers WHICH scope it is, and WHICH layer set is currently
  // folded into it. Between a structural change and the rebuild effect firing
  // there is one commit where the old scope still exists — matching signatures
  // keep the status honest ("initializing", never "ready with the wrong
  // stores") through that window.
  //
  // `layerSignature` lives here rather than in a ref on purpose: deriving the
  // reconcile trigger from state is what makes a second refetch landing
  // mid-fold self-heal (the stamp won't match, so the effect simply runs
  // again) instead of being dropped.
  const [built, setBuilt] = useState<{
    scopeSignature: string;
    layerSignature: string;
    scope: SceneScope;
  } | null>(null);
  const [failure, setFailure] = useState<{
    scopeSignature: string;
    error: Error;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initializeSceneScope = async () => {
      setBuilt(null);
      setFailure(null);
      const scene = sceneRef.current;
      if (!scene || !scopeSignature) return;
      // Stamped from the fragment we are actually building, not the
      // render-time memo — they can differ if a refetch landed in between.
      const builtLayerSignature = sceneLayerSignature(scene);

      try {
        // Gate before anything expensive: a scene without WebGPU cannot render
        // at all, so fail here rather than mount a Canvas that would silently
        // downgrade itself to a backend we no longer support.
        await assertWebGPUSupported();
        coldOpenTimeline.stamp("webgpuDevice");

        if (!datalayer) {
          throw new Error("No datalayer endpoint configured");
        }

        // Opening the scene's zarr arrays belongs to the provider: the store
        // is a state container, not a fetcher. Stamped here so the cold-open
        // timeline still sees the same moment it used to.
        const storesById = await createConfiguredSceneStores(scene, client, datalayer);
        const arraysByStoreId = await openSceneArrays(storesById);
        coldOpenTimeline.stamp("arraysOpen");

        const sceneStore = createSceneStore({ scene });
        // Both the opening view and the pose frame are facts about the scene AS
        // LOADED, so they are resolved from the normalized layers the scene
        // store just built rather than re-derived per consumer.
        const layers = sceneStore.getState().layers;

        const scope: SceneScope = {
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

        if (!cancelled) {
          setBuilt({
            scopeSignature,
            layerSignature: builtLayerSignature,
            scope,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setFailure({
            scopeSignature,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    };

    initializeSceneScope();

    return () => {
      cancelled = true;
    };
  }, [scopeSignature, client, datalayer]);

  // `status.scene` is always the LIVE fragment: content the viewport reads
  // reactively (backgroundColor, …) keeps updating without a rebuild.
  //
  // Note what is NOT here: `layerSignature`. A pending layer fold must never
  // move `phase` off "ready" — see the invariant in the block comment above.
  const status: SceneScopeStatus = !scene
    ? { phase: "no-scene", scene: null, error: null }
    : failure && failure.scopeSignature === scopeSignature
      ? { phase: "error", scene, error: failure.error }
      : built && built.scopeSignature === scopeSignature
        ? { phase: "ready", scene, error: null }
        : { phase: "initializing", scene, error: null };

  const scope = status.phase === "ready" ? built!.scope : null;

  // Fold a changed layer set into the live stores. Only ever runs against a
  // ready scope for the CURRENT scene; a layer change that arrives while the
  // scope is still building needs nothing, because the build reads the live
  // fragment and stamps that fragment's layer signature.
  const needsReconcile =
    !!scope && !!built && built.layerSignature !== layerSignature;

  useEffect(() => {
    if (!needsReconcile || !scope || !built) return;
    let cancelled = false;
    let retryTimer: number | undefined;

    const foldLayers = (source: SceneFragment) => {
      const { removedLayerIds } = scope.sceneStore
        .getState()
        .syncSceneLayers(source.layers);

      // Prune what pointed AT a layer that just left. Done here rather than in
      // the card that deletes, so every removal path is covered — the layer
      // panel's trash, a server-side delete, a future subscription.
      if (removedLayerIds.length > 0) {
        // A probe pinned to a departed layer would keep naming it. Unpinning
        // also clears a probe that no longer resolves (`probeAfterPinChange`).
        const viewer = scope.viewerStore.getState();
        if (viewer.probeLayerId && removedLayerIds.includes(viewer.probeLayerId)) {
          viewer.setProbeLayerId(null);
        }
        // A selection outliving its layer would keep describing a shape that
        // is no longer in the scene.
        scope.roiSelectionStore.getState().dropLayerSelections(removedLayerIds);
      }
      // Stamp what we actually folded. If a newer fragment arrived meanwhile,
      // this won't match the render-time signature, `needsReconcile` stays
      // true, and the effect runs once more against the newest data.
      setBuilt((prev) =>
        prev && prev.scope === scope
          ? { ...prev, layerSignature: sceneLayerSignature(source) }
          : prev,
      );
    };

    const reconcile = async () => {
      // The fragment we open arrays for and the one we fold must be the SAME
      // object, or the stamp would describe something that is not in the store.
      const source = sceneRef.current;
      if (!source || sceneScopeSignature(source) !== built.scopeSignature) return;

      let failedStoreIds: string[] = [];
      if (datalayer) {
        try {
          const opened = await openMissingSceneArrays({
            scene: source,
            client,
            datalayer,
            isOpen: scope.viewerStore.getState().hasArrayForStoreId,
          });
          if (cancelled) return;
          // Arrays BEFORE layers: the fold is what wakes the planner.
          scope.viewerStore.getState().registerArrays(opened.arrays);
          failedStoreIds = opened.failedStoreIds;
        } catch (error) {
          if (cancelled) return;
          // Never blanks the scene: fold the layers anyway (see
          // `openMissingSceneArrays`' partial-tolerance contract).
          console.warn("[scene] reconcile could not open zarr arrays", error);
        }
      }

      foldLayers(source);

      if (failedStoreIds.length > 0) {
        console.warn("[scene] zarr open failed on reconcile", failedStoreIds);
        // Nothing else would ever retry these: the planner only replans when
        // the layers array identity moves. One bounded retry, then republish
        // the same layers to trigger it.
        retryTimer = window.setTimeout(() => {
          void (async () => {
            const retrySource = sceneRef.current;
            if (cancelled || !retrySource || !datalayer) return;
            try {
              const retried = await openMissingSceneArrays({
                scene: retrySource,
                client,
                datalayer,
                isOpen: scope.viewerStore.getState().hasArrayForStoreId,
              });
              if (cancelled || retried.arrays.size === 0) return;
              scope.viewerStore.getState().registerArrays(retried.arrays);
              scope.sceneStore.getState().touchImageLayers();
            } catch (error) {
              console.warn("[scene] zarr reopen retry failed", error);
            }
          })();
        }, 2000);
      }
    };

    void reconcile();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
    };
  }, [needsReconcile, scope, built, layerSignature, client, datalayer]);

  return (
    <SceneScopeStatusContext.Provider value={status}>
      <ModeStoreContext.Provider value={scope?.modeStore ?? null}>
        <ViewStoreContext.Provider value={scope?.viewStore ?? null}>
          <ViewerStoreContext.Provider value={scope?.viewerStore ?? null}>
            <SelectionStoreContext.Provider value={scope?.selectionStore ?? null}>
              <SceneStoreContext.Provider value={scope?.sceneStore ?? null}>
                <AnimationStoreContext.Provider value={scope?.animationStore ?? null}>
                  <RoiDrawingStoreContext.Provider value={scope?.roiDrawingStore ?? null}>
                    <RoiDrawSessionStoreContext.Provider value={scope?.roiDrawSessionStore ?? null}>
                      <RoiSelectionStoreContext.Provider value={scope?.roiSelectionStore ?? null}>
                       <BrushSkeletonStoreContext.Provider value={scope?.brushSkeletonStore ?? null}>
                       <MeshDesignStoreContext.Provider value={scope?.meshDesignStore ?? null}>
                        {/* Reads the scene stores, so it can only mount once
                            the scope exists — and unmounting it when the scope
                            goes is exactly what eases the app back to the
                            user's own brand color. */}
                        {scope && <SceneBrandTheme />}
                        {/* Shared (client, datalayer) attribute service: the
                            probe tracker holds the same refcounted instance, so
                            ROI lookups reuse its plan cache and DuckDB engine.
                            Needs no scene stores, so it mounts unconditionally. */}
                        <AttributeServiceProvider>
                          {props.children}
                        </AttributeServiceProvider>
                       </MeshDesignStoreContext.Provider>
                       </BrushSkeletonStoreContext.Provider>
                      </RoiSelectionStoreContext.Provider>
                    </RoiDrawSessionStoreContext.Provider>
                  </RoiDrawingStoreContext.Provider>
                </AnimationStoreContext.Provider>
              </SceneStoreContext.Provider>
            </SelectionStoreContext.Provider>
          </ViewerStoreContext.Provider>
        </ViewStoreContext.Provider>
      </ModeStoreContext.Provider>
    </SceneScopeStatusContext.Provider>
  );
};
