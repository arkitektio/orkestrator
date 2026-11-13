import { useCallback, useEffect, useMemo, useRef } from "react";
import { selectionsFor } from "../../../platform/model/worldSelections";
import * as THREE from "three";


import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { finestLayerZStep } from "../../../platform/coords/worldTransform";
import { layersPlanKey } from "../../../platform/model/layerPlanKey";
import { annotationHoverEnabled, annotationSelectEnabled } from "../../../platform/probe/probeGating";
import { useModeStore, useModeStoreApi } from "../../../platform/stores/modeStore";
import { usePressLedger } from "../../../platform/input/sceneInput";
import { DOUBLE_PRESS_MS } from "../../../platform/input/navigationBindings";
import { useSceneStore, useSceneStoreApi } from "../../../platform/stores/sceneStore";
import { useViewerStore } from "../../../platform/stores/viewerStore";
import {
  isAnnotationInView,
  sceneCoverages,
  type ScenePlane,
} from "../annotationVisibility";
import {
  resolveCollectionMatrix,
  type AnnotationCollectionRef,
  type AnnotationLayerVariant,
} from "../annotationBounds";
import {
  buildOutlineBatches,
  buildSectionedOutlineBatches,
  drawsOwnMesh,
  isSectionedEllipse,
} from "../annotationBatch";
import {
  buildInteriorBatches,
  sectionedInteriorTriangles,
  staticInteriorTriangles,
} from "../interiorBatch";
import { useSceneAnnotations } from "../sceneVectors";
import { prunedSelections, repairedSelections } from "../selectionRepair";
import { useLiveSceneAnnotations } from "../../../../../lib/annotations/useLiveSceneAnnotations";
import {
  isDrawingTool,
  PERSISTED_PREVIEW_TIMEOUT_MS,
  useRoiDrawingStore,
  useRoiDrawingStoreApi,
} from "../roiDrawingStore";
import {
  useRoiSelectionStore,
  useRoiSelectionStoreApi,
  type HoverPoint,
  type SelectedRoi,
} from "../roiSelectionStore";
import { AnnotationInteriorBatch } from "./AnnotationInteriorBatch";
import { AnnotationOutlineBatch } from "./AnnotationOutlineBatch";
import { AnnotationPoints } from "./AnnotationPoints";
import { AnnotationShape } from "./AnnotationShape";
import { DERIVED_HALO, SelectionHalo, concatSegments } from "./SelectionHalo";
import { descendantsOf, partitionDerived } from "../../../../../lib/annotations/derivedShapes";
import {
  partitionEntries,
  placeAnnotations,
  pointGroupsOf,
  sameEntries,
  shownEntries,
  type PlacedEntry,
  type PlacementIdentity,
} from "./placedAnnotations";

/**
 * AnnotationLayer renderer: the drawn shapes of one AnnotationCollection.
 *
 * The collection — not the scene, and not a dataset — owns the coordinate
 * system the vectors live in, so the layer's server-resolved `pathToWorld` is
 * the one placement question with an answer here (COORDINATE_SYSTEMS.md §0).
 *
 * ## The cadence contract (what each event is allowed to cost)
 * - **nothing happened**: nothing. The list is fetched once and never polled;
 *   it changes only when a draw, a delete or (layer set to "live") a
 *   subscription event is written into its cache entry (`annotationCache.ts`).
 * - **draw / delete / live event**: re-place ONLY the changed rows
 *   (`placedAnnotations`' per-row cache keeps every other entry, and with it
 *   every other `AnnotationShape`'s memo).
 * - **z-scrub tick** (pointer cadence): re-filter `shown`; the SECTIONED
 *   batches (outline + interior of the depth-bearing ellipsoids, the only
 *   plane-dependent geometry) rebuild over those shapes alone; the static
 *   batches and the instanced points SKIP (plane-independent geometry;
 *   value-equal entry lists); the visible-ROI store write is identity-gated.
 * - **selection click**: 3D mesh shapes with changed `isActive` re-render;
 *   batches re-tint (color-only pass, no geometry upload).
 * - **a new shape starts or ends** (`shapeInProgress`): the same color-only
 *   pass, gray and back, and every pick handler detaches (P20).
 */
