import { useMemo } from "react";
import * as THREE from "three";
import { Focus } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Card, CardTitle } from "@/core/components/ui/card";
import { MikroAnnotation } from "@/core/linkers";
import { useGetSceneAnnotationsQuery, type SceneAnnotationFragment } from "@/mikro/api/graphql";
import {
  resolveCollectionMatrix,
  type AnnotationLayerVariant,
} from "./annotationBounds";
import { formatAnnotationMeasure, measureAnnotation } from "./roiMeasure";
import { unitLabel } from "../../platform/coords/sceneUnits";
import { useNavigateToAnnotation } from "./useNavigateToAnnotation";
import { useDeleteSelectedRois } from "./useDeleteSelectedRois";
import { useRoiSelectionStore, type SelectedRoi } from "./roiSelectionStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { RoiAttributeSection } from "./RoiAttributeSection";
import { formatAnnotationKind, indexLabel } from "../../platform/model/selectionFormat";

/**
 * The annotations panel: the selected annotations as smart model cards on top
 * (attribute plans when exactly one is selected — lookups stay bounded), then
 * EVERY annotation in the scene grouped per annotation layer — regardless of
 * the current z slice or dim selections. Clicking a row toggles it in the
 * selection (multi-select by default); the camera moves only through the
 * explicit go-to button, so building a selection never yanks the view around.
 *
 * Replaces the old floating `SelectedRoiPanel`; the Backspace-delete that
 * lived there is now `features/annotations/RoiDeleteKeybinding` (always mounted —
 * sidebar tabs unmount when inactive).
 */

export const AnnotationsPanel = ({
  variant = "floating",
}: {
  variant?: "floating" | "sidebar";
}) => {
  const selectedRois = useRoiSelectionStore((s) => s.selectedRois);
  const clearSelectedRois = useRoiSelectionStore((s) => s.clearSelectedRois);
  const { deleteSelectedRois, isDeleting } = useDeleteSelectedRois();
  const sceneLayers = useSceneStore((s) => s.sceneLayers);

  // Hidden layers included on purpose: the list covers the whole scene, and
  // the go-to button is what brings an annotation into view.
  const annotationLayers = useMemo(
    () =>
      sceneLayers.filter(
        (layer): layer is AnnotationLayerVariant =>
          layer.__typename === "AnnotationLayer" && !!layer.annotationCollection,
      ),
    [sceneLayers],
  );

  const selectedIds = useMemo(
    () => new Set(selectedRois.map((roi) => roi.id)),
    [selectedRois],
  );

  const rootClass =
    variant === "sidebar"
      ? "flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2"
      : "pointer-events-auto flex max-h-[60vh] w-72 flex-col gap-2 overflow-y-auto rounded-lg border border-black/10 bg-black/40 p-2 backdrop-blur-md";

  return (
    <div className={rootClass}>
      {selectedRois.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <Button
              size="xs"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void deleteSelectedRois()}
            >
              {isDeleting ? "Deleting…" : `Delete (${selectedRois.length})`}
            </Button>
            <Button size="xs" variant="outline" onClick={() => clearSelectedRois()}>
              Clear
            </Button>
          </div>
          {selectedRois.map((roi) => (
            <SelectedAnnotationCard
              key={roi.id}
              roi={roi}
              layer={annotationLayers.find((layer) => layer.id === roi.layerId)}
              // Bounded lookups only: attribute plans for a single selection.
              showAttributes={selectedRois.length === 1}
            />
          ))}
          <div className="h-px shrink-0 bg-white/10" />
        </section>
      )}

      {annotationLayers.length === 0 ? (
        <div className="text-[10px] text-white/40">
          No annotation layers in this scene yet — draw a shape to create one.
        </div>
      ) : (
        annotationLayers.map((layer) => (
          <AnnotationLayerSection key={layer.id} layer={layer} selectedIds={selectedIds} />
        ))
      )}
    </div>
  );
};

/**
 * A selected annotation as a smart model card: draggable, right-click actions,
 * partner drops — the standard `Smart` affordances — around the details and
 * (single selection) its attribute plans. The index comes from the collection
 * list (a cache hit — the sections below run the same query), because a
 * selection made by clicking a shape in the scene arrives without one.
 */
const SelectedAnnotationCard = ({
  roi,
  layer,
  showAttributes,
}: {
  roi: SelectedRoi;
  layer: AnnotationLayerVariant | undefined;
  showAttributes: boolean;
}) => {
  const collectionId = layer?.annotationCollection?.id;
  const { data } = useGetSceneAnnotationsQuery({
    variables: { filters: { collection: collectionId ?? "" } },
    skip: !collectionId,
  });
  const index =
    data?.annotations?.findIndex((annotation) => annotation.id === roi.id) ?? -1;

  return (
    // Spread: the Smart wrapper wants a JSON-shaped object, and the store's
    // `name` may be `undefined`, which JSON has no word for.
    <MikroAnnotation.Smart object={{ ...roi, name: roi.name ?? null }}>
      <Card className="flex flex-col gap-1 px-2 py-2">
        <CardTitle className="break-words text-sm">
          {index >= 0 ? indexLabel(index) : "Annotation"}
        </CardTitle>
        <div className="text-xs text-muted-foreground">{formatAnnotationKind(roi.kind)}</div>
        {showAttributes && <RoiAttributeSection roi={roi} />}
      </Card>
    </MikroAnnotation.Smart>
  );
};

