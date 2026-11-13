import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { useMikro } from "@/mikro/api/funcs";
import { SceneFragment } from "@/mikro/api/graphql";
import { AttributeServiceProvider } from "@/mikro/lib/attributes/AttributeServiceProvider";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import { sceneScopeSignature } from "../platform/model/sceneStructure";
import { createSceneSession } from "./sceneSession";
import { buildSceneScope, foldSceneLayers, retryFailedArrays } from "./sceneScopeBuild";
import { AnimationStoreContext } from "../platform/stores/animationStore";
import { BrushSkeletonStoreContext } from "../features/annotations/enhancers/brushSkeletonStore";
import { ModeStoreContext } from "../platform/stores/modeStore";
import { MeshDesignStoreContext } from "../features/meshDesign/store/meshDesignStore";
import { RoiDrawSessionStoreContext } from "../features/annotations/roiDrawSessionStore";
import { RoiDrawingStoreContext } from "../features/annotations/roiDrawingStore";
import { RoiSelectionStoreContext } from "../features/annotations/roiSelectionStore";
import { SceneStoreContext } from "../platform/stores/sceneStore";
import { DisplayRemapSync } from "./DisplayRemapSync";
import { useSceneViewAxes } from "../platform/stores/sceneViewAxes";
import { SelectionStoreContext } from "../platform/stores/selectionStore";
import { ViewStoreContext } from "../platform/stores/viewStore";
import { ViewerStoreContext } from "../platform/stores/viewerStore";
import { SceneEventsContext, createSceneEvents } from "../platform/events/sceneEvents";
import { SceneInputContext, createSceneInput } from "../platform/input/sceneInput";
import { SceneBrandTheme } from "./theme/SceneBrandTheme";
import {
  SceneScopeStatusContext,
  type SceneScopeStatus,
} from "../platform/stores/sceneScope";
import { SceneFloatStoreContext, createSceneFloatStore } from "../platform/float/floatStore";
import { StagedLayersStoreContext, createStagedLayersStore } from "../platform/float/stagedLayerStore";

// The scope-readiness contract lives in platform/ so features can gate on it
// without importing the shell; re-exported here because this is the module
// that publishes the value.
export {
  SceneGuard,
  useSceneScopeStatus,
  type SceneScopeStatus,
} from "../platform/stores/sceneScope";

export type { SceneScope } from "./sceneScopeBuild";

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
 *    down. The scene session (`sceneSession.ts`) opens any newly referenced
 *    zarr arrays and folds the new layer set into the LIVE stores while the
 *    canvas keeps rendering.
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
  /**
   * Whether the app's hue follows this scene (the default). `false` for a
   * scene embedded beside others: the override is one per document.
   */
  brandTheme?: boolean;
}) => {
  const client = useMikro();
  const datalayer = useDatalayerEndpoint();
  const serverScene = props.scene ?? null;
  // One per mounted provider, for its whole life: what happens here is told to
  // whoever listens here (`platform/events/sceneEvents.ts`).
  const [events] = useState(createSceneEvents);
  // Likewise one per mounted provider: the pointer's account of itself — the
  // press ledger and the camera's "being driven" flag
  // (`platform/input/sceneInput.ts`). It outlives a scope rebuild on purpose:
  // a press does not end because the view axes changed under it.
  const [input] = useState(createSceneInput);
  // The open float and what it staged, for the SCENE's life rather than the
  // scope's: a view switch rebuilds the scope, and neither may vanish with it.
  const sceneId = serverScene?.id ?? null;
  const { floatStore, stagedStore } = useMemo(() => {
    void sceneId;
    return { floatStore: createSceneFloatStore(), stagedStore: createStagedLayersStore() };
  }, [sceneId]);
  const staged = useStore(stagedStore, (state) => state.entries);
  // The scene as drawn: the server's layers, then the staged ones. Everything
  // below — the scope build, the layer signature, the fold — reads THIS, so a
  // staged layer opens its arrays, plans and draws like a saved one, and
  // staging or discarding one is an ordinary incremental fold.
  const scene = useMemo(
    () =>
      serverScene && staged.length > 0
        ? ({ ...serverScene, layers: [...serverScene.layers, ...staged.map((entry) => entry.layer)] } as SceneFragment)
        : serverScene,
    [serverScene, staged],
  );

  // The rebuild key. Content-only cache re-emissions (a saved render graph, a
  // pinned view, a new animation) and layer-set changes alike leave this
  // string alone, so neither tears the scope down.
  const scopeSignature = useMemo(
    () => (scene ? sceneScopeSignature(scene) : null),
    [scene],
  );
  // The plane the scene is looked at in. Every layer's axes and lattice are
  // derived from it (`viewLayer`), so a change rebuilds the scope like a
  // structural change does; it is its own key so the layer fold below, which
  // compares structure signatures, is untouched by it.
  const viewAxes = useSceneViewAxes(scene?.id);
  const viewKey = viewAxes.join("");

  // The lifecycle itself — build a scope, fold a changed layer set into it,
  // retry arrays that would not open — is the scene session's
  // (`sceneSession.ts`). It is handed the scene as it is on EVERY change and
  // decides what, if anything, that change means; nothing here keys an effect
  // on a signature or reads the fragment through a ref.
  const [session] = useState(() =>
    createSceneSession({
      build: buildSceneScope,
      fold: foldSceneLayers,
      retry: retryFailedArrays,
    }),
  );
  useEffect(() => {
    session.update({ scene, viewAxes, viewKey, client, datalayer });
  }, [session, scene, viewAxes, viewKey, client, datalayer]);
  useEffect(() => () => session.dispose(), [session]);
  // `built` says WHICH scope it is. Between a structural change and the
  // session hearing of it there is one commit where the old scope still
  // exists — the signature compare below keeps the status honest
  // ("initializing", never "ready with the wrong stores") through it.
  const { built, failure } = useSyncExternalStore(session.subscribe, session.getSnapshot);

  // `status.scene` is always the LIVE fragment: content the viewport reads
  // reactively (backgroundColor, …) keeps updating without a rebuild.
  //
  // Note what is NOT here: the layer set. A pending layer fold must never
  // move `phase` off "ready" — see the invariant in the block comment above
  // (the session does not even publish one).
  const status: SceneScopeStatus = !scene
    ? { phase: "no-scene", scene: null, error: null }
    : failure && failure.scopeSignature === scopeSignature
      ? { phase: "error", scene, error: failure.error }
      : built && built.scopeSignature === scopeSignature && built.viewKey === viewKey
        ? { phase: "ready", scene, error: null }
        : { phase: "initializing", scene, error: null };

  const scope = status.phase === "ready" ? built!.scope : null;

  return (
    <SceneEventsContext.Provider value={events}>
    <SceneInputContext.Provider value={input}>
    <SceneFloatStoreContext.Provider value={floatStore}>
    <StagedLayersStoreContext.Provider value={stagedStore}>
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
                        {scope && props.brandTheme !== false && <SceneBrandTheme />}
                        {scope && <DisplayRemapSync />}
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
    </StagedLayersStoreContext.Provider>
    </SceneFloatStoreContext.Provider>
    </SceneInputContext.Provider>
    </SceneEventsContext.Provider>
  );
};