export const AnnotationLayerRenderer = ({ layerId }: { layerId: string }) => {
  const layer = useSceneStore((s) => s.sceneLayers.find((candidate) => candidate.id === layerId));
  if (!layer || layer.__typename !== "AnnotationLayer") return null;
  const collection = layer.annotationCollection;
  if (!collection) return null;
  return (
    <>
      {/* Outside the visibility gate: a hidden live layer keeps its list (and
          with it the card's counts and the panel) current. */}
      {layer.liveAnnotations && <LiveAnnotations collectionId={collection.id} />}
      {layer.visible !== false && (
        <AnnotationCollectionGroup
          layer={layer}
          collection={collection}
          layerId={layerId}
          showDerived={layer.showDerivedAnnotations === true}
        />
      )}
    </>
  );
};

/** Mounted only while the layer is set to "live" — see the hook. */
const LiveAnnotations = ({ collectionId }: { collectionId: string }) => {
  useLiveSceneAnnotations(collectionId);
  return null;
};

const AnnotationCollectionGroup = ({
  layer,
  collection,
  layerId,
  showDerived,
}: {
  layer: AnnotationLayerVariant;
  collection: AnnotationCollectionRef;
  layerId: string;
  /** The layer's session flag (`SceneLayer.showDerivedAnnotations`). */
  showDerived: boolean;
}) => {
  perfMonitor.countRender("AnnotationCollectionGroup"); // no-op unless a recording is armed
  const transformContext = useSceneStore((s) => s.transformContext);
  const sceneStoreApi = useSceneStoreApi();
  // A SCALAR key, not the array (P9c/P17): the coverage/plane math below reads
  // only fields `layerPlanSignature` captures (visible, zAxis/axis mapping,
  // lens shape, placement — see annotationVisibility.ts / finestLayerZStep),
  // so a contrast drag's per-tick layer replacement must not re-filter every
  // annotation. The memos read the array via `getState()` under this key.
  const imageLayersKey = useSceneStore((s) => layersPlanKey(s.layers));
  const imageLayers = useMemo(
    () => sceneStoreApi.getState().layers,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [imageLayersKey, sceneStoreApi],
  );
  const dimSelections = useViewerStore((s) => s.dimSelections);
  const worldSelections = useViewerStore((s) => s.worldSelections);
  const layerAxisInstants = useViewerStore((s) => s.layerAxisInstants);
  const currentZ = useViewerStore((s) => s.currentZ);
  // Moves once per whole wheel step while the box's depth is being set — the
  // z-scrub's cadence, which this component already follows through `currentZ`.
  const cropBox = useViewerStore((s) => s.cropBox);
  const displayMode = useModeStore((s) => s.displayMode);
  const interactionMode = useModeStore((s) => s.interactionMode);
  const selectedRois = useRoiSelectionStore((s) => s.selectedRois);
  const selectOnlyRoi = useRoiSelectionStore((s) => s.selectOnlyRoi);
  const toggleSelectedRoi = useRoiSelectionStore((s) => s.toggleSelectedRoi);
  const openRoiMenu = useRoiSelectionStore((s) => s.openRoiMenu);
  const removeSelectedRoi = useRoiSelectionStore((s) => s.removeSelectedRoi);
  const setVisibleLayerRois = useRoiSelectionStore((s) => s.setVisibleLayerRois);
  const clearVisibleLayerRois = useRoiSelectionStore((s) => s.clearVisibleLayerRois);
  const hoverRoi = useRoiSelectionStore((s) => s.hoverRoi);
  const unhoverRoi = useRoiSelectionStore((s) => s.unhoverRoi);
  // The hovered shape's id when it is THIS layer's, else null: a primitive, so
  // a hover on another layer re-renders nothing here, and one on this layer
  // re-renders it on enter/leave only (the highlight is a color-only pass).
  const hoveredId = useRoiSelectionStore((s) =>
    s.hoveredRoi?.layerId === layerId ? s.hoveredRoi.id : null,
  );
  // A scalar (P17): only the drawing/not-drawing answer gates the hover.
  const drawingToolActive = useRoiDrawingStore((s) => isDrawingTool(s.activeTool));
  // A scalar too, moving per click: a half-drawn shape grays out and disarms
  // every other one. The drawer's plane gets every click until it is finished.
  const shapeInProgress = useRoiDrawingStore((s) => s.shapeInProgress);

  const annotations = useSceneAnnotations(collection.id);

  // Shapes made from other shapes of this collection are hidden unless the
  // layer shows them, and drawn as an overlay over the shape whose card is
  // open (`lib/annotations/derivedShapes`). `placed` keeps every shape: the
  // selection repair and the overlay both read it.
  const derivedPartition = useMemo(() => partitionDerived(annotations ?? []), [annotations]);
  const hiddenIds = useMemo(
    () => (showDerived || derivedPartition.derived.length === 0 ? null : new Set(derivedPartition.derived.map((annotation) => annotation.id))),
    [showDerived, derivedPartition],
  );
  // Primitives: a card opening on another layer re-renders nothing here. Of
  // what was made from the card's shape, only what its Derived menu turned on
  // is drawn — nothing until one is.
  const cardId = useRoiSelectionStore((s) => (s.cardRoi?.layerId === layerId ? s.cardRoi.id : null));
  const cardShownKey = useRoiSelectionStore((s) => (s.cardRoi?.layerId === layerId ? s.cardShown.join("|") : ""));
  const overlayIds = useMemo(() => {
    if (!hiddenIds || !cardId || !cardShownKey) return null;
    const shown = new Set(cardShownKey.split("|"));
    return new Set(
      descendantsOf(cardId, derivedPartition.childrenOf)
        .map((annotation) => annotation.id)
        .filter((id) => shown.has(id)),
    );
  }, [hiddenIds, cardId, cardShownKey, derivedPartition]);

  const affineMatrix = useMemo(
    () => resolveCollectionMatrix(layer, collection, transformContext),
    [collection, layer, transformContext],
  );
  /** Inverted once per placement change, NOT per z-scrub tick. */
  const affineInverse = useMemo(() => affineMatrix.clone().invert(), [affineMatrix]);


  // Lookup identity for the selection store — ONE stable object, the
  // placement cache's second key.
  const systemId = collection.coordinateSystem.id ?? null;
  const identity = useMemo(
    (): PlacementIdentity => ({
      layerId,
      systemId,
      axisNames: (collection.coordinateSystem.axes ?? []).map((axis) => axis.name),
    }),
    [layerId, systemId, collection],
  );

  const flattenToPlane = displayMode !== "3D";

  /** What the scene is showing, in the terms an annotation is pinned in. */
  const coverages = useMemo(
    () =>
      sceneCoverages(
        imageLayers,
        (layerId) => selectionsFor({ dimSelections, worldSelections, layerAxisInstants }, layerId),
        flattenToPlane ? currentZ : null,
      ),
    [imageLayers, dimSelections, worldSelections, layerAxisInstants, flattenToPlane, currentZ],
  );

  /**
   * The slab the flat view draws. Thickness is the FINEST layer's own z step
   * (`finestLayerZStep`) — a scene-wide average let one sparse stack grant
   * every annotation dozens of slices of slack. Null in 3D and in scenes
   * whose layers have no z stack.
   */
  const plane = useMemo((): ScenePlane | null => {
    if (!flattenToPlane) return null;
    const step = finestLayerZStep(imageLayers);
    return step !== null ? { z: currentZ, slabThickness: step } : null;
  }, [flattenToPlane, imageLayers, currentZ]);

  /** The drawn slice in the COLLECTION's space (see `physicalToVoxelZ`). */
  const planeZLocal = useMemo(() => {
    if (!plane) return null;
    return new THREE.Vector3(0, 0, plane.z).applyMatrix4(affineInverse).z;
  }, [affineInverse, plane]);

  /**
   * Every shape placed in the world once — cached PER ROW, so a list change
   * re-places only what changed and everything downstream keeps identity.
   */
  const placed = useMemo(
    () => placeAnnotations(annotations ?? [], affineMatrix, identity),
    [annotations, affineMatrix, identity],
  );

  /**
   * On screen now. One list for the draw AND the rubber band. Value-stable
   * (`shownEntries`): a scrub tick that keeps the same entries keeps the same
   * array, so the partition and the outline batches below skip.
   */
  const shown = useMemo(
    () =>
      shownEntries(placed, (entry) =>
        !hiddenIds?.has(entry.annotation.id) &&
        isAnnotationInView(
          {
            coordinates: entry.annotation.coordinates,
            zSpan: entry.zSpan,
            bounds: entry.bounds,
          },
          { coverages, plane, cropBox },
        ),
      ),
    [placed, coverages, plane, cropBox, hiddenIds],
  );

  /** What was made from the shape whose card is open, where it is in view. Drawn, never picked. */
  const overlayPositions = useMemo(() => {
    if (!overlayIds || overlayIds.size === 0) return null;
    const entries = placed.filter(
      (entry) =>
        overlayIds.has(entry.annotation.id) &&
        isAnnotationInView({ coordinates: entry.annotation.coordinates, zSpan: entry.zSpan, bounds: entry.bounds }, { coverages, plane, cropBox }),
    );
    if (entries.length === 0) return null;
    const batches = [
      ...buildOutlineBatches(entries, flattenToPlane),
      ...buildSectionedOutlineBatches(
        entries.filter((entry) => isSectionedEllipse(entry.annotation, flattenToPlane)),
        flattenToPlane,
        planeZLocal,
      ),
    ];
    return batches.length > 0 ? concatSegments(batches) : null;
  }, [overlayIds, placed, coverages, plane, cropBox, flattenToPlane, planeZLocal]);

  // Hand over from the local preview once the persisted copy is actually
  // BEING DRAWN — `shown`, not the raw query result: a copy filtered out by
  // z/pins must keep its preview (dropping on fetch made saved shapes blink
  // out of existence). The store's timeout stays as the backstop.
  const resolvePersistedRois = useRoiDrawingStore((s) => s.resolvePersistedRois);
  // The handover must also run when a confirmation LANDS, not only when the
  // list moves: the create writes its shape into this list (the mutation's
  // `update`) BEFORE `markDrawnRoiPersisted` stamps the preview, so a pass
  // keyed on the list alone saw an unstamped preview, kept it, and never
  // looked again — the preview then sat on the real shape and outlived even
  // its delete. A scalar (P17): the stamped previews this layer must resolve.
  const awaitingHandover = useRoiDrawingStore((s) =>
    s.drawnRois
      .filter((roi) => roi.persistedCollectionId === collection.id)
      .map((roi) => roi.persistedId)
      .join(","),
  );
  useEffect(() => {
    if (!annotations) return;
    const shownIds = shown.map((entry) => entry.annotation.id);
    resolvePersistedRois(collection.id, shownIds);
    if (!awaitingHandover) return;
    // The timeout is a backstop only if something checks it: a preview whose
    // copy is not shown expires on a timer, not on the next list change. Every
    // new stamp re-runs this, so the last one is the youngest.
    const timer = setTimeout(
      () => resolvePersistedRois(collection.id, shownIds),
      PERSISTED_PREVIEW_TIMEOUT_MS + 50,
    );
    return () => clearTimeout(timer);
  }, [annotations, shown, collection.id, resolvePersistedRois, awaitingHandover]);

  // This layer holds the authoritative entry for what it draws: REPAIR stale
  // selections (layer/name/kind/geometry changed elsewhere) and PRUNE ids
  // this layer owns that its query no longer returns (deleted elsewhere —
  // the ghost's own delete would reject forever).
  // Triggered by DATA (`annotations`, `placed`), not by the selection: the
  // selection is read as a snapshot, so a click does not re-walk the whole
  // placed set four times. A selection made against current data needs no
  // repair; one made against stale data is caught when the data changes.
  const mergeSelectedRois = useRoiSelectionStore((s) => s.mergeSelectedRois);
  const roiSelectionApi = useRoiSelectionStoreApi();
  useEffect(() => {
    if (!annotations) return; // never prune against an unloaded query
    const currentSelection = roiSelectionApi.getState().selectedRois;
    const rois = placed.map((entry) => entry.roi);
    const repairs = repairedSelections(currentSelection, rois);
    if (repairs.length > 0) mergeSelectedRois(repairs);
    const present = new Set(placed.map((entry) => entry.annotation.id));
    for (const id of prunedSelections(currentSelection, layerId, present)) {
      removeSelectedRoi(id);
    }
  }, [annotations, placed, roiSelectionApi, mergeSelectedRois, removeSelectedRoi, layerId]);

  // The marquee's world: written only when the SHOWN set actually changed —
  // a z-scrub tick that filtered to the same entries writes nothing.
  const lastShownRef = useRef<PlacedEntry[] | null>(null);
  useEffect(() => {
    if (sameEntries(lastShownRef.current, shown)) return;
    lastShownRef.current = shown;
    setVisibleLayerRois(
      layerId,
      shown.map((entry) => ({ ...entry.roi, bounds: entry.bounds, zSpan: entry.zSpan })),
    );
  }, [layerId, setVisibleLayerRois, shown]);
  useEffect(
    () => () => {
      clearVisibleLayerRois(layerId);
    },
    [clearVisibleLayerRois, layerId],
  );

  const modeStoreApi = useModeStoreApi();
  const ledger = usePressLedger();
  const roiDrawingApi = useRoiDrawingStoreApi();
  // Identity-stable so the memoized shapes actually skip. Answers whether the
  // click was taken; the pick surfaces stop propagation only when it was, so a
  // declined click reaches the drawer behind the shape.
  const onSelectRoi = useCallback(
    (roi: SelectedRoi, appendSelection: boolean, point?: HoverPoint): boolean => {
      // Under a shape tool (or the brush) a single click is the camera's
      // (`navigationBindings.leftPressOwner`) and picks the shape it lands
      // on, as in NAVIGATE; a press that is the TOOL's — the second of the
      // double-click that starts a shape — is the drawer's, never a pick.
      const tool = roiDrawingApi.getState().activeTool;
      const underShapeTool =
        modeStoreApi.getState().interactionMode === "ANNOTATE" &&
        tool !== null &&
        tool !== "SELECT";
      if (underShapeTool && ledger.owner() === "tool") return false;
      const pick = () => {
        if (appendSelection) {
          toggleSelectedRoi(roi);
          return;
        }
        selectOnlyRoi(roi);
        // A plain click also opens the shape's card where it landed. Not a
        // shift-click (building a selection), and not a drag that ended here
        // (no point).
        if (point) openRoiMenu(roi, point);
      };
      // Under a shape tool this click may be the double-click's first half,
      // so the pick waits out the window; the arbiter cancels it when a shape
      // starts (`cancelPendingPick`).
      if (underShapeTool) roiSelectionApi.getState().deferPick(pick, DOUBLE_PRESS_MS);
      else pick();
      return true;
    },
    [selectOnlyRoi, toggleSelectedRoi, openRoiMenu, modeStoreApi, ledger, roiDrawingApi, roiSelectionApi],
  );

  // Called per pointer move over a shape; the store dedupes by id, so the
  // state (and anything subscribed) changes on enter/leave only.
  const onHoverRoi = useCallback(
    (roi: SelectedRoi, point: HoverPoint) => hoverRoi(roi, point),
    [hoverRoi],
  );
  const onUnhoverRoi = useCallback((roiId: string) => unhoverRoi(roiId), [unhoverRoi]);

  const selectable = annotationSelectEnabled({ interactionMode, shapeInProgress });
  // Handler ATTACHMENT is the raycast gate (P20, `annotationHoverEnabled`):
  // hovering arms the shapes for R3F's per-move raycast, so only where the
  // attached action button can actually be used.
  const hoverable = selectable && annotationHoverEnabled({ interactionMode, drawingToolActive });
  const selectedRoiIds = useMemo(
    () => new Set(selectedRois.map((roi) => roi.id)),
    [selectedRois],
  );

  // Partition BEFORE styling: `others` must not depend on the selection, or
  // the outline batches below would rebuild (and re-upload) on every click —
  // which is what happened when the split and the point styling were one memo.
  const { points, others: otherShapes } = useMemo(() => partitionEntries(shown), [shown]);
  const pointGroups = useMemo(
    () => pointGroupsOf(points, (id) => selectedRoiIds.has(id), flattenToPlane, shapeInProgress),
    [points, selectedRoiIds, flattenToPlane, shapeInProgress],
  );

  // Merged outline batches (`orkestrator.annotationBatch`, read once per
  // mount). Geometry deps carry NO plane and NO selection: a scrub or a click
  // must not rebuild the collection's Float32Arrays (sectioned ellipsoids are
  // excluded; selection is a color-only pass in the batch component).
  const outlineBatches = useMemo(
    () => buildOutlineBatches(otherShapes, flattenToPlane),
    [otherShapes, flattenToPlane],
  );

  // Merged INTERIORS (the flat shapes' fill / pick surface), same deps and
  // same contract as the outline batches.
  const interiorBatches = useMemo(
    () =>
      buildInteriorBatches(otherShapes, (annotation) =>
        staticInteriorTriangles(annotation, flattenToPlane),
      ),
    [otherShapes, flattenToPlane],
  );

  // The plane-following shapes (depth-bearing ellipsoids in the flat view):
  // their ring AND interior are rebuilt per scrub — over these entries only.
  const sectionedShapes = useMemo(
    () => otherShapes.filter((entry) => isSectionedEllipse(entry.annotation, flattenToPlane)),
    [otherShapes, flattenToPlane],
  );
  const sectionedOutlines = useMemo(
    () =>
      sectionedShapes.length === 0
        ? []
        : buildSectionedOutlineBatches(sectionedShapes, flattenToPlane, planeZLocal),
    [sectionedShapes, flattenToPlane, planeZLocal],
  );
  const sectionedInteriors = useMemo(
    () =>
      sectionedShapes.length === 0
        ? []
        : buildInteriorBatches(sectionedShapes, (annotation) =>
            sectionedInteriorTriangles(annotation, flattenToPlane, planeZLocal),
          ),
    [sectionedShapes, flattenToPlane, planeZLocal],
  );

  // The selection's weight (`SelectionHalo`): the selected outlines rebuilt
  // alone, so a click never touches the batches' geometry. Not while a shape
  // is under way — everything else is muted then.
  const haloPositions = useMemo(() => {
    if (shapeInProgress || selectedRoiIds.size === 0) return null;
    const selected = otherShapes.filter((entry) => selectedRoiIds.has(entry.annotation.id));
    if (selected.length === 0) return null;
    const batches = [
      ...buildOutlineBatches(selected, flattenToPlane),
      ...buildSectionedOutlineBatches(
        selected.filter((entry) => isSectionedEllipse(entry.annotation, flattenToPlane)),
        flattenToPlane,
        planeZLocal,
      ),
    ];
    return batches.length > 0 ? concatSegments(batches) : null;
  }, [otherShapes, selectedRoiIds, shapeInProgress, flattenToPlane, planeZLocal]);

  // Only the extruded 3D boxes/ellipsoids still mount a component each.
  const meshShapes = useMemo(
    () => otherShapes.filter((entry) => drawsOwnMesh(entry.annotation, flattenToPlane)),
    [otherShapes, flattenToPlane],
  );

  if (shown.length === 0) return null;

  return (
    <group matrix={affineMatrix} matrixAutoUpdate={false}>
      {pointGroups.map(([opacity, entries]) => (
        <AnnotationPoints
          key={opacity}
          entries={entries}
          opacity={opacity}
          selectable={selectable}
          onSelectRoi={onSelectRoi}
          hoverable={hoverable}
          onHoverRoi={onHoverRoi}
          onUnhoverRoi={onUnhoverRoi}
        />
      ))}
      {outlineBatches.map((batch) => (
        <AnnotationOutlineBatch
          key={batch.lineWidth}
          batch={batch}
          muted={shapeInProgress}
          selectedIds={selectedRoiIds}
          hoveredId={hoveredId}
          selectable={selectable}
          onSelectRoi={onSelectRoi}
          hoverable={hoverable}
          onHoverRoi={onHoverRoi}
          onUnhoverRoi={onUnhoverRoi}
        />
      ))}
      {sectionedOutlines.map((batch) => (
        <AnnotationOutlineBatch
          key={`sectioned:${batch.lineWidth}`}
          batch={batch}
          muted={shapeInProgress}
          selectedIds={selectedRoiIds}
          hoveredId={hoveredId}
          selectable={selectable}
          onSelectRoi={onSelectRoi}
          hoverable={hoverable}
          onHoverRoi={onHoverRoi}
          onUnhoverRoi={onUnhoverRoi}
        />
      ))}
      {interiorBatches.map((batch) => (
        <AnnotationInteriorBatch
          key={batch.key}
          batch={batch}
          muted={shapeInProgress}
          selectedIds={selectedRoiIds}
          selectable={selectable}
          onSelectRoi={onSelectRoi}
          hoverable={hoverable}
          onHoverRoi={onHoverRoi}
          onUnhoverRoi={onUnhoverRoi}
        />
      ))}
      {sectionedInteriors.map((batch) => (
        <AnnotationInteriorBatch
          key={`sectioned:${batch.key}`}
          batch={batch}
          muted={shapeInProgress}
          selectedIds={selectedRoiIds}
          selectable={selectable}
          onSelectRoi={onSelectRoi}
          hoverable={hoverable}
          onHoverRoi={onHoverRoi}
          onUnhoverRoi={onUnhoverRoi}
        />
      ))}
      {haloPositions && <SelectionHalo positions={haloPositions} />}
      {overlayPositions && <SelectionHalo positions={overlayPositions} colors={DERIVED_HALO} />}
      {meshShapes.map(({ annotation, roi }) => (
        <AnnotationShape
          key={annotation.id}
          annotation={annotation}
          roi={roi}
          flattenToPlane={flattenToPlane}
          isActive={selectedRoiIds.has(annotation.id)}
          isHovered={hoveredId === annotation.id}
          muted={shapeInProgress}
          selectable={selectable}
          onSelectRoi={onSelectRoi}
          hoverable={hoverable}
          onHoverRoi={onHoverRoi}
          onUnhoverRoi={onUnhoverRoi}
        />
      ))}
    </group>
  );
};
