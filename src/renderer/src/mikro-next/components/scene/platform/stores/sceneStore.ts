import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";
import { AxisType, PreferredView, SceneFragment, SceneLayerFragment } from "@/mikro-next/api/graphql";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";
import { sameDimExtents, type DimExtent } from "../model/dimExtents";
import { isBrickLayer, type BrickLayerFragment } from "../model/layerGuards";
import { reconcileSceneLayers } from "../model/layerReconcile";
import { layerStructureKey } from "../model/sceneStructure";
import {
  applyPlacementPreview,
  prunePreviewBases,
  type PreviewPlacement,
} from "../model/placementPreview";
import {
  normalizeBrickLayer,
  type LayerState,
  type SceneTransformContext,
} from "../model/layerModel";
import { planDefaultVolumeLods } from "../quality/lodPlanning";
import { composeLayerAffine, spatialAxisTriple } from "@/mikro-next/lib/coords/transformGraph";
import type { FabriksInstanceColormap } from "../gpu/instanceColormaps";

// Re-exported for the store's many consumers (the model lives in core/).
export type { LayerState };

/**
 * Session-local render state a MESH layer carries beyond its fragment. These
 * fields have nowhere to be stored — `updateMeshLayer` accepts the layer's
 * material, its pickers and their active indices, but none of the client-side
 * render presets below — so, exactly like the card's visibility toggle, they
 * live for the session and no longer.
 */
export type MeshLayerSessionState = {
  /** Which instance colormap the collection is colored by (default "hues"). */
  instanceColormap?: FabriksInstanceColormap;
  /** Color by instance id (the DEFAULT) vs the layer's uniform materialColor.
   * Explicit rather than inferred from materialColor's presence — a layer
   * with a stored color must still be instance-colorable. */
  colorByInstance?: boolean;
  /** Per-layer LOD preset: the planner's pixel-error budget (1 / 2 / 4 px). */
  detail?: "fine" | "balanced" | "fast";
  /** Flat derivative normals (the default) vs smooth per-cell normals. */
  flatNormals?: boolean;
  /** Double-sided surfaces (the default) vs front faces only. */
  doubleSided?: boolean;
  /** 2D cross-section thickness multiplier over the scene's z-step (1/3/5). */
  slabScale?: number;
};

/**
 * Session-local render state a NETWORK layer carries beyond its fragment.
 *
 * `detail` and `slabScale` mean exactly what they mean for a mesh. The two
 * `*Override` fields exist because `showNodes` and `directed` ARE stored on the
 * layer — the override is what lets the card toggle them instantly and keep the
 * server write behind Save, so a glance at the graph never costs a round trip.
 * A null override means "use the stored value".
 */
export type NetworkLayerSessionState = {
  /** Which instance colormap the graph is colored by (default "hues"). */
  instanceColormap?: FabriksInstanceColormap;
  /** Color by instance id (the DEFAULT, the mesh layer's convention) vs the
   * layer's uniform materialColor — same field, same semantics. */
  colorByInstance?: boolean;
  /** Per-layer LOD preset: the planner's pixel-error budget. */
  detail?: "fine" | "balanced" | "fast";
  /** 2D cross-section thickness multiplier over the scene's z-step (1/3/5). */
  slabScale?: number;
  /** Session override of the stored `showNodes`. */
  showNodesOverride?: boolean;
  /** Session override of the stored `directed`. */
  directedOverride?: boolean;
};

/** A polymorphic scene layer plus its session-local render state. */
export type SceneLayer = SceneLayerFragment & MeshLayerSessionState & NetworkLayerSessionState;