/**
 * One collection's list section. A component per layer is what lets each
 * collection run its own query hook; the variables match the canvas layer's
 * query exactly, so Apollo serves both from one cache entry (the canvas polls,
 * this list rides along).
 */
const AnnotationLayerSection = ({
  layer,
  selectedIds,
}: {
  layer: AnnotationLayerVariant;
  selectedIds: ReadonlySet<string>;
}) => {
  const collection = layer.annotationCollection!;
  const { data } = useGetSceneAnnotationsQuery({
    variables: { filters: { collection: collection.id } },
  });
  const toggleSelectedRoi = useRoiSelectionStore((s) => s.toggleSelectedRoi);
  const navigateToAnnotation = useNavigateToAnnotation();
  const transformContext = useSceneStore((s) => s.transformContext);
  const spatialUnit = useSceneStore((s) => s.spatialUnit);

  const annotations = data?.annotations ?? [];
  const systemId = collection.coordinateSystem.id ?? null;
  const axisNames = useMemo(
    () => (collection.coordinateSystem.axes ?? []).map((axis) => axis.name),
    [collection],
  );

  // Measures are quoted in WORLD units (the scene's µm), not the collection's
  // raw numbers — the same frame the scale bar and draw readout speak.
  const affineMatrix = useMemo(
    () => resolveCollectionMatrix(layer, collection, transformContext),
    [layer, collection, transformContext],
  );
  const unit = unitLabel(spatialUnit);
  const measureOf = (annotation: SceneAnnotationFragment): string | null => {
    const worldPoints = (annotation.vectors ?? []).map((vector) => {
      const world = new THREE.Vector3(
        vector[0] ?? 0,
        vector[1] ?? 0,
        vector[2] ?? 0,
      ).applyMatrix4(affineMatrix);
      return { x: world.x, y: world.y, z: world.z };
    });
    return formatAnnotationMeasure(
      measureAnnotation(annotation.kind, worldPoints),
      unit,
    );
  };

  // The same SelectedRoi the canvas layer builds: raw collection-space vectors
  // plus the collection's own system — attribute plans do any frame conversion.
  const toRoi = (annotation: SceneAnnotationFragment): SelectedRoi => ({
    id: annotation.id,
    layerId: layer.id,
    name: annotation.name,
    kind: annotation.kind,
    systemId,
    axisNames,
    vectors: annotation.vectors ?? [],
    coordinates: annotation.coordinates ?? [],
  });

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between px-0.5">
        <span className="min-w-0 break-words text-xs font-medium text-muted-foreground">
          {collection.name || "Annotations"}
        </span>
        <span className="text-xs text-muted-foreground/60">{annotations.length}</span>
      </div>
      {annotations.length === 0 && (
        <div className="text-xs text-muted-foreground/60">No annotations</div>
      )}
      {annotations.map((annotation, index) => (
        <AnnotationRow
          key={annotation.id}
          annotation={annotation}
          index={index}
          measure={measureOf(annotation)}
          isSelected={selectedIds.has(annotation.id)}
          onToggle={() => toggleSelectedRoi(toRoi(annotation))}
          onGoTo={() => navigateToAnnotation(annotation, layer)}
        />
      ))}
    </section>
  );
};

const AnnotationRow = ({
  annotation,
  index,
  measure,
  isSelected,
  onToggle,
  onGoTo,
}: {
  annotation: SceneAnnotationFragment;
  index: number;
  measure: string | null;
  isSelected: boolean;
  onToggle: () => void;
  onGoTo: () => void;
}) => (
  // One compact line: index, then kind · measure, actions pinned right.
  <Card
    className={`group flex  flex-row cursor-pointer items-center gap-2 px-2 py-1 transition-colors ${
      isSelected
        ? // Amber — the same color the scene highlights the selected shape in.
          "border-amber-400/40 bg-amber-400/10"
        : "hover:bg-accent/50"
    }`}
    title={isSelected ? "Click to deselect" : "Click to select"}
    onClick={onToggle}
  >
    <CardTitle className="shrink-0 text-xs font-medium">
      {indexLabel(index)}
    </CardTitle>
    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
      {formatAnnotationKind(annotation.kind)}
      {measure && ` · ${measure}`}
    </span>
    {/* Hover-revealed: the smart action button (run workflows on this
        annotation). Wrapped so opening it never toggles the selection. */}
    <span
      className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      onClick={(event) => event.stopPropagation()}
    >
      <MikroAnnotation.ObjectButton object={annotation} />
    </span>
    <Button
      variant="ghost"
      size="xs"
      className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
      title="Go to annotation"
      onClick={(event) => {
        event.stopPropagation();
        onGoTo();
      }}
    >
      <Focus className="h-3.5 w-3.5" />
    </Button>
  </Card>
);
