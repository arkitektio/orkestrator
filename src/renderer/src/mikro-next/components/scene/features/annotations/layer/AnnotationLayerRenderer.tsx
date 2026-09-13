import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { useGetSceneAnnotationsQuery } from "@/mikro-next/api/graphql";

import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { finestLayerZStep } from "../../../platform/coords/worldTransform";
import { layersPlanKey } from "../../../platform/model/layerPlanKey";
import { useModeStore } from "../../../platform/stores/modeStore";
import { useSceneStore, useSceneStoreApi } from "../../../platform/stores/sceneStore";
import { useViewerStore } from "../../../platform/stores/viewerStore";
import { useViewStoreApi } from "../../../platform/stores/viewStore";
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
import { buildOutlineBatches } from "../annotationBatch";
import { prunedSelections, repairedSelections } from "../selectionRepair";
import { useRoiDrawingStore } from "../roiDrawingStore";
import {
  useRoiSelectionStore,
  useRoiSelectionStoreApi,
  type SelectedRoi,
} from "../roiSelectionStore";
import { AnnotationOutlineBatch } from "./AnnotationOutlineBatch";
import { AnnotationPoints } from "./AnnotationPoints";
import { AnnotationShape } from "./AnnotationShape";
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
 * - **5 s poll, unchanged data**: nothing — Apollo preserves the root array
 *   identity, every memo skips.
 * - **poll delta / draw / delete**: re-place ONLY the changed rows
 *   (`placedAnnotations`' per-row cache keeps every other entry, and with it
 *   every other `AnnotationShape`'s memo).
 * - **z-scrub tick** (pointer cadence): re-filter `shown`; sectioned
 *   ellipsoids re-render (they draw the moving cross-section); the batches
 *   and the instanced points SKIP (plane-independent geometry; value-equal
 *   entry lists); the visible-ROI store write is identity-gated.
 * - **selection click**: shapes with changed `isActive` re-render; batches
 *   re-tint (color-only pass, no geometry upload).
 */
export const AnnotationLayerRenderer = ({ layerId }: { layerId: string }) => {
  const layer = useSceneStore((s) => s.sceneLayers.find((candidate) => candidate.id === layerId));
  if (!layer || layer.__typename !== "AnnotationLayer") return null;
  if (!layer.annotationCollection || layer.visible === false) return null;
  return (
    <AnnotationCollectionGroup
      layer={layer}
      collection={layer.annotationCollection}
      layerId={layerId}
    />
  );
};

const AnnotationCollectionGroup = ({
  layer,
  collection,
  layerId,
}: {
  layer: AnnotationLayerVariant;
  collection: AnnotationCollectionRef;
  layerId: string;
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
  const currentZ = useViewerStore((s) => s.currentZ);
  const displayMode = useModeStore((s) => s.displayMode);
  const interactionMode = useModeStore((s) => s.interactionMode);
  const selectedRois = useRoiSelectionStore((s) => s.selectedRois);
  const selectOnlyRoi = useRoiSelectionStore((s) => s.selectOnlyRoi);
  const toggleSelectedRoi = useRoiSelectionStore((s) => s.toggleSelectedRoi);
  const removeSelectedRoi = useRoiSelectionStore((s) => s.removeSelectedRoi);
  const setVisibleLayerRois = useRoiSelectionStore((s) => s.setVisibleLayerRois);
  const clearVisibleLayerRois = useRoiSelectionStore((s) => s.clearVisibleLayerRois);

  const viewApi = useViewStoreApi();
  const { data } = useGetSceneAnnotationsQuery({
    variables: {
      filters: { collection: collection.id },
    },
    pollInterval: 5000,
    // A poll landing mid-gesture re-renders and re-diffs the whole annotation
    // subtree while the user is dragging; skip those attempts.
    skipPollAttempt: () => viewApi.getState().cameraMoving,
  });

  const affineMatrix = useMemo(
    () => resolveCollectionMatrix(layer, collection, transformContext),
    [collection, layer, transformContext],
  );
  /** Inverted once per placement change, NOT per z-scrub tick. */
  const affineInverse = useMemo(() => affineMatrix.clone().invert(), [affineMatrix]);

  const annotations = data?.annotations;

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
    () => sceneCoverages(imageLayers, dimSelections, flattenToPlane ? currentZ : null),
    [imageLayers, dimSelections, flattenToPlane, currentZ],
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
   * Every shape placed in the world once — cached PER ROW, so a poll delta
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
        isAnnotationInView(
          { coordinates: entry.annotation.coordinates, zSpan: entry.zSpan },
          { coverages, plane },
        ),
      ),
    [placed, coverages, plane],
  );

  // Hand over from the local preview once the persisted copy is actually
  // BEING DRAWN — `shown`, not the raw query result: a copy filtered out by
  // z/pins must keep its preview (dropping on fetch made saved shapes blink
  // out of existence). The store's timeout stays as the backstop.
  const resolvePersistedRois = useRoiDrawingStore((s) => s.resolvePersistedRois);
  useEffect(() => {
    if (!annotations) return;
    resolvePersistedRois(
      collection.id,
      shown.map((entry) => entry.annotation.id),
    );
  }, [annotations, shown, collection.id, resolvePersistedRois]);

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
      shown.map((entry) => ({ ...entry.roi, bounds: entry.bounds })),
    );
  }, [layerId, setVisibleLayerRois, shown]);
  useEffect(
    () => () => {
      clearVisibleLayerRois(layerId);
    },
    [clearVisibleLayerRois, layerId],
  );

  // Identity-stable so the memoized shapes actually skip.
  const onSelectRoi = useCallback(
    (roi: SelectedRoi, appendSelection: boolean) => {
      if (appendSelection) {
        toggleSelectedRoi(roi);
        return;
      }
      selectOnlyRoi(roi);
    },
    [selectOnlyRoi, toggleSelectedRoi],
  );

  const selectable = interactionMode !== "PROBE";
  const selectedRoiIds = useMemo(
    () => new Set(selectedRois.map((roi) => roi.id)),
    [selectedRois],
  );

  // Partition BEFORE styling: `others` must not depend on the selection, or
  // the outline batches below would rebuild (and re-upload) on every click —
  // which is what happened when the split and the point styling were one memo.
  const { points, others: otherShapes } = useMemo(() => partitionEntries(shown), [shown]);
  const pointGroups = useMemo(
    () => pointGroupsOf(points, (id) => selectedRoiIds.has(id), flattenToPlane),
    [points, selectedRoiIds, flattenToPlane],
  );

  // Merged outline batches (`orkestrator.annotationBatch`, read once per
  // mount). Geometry deps carry NO plane and NO selection: a scrub or a click
  // must not rebuild the collection's Float32Arrays (sectioned ellipsoids are
  // excluded; selection is a color-only pass in the batch component).
  const outlineBatches = useMemo(
    () => buildOutlineBatches(otherShapes, flattenToPlane),
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
        />
      ))}
      {outlineBatches.map((batch) => (
        <AnnotationOutlineBatch
          key={batch.lineWidth}
          batch={batch}
          selectedIds={selectedRoiIds}
          selectable={selectable}
          onSelectRoi={onSelectRoi}
        />
      ))}
      {otherShapes.map(({ annotation, roi }) => (
        <AnnotationShape
          key={annotation.id}
          annotation={annotation}
          roi={roi}
          flattenToPlane={flattenToPlane}
          planeZ={planeZLocal}
          isActive={selectedRoiIds.has(annotation.id)}
          selectable={selectable}
          onSelectRoi={onSelectRoi}
        />
      ))}
    </group>
  );
};