export interface SceneState {
  /**
   * The scene's id. Here so a composed panel can reach it from context instead
   * of having it threaded down as a prop — the store is already the scene's
   * identity everywhere else.
   */
  id: string;
  /**
   * How the scene asks to be opened. Read only by the preference control (the
   * opening view is decided once, at mount, in `Scene.tsx`) — held here so the
   * control shows what the scene ACTUALLY says rather than only what this
   * session saved, and so a save reflects without a refetch.
   */
  preferredView: PreferredView;
  setPreferredView: (view: PreferredView) => void;
  spatialUnit: string;
  /**
   * The scene's coordinate-system graph (world CS, reachable systems, edges) —
   * what non-image layers (meshes, ROIs) compose their transforms from.
   */
  transformContext: SceneTransformContext;
  /**
   * Raw polymorphic layers (all __typenames), consumed by the render dispatch.
   *
   * NOT write-once: the layer set is dynamic (the server mints an
   * `AnnotationLayer` on a scene's first annotation, layers are added and
   * deleted), and `syncSceneLayers` folds those changes in while the scene
   * keeps rendering. Untouched layers keep their object identity across a
   * fold, so a subscription that reads one layer out of this list still
   * settles — see `platform/model/layerReconcile.ts`.
   */
  sceneLayers: SceneLayer[];
  /** Normalized BRICK-backed layers — images and label masks alike. */
  layers: LayerState[];
  updateLayer: (updatedLayer: LayerState) => void;
  /**
   * Fold a new layer set into the LIVE store, id-keyed — the alternative to
   * rebuilding the whole store scope (which unmounts the canvas and re-opens
   * every zarr array). Layers that did not structurally change keep their
   * exact objects, so session-only state and the layer-keyed caches downstream
   * survive. See `platform/model/layerReconcile.ts` for the contract.
   *
   * The world frame is deliberately NOT a parameter: it is scope-scoped (a
   * world change rebuilds the scope), so the fold composes affines against
   * this store's own `transformContext` and can never silently adopt a new
   * world.
   */
  syncSceneLayers: (
    nextLayers: readonly SceneLayerFragment[],
  ) => { addedLayerIds: string[]; removedLayerIds: string[] };
  /**
   * Republish `layers` with a NEW array reference and identical elements. The
   * only way to ask the trackers for a replan when nothing about the layers
   * changed but their zarr arrays did (a store that opened late).
   */
  touchImageLayers: () => void;
  /**
   * Patch one polymorphic scene layer in place.
   *
   * The image path has `updateLayer` because those layers are normalized into
   * `LayerState`; a mesh or annotation layer is consumed straight off the
   * fragment, so its view state is edited here.
   *
   * Two callers, two meanings. SESSION state (visibility, palette, detail) is
   * patched here and nowhere else — `updateLayer` the mutation is typed to
   * return `ImageLayer`, so it has no home on the server. STORED mesh state
   * (`colorBys`/`filterBys` and their active indices) goes through
   * `updateMeshLayer` and is folded back in here afterwards, because
   * `syncSceneLayers` keeps the previous raw object whenever a layer's
   * STRUCTURE key is unchanged — a re-emission that changed only a mesh
   * layer's content would otherwise be discarded.
   */
  /**
   * Per-track-layer tail length, in the track table's own time units.
   *
   * Session-local: `updateTrackLayer` carries the layer's line width, colouring
   * and compositing, but a tail window is a property of how you are LOOKING at
   * a trajectory rather than of the trajectory, and the server has no field for
   * it. Missing entry = `DEFAULT_TAIL_WINDOW`.
   */
  trackTailWindows: Record<string, number>;
  setTrackTailWindow: (layerId: string, window: number) => void;
  /**
   * The dims a layer OBSERVED in its data, published by its renderer once the
   * read lands. One half of the scrubber protocol (`DimExtent`); the other half
   * is DECLARED and never comes through here.
   *
   * The split is declared vs observed, not brick vs non-brick:
   *  - A lens-backed layer — image, label, vector field — states its extents in
   *    its fragment. `DimSliderPanel` derives those directly, so its sliders
   *    exist at first paint and survive a mode toggle or a budget cull. Routing
   *    them through a renderer effect would tie a fact that never changes to
   *    whether `LayerRenderer` chose to mount the layer.
   *  - A table-backed layer — tracks, points — has no lens. Its timeline is a
   *    fact about the PARQUET, unknowable until the scan returns, so it can only
   *    be published, and only from the renderer that read it.
   *
   * Null clears a layer's entry: on unmount, and while the layer is hidden — a
   * hidden layer must not keep a slider alive, which is what the panel's brick
   * half has always done by skipping `visible === false`.
   */
  layerDimExtents: Record<string, DimExtent[]>;
  setLayerDimExtents: (layerId: string, extents: DimExtent[] | null) => void;
  patchSceneLayer: (id: string, patch: Partial<SceneLayer>) => void;
  /**
   * The SERVER placements of the layers currently drawn with a placement
   * preview, by layer id. Empty when nothing is previewed. See
   * `platform/model/placementPreview.ts` and COORDINATE_SYSTEMS.md §1 R1a.
   */
  placementPreviewBases: Record<string, PreviewPlacement>;
  /**
   * Draw `layerIds` with `worldDelta` (row-major 4×4, world [x, y, z] slots)
   * applied on top of their server placement; null or identity clears. Layers
   * previewed before and not listed are restored. Session-only, never
   * persisted, and dropped by `syncSceneLayers` for any layer the server
   * re-places.
   *
   * Every member is written in ONE `set`: layers that merge into one brick
   * pass share an affine key (`mergeMembers.ts`), and moving them one by one
   * would split the bucket for a frame.
   */
  setPlacementPreview: (
    layerIds: readonly string[],
    worldDelta: readonly (readonly number[])[] | null,
  ) => { failures: { layerId: string; reason: string }[] };
}

export const createSceneStore = ({ scene }: { scene: SceneFragment }) => {
  // Every LENS-backed layer — images, label masks and the three fixed-shape
  // kinds alike: all are a Lens over an array, so all plan, pool and stream
  // through the same path (see `isBrickLayer`).
  const brickLayers = scene.layers.filter(isBrickLayer);
  const defaultVolumeLods = planDefaultVolumeLods(brickLayers);

  // Units are per-axis on the world coordinate system now (the scene-level
  // `spatialUnit` enum is gone); the scale bar shows the first spatial axis'.
  const spaceAxis = scene.worldCoordinateSystem?.axes.find((axis) => axis.type === AxisType.Space);

  return createStore<SceneState>()(
    immer((set, get) => ({
      id: scene.id,
      preferredView: scene.preferredView,
      setPreferredView: (view) =>
        set((state) => {
          state.preferredView = view;
        }),
      // A pixel-grid world has NO unit on its axes (`Axis.unit` is null there
      // by contract), so everything downstream (scale bar, draw readouts)
      // shows "px" rather than claiming a physical unit that was never
      // measured.
      spatialUnit: String(spaceAxis?.unit ?? "").trim() || "px",
      // No `coordinateSystems` or `registrations`: edges self-describe their
      // axis order (inputAxes/outputAxes) and placement comes from each
      // layer's pathToWorld, so the fragment ships neither global list.
      transformContext: {
        worldCoordinateSystem: scene.worldCoordinateSystem,
      },
      trackTailWindows: {},
      layerDimExtents: {},
      placementPreviewBases: {},
      setPlacementPreview: (layerIds, worldDelta) => {
        const { sceneLayers, layers, placementPreviewBases, transformContext } = get();
        const worldSpatial = spatialAxisTriple(transformContext.worldCoordinateSystem);
        const result = applyPlacementPreview<SceneLayer, LayerState>({
          sceneLayers,
          layers,
          bases: placementPreviewBases,
          layerIds,
          worldDelta,
          worldSpatial,
          // Exact for lens-backed layers (the triple `composeLayerAffine`
          // reduces with). Every other kind assumes its data names its
          // spatial axes like the world does — only consulted when the delta
          // leaves the axes a PARTIAL placement constrains, where a
          // differently-named 3D collection would preview flattened.
          dataSpatialOf: (layer) =>
            isBrickLayer(layer)
              ? [layer.lens.renderAxes.x, layer.lens.renderAxes.y, layer.lens.renderAxes.z]
              : worldSpatial,
          placeImage: (state, placement) => {
            const asAffine = placement as unknown as LayerState["asAffine"];
            return {
              ...state,
              asAffine,
              affineMatrix: composeLayerAffine(transformContext, { ...state, asAffine }),
            };
          },
        });
        // The PLAIN-OBJECT form, as in `syncSceneLayers`: untouched layers
        // keep their identity, which the immer finalizer would not preserve.
        if (result.changed) {
          set({
            sceneLayers: result.sceneLayers,
            layers: result.layers,
            placementPreviewBases: result.bases,
          });
        }
        return { failures: result.failures };
      },
      sceneLayers: scene.layers,
      layers: brickLayers.map((layer) =>
        normalizeBrickLayer(layer, defaultVolumeLods.get(layer.id) ?? null, scene),
      ),
      // The render graph is the single rendering truth: transfer edits flow
      // graph → store (RenderGraphSection derives the flat clim/colormap
      // fields from the primary channel). No caller writes flat fields
      // directly, so no fold-back is needed here.
      updateLayer: (updatedLayer) =>
        set((state) => {
          const index = state.layers.findIndex((layer) => layer.id === updatedLayer.id);
          if (index !== -1) {
            state.layers[index] = updatedLayer;
          }
        }),
      setTrackTailWindow: (layerId, window) =>
        set((state) => {
          state.trackTailWindows[layerId] = window;
        }),
      setLayerDimExtents: (layerId, extents) =>
        set((state) => {
          // Guard the no-op STRUCTURALLY, not by identity: this is written from
          // an effect on every geometry reload, and the publisher rebuilds the
          // array each run, so a fresh array of identical entries would replace
          // the record and re-run every selector reading it (P17).
          if (extents === null || extents.length === 0) {
            if (layerId in state.layerDimExtents) delete state.layerDimExtents[layerId];
            return;
          }
          const current = state.layerDimExtents[layerId];
          if (current && sameDimExtents(current, extents)) return;
          state.layerDimExtents[layerId] = extents;
        }),
      patchSceneLayer: (id, patch) =>
        set((state) => {
          const index = state.sceneLayers.findIndex((layer) => layer.id === id);
          if (index !== -1) {
            Object.assign(state.sceneLayers[index], patch);
          }
        }),
      syncSceneLayers: (nextLayers) => {
        const { sceneLayers, layers, transformContext } = get();
        const result = reconcileSceneLayers<SceneLayer, SceneLayer & BrickLayerFragment, LayerState>({
          previousSceneLayers: sceneLayers,
          previousLayers: layers,
          nextLayers: nextLayers as readonly SceneLayer[],
          // Named `isImage` by the generic; what it MEANS is "normalize this
          // one into `layers`", which is every brick-backed layer.
          isImage: (layer): layer is SceneLayer & BrickLayerFragment => isBrickLayer(layer),
          structureKey: layerStructureKey,
          planDefaultLods: (bricks) => planDefaultVolumeLods(bricks as BrickLayerFragment[]),
          normalize: (layer, defaultVolumeLod) =>
            normalizeBrickLayer(layer, defaultVolumeLod, transformContext),
          // New objects, never a mutation of the stored one: after any earlier
          // `updateLayer`/`patchSceneLayer` the stored objects are immer-frozen.
          carryImageSession: (previous, next) => ({
            ...next,
            fixedLOD: previous.fixedLOD,
            defaultVolumeLOD: previous.defaultVolumeLOD,
            visible: previous.visible,
          }),
          // EVERY session field must be listed here. One that is omitted
          // silently resets on each scene re-emission, and nothing type-checks
          // it — the type is an intersection, so an unlisted field is merely
          // absent rather than wrong.
          carryRawSession: (previous, next) => ({
            ...next,
            instanceColormap: previous.instanceColormap,
            colorByInstance: previous.colorByInstance,
            detail: previous.detail,
            flatNormals: previous.flatNormals,
            doubleSided: previous.doubleSided,
            slabScale: previous.slabScale,
            showNodesOverride: previous.showNodesOverride,
            directedOverride: previous.directedOverride,
          }),
        });

        const summary = {
          addedLayerIds: result.addedLayerIds,
          removedLayerIds: result.removedLayerIds,
        };
        if (!result.sceneLayersChanged && !result.layersChanged) return summary;

        // A layer the fold re-derived (or dropped) carries the SERVER's
        // placement again, so its placement-preview base is stale: forget it.
        // Kept layers are exactly the ones whose stored object survived.
        const previousRaw = new Set<SceneLayer>(sceneLayers);
        const prunedBases = prunePreviewBases(
          get().placementPreviewBases,
          new Set(result.sceneLayers.filter((layer) => previousRaw.has(layer)).map((layer) => layer.id)),
        );

        // The PLAIN-OBJECT form on purpose: the immer middleware only runs
        // `produce` for function updaters, so this bypasses the finalizer.
        // Going through it would freeze/clone the reused elements and break
        // the identity preservation the reconcile exists for.
        set({
          sceneLayers: result.sceneLayers,
          layers: result.layers,
          ...(prunedBases ? { placementPreviewBases: prunedBases } : {}),
        });
        return summary;
      },
      touchImageLayers: () => set({ layers: [...get().layers] }),
    })),
  );
};

const {
  StoreContext: SceneStoreContext,
  useScopedStore: useSceneStore,
  useStoreApi: useSceneStoreApi,
} = createScopedStoreHooks<SceneState>("SceneStore");

export { SceneStoreContext, useSceneStore, useSceneStoreApi };
