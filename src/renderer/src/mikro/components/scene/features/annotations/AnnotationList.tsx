import { memo, useCallback, useMemo, useState } from "react";
import * as THREE from "three";
import { Focus, Trash2, X } from "lucide-react";
import { Button } from "@/core/ui/button";
import { MikroAnnotation } from "@/core/linkers";
import { type SceneAnnotationFragment } from "@/mikro/api/graphql";
import { resolveCollectionMatrix, type AnnotationLayerVariant } from "./annotationBounds";
import { formatAnnotationMeasure, measureAnnotation } from "./roiMeasure";
import { unitLabel } from "../../platform/coords/sceneUnits";
import { useNavigateToAnnotation } from "./useNavigateToAnnotation";
import { useDeleteRoi, useDeleteSelectedRois } from "./useDeleteSelectedRois";
import { useRoiSelectionStore, type SelectedRoi } from "./roiSelectionStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { RoiAttributeSection } from "./RoiAttributeSection";
import { formatAnnotationKind, indexLabel } from "../../platform/model/selectionFormat";

/**
 * An annotation layer's shapes, as its card lists them: the selection pinned
 * under the card's header, every shape in the fold. This used to be a sidebar
 * tab of its own, which gave one list two homes; the layer card is where a
 * collection's shapes are now.
 *
 * The rows read the card's own query (`useSceneAnnotations`), the one cache
 * entry the renderer, every draw, delete and live event share.
 */

/** Measures are quoted in WORLD units (the scene's µm), not the collection's
 *  raw numbers — the same frame the scale bar and draw readout speak. */
const useMeasureOf = (layer: AnnotationLayerVariant) => {
  const collection = layer.annotationCollection!;
  const transformContext = useSceneStore((s) => s.transformContext);
  const spatialUnit = useSceneStore((s) => s.spatialUnit);
  const affineMatrix = useMemo(
    () => resolveCollectionMatrix(layer, collection, transformContext),
    [layer, collection, transformContext],
  );
  const unit = unitLabel(spatialUnit);
  return useCallback(
    (annotation: SceneAnnotationFragment): string | null => {
      const worldPoints = (annotation.vectors ?? []).map((vector) => {
        const world = new THREE.Vector3(vector[0] ?? 0, vector[1] ?? 0, vector[2] ?? 0).applyMatrix4(
          affineMatrix,
        );
        return { x: world.x, y: world.y, z: world.z };
      });
      return formatAnnotationMeasure(measureAnnotation(annotation.kind, worldPoints), unit);
    },
    [affineMatrix, unit],
  );
};

/**
 * The shapes of this layer selected in the scene: delete or clear them, and
 * (one selected) its attribute plans — bounded lookups only. Each is a smart
 * object (drag, right-click, partner drops); the selection is a handful, so
 * the per-instance store snapshot `.Smart` takes is affordable here, unlike
 * on every row of the list.
 */
export const AnnotationSelection = ({
  annotations,
  selected,
  selectedTotal,
}: {
  annotations: readonly SceneAnnotationFragment[] | undefined;
  /** The selected shapes of THIS layer. */
  selected: readonly SelectedRoi[];
  /** Selected shapes across the scene. */
  selectedTotal: number;
}) => {
  const clearSelectedRois = useRoiSelectionStore((s) => s.clearSelectedRois);
  const removeSelectedRoi = useRoiSelectionStore((s) => s.removeSelectedRoi);
  const { deleteSelectedRois, isDeleting } = useDeleteSelectedRois();
  if (selected.length === 0) return null;
  // Deleting acts on the whole selection, which may only span one collection.
  const elsewhere = selectedTotal - selected.length;

  return (
    <div className="flex flex-col gap-1 border-t border-amber-400/20 bg-amber-400/5 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[9px] font-medium uppercase tracking-[0.08em] text-amber-700/80 dark:text-amber-200/80">
          {selected.length} selected
        </span>
        <Button
          size="xs"
          variant="destructive"
          className="h-5 px-1.5 text-[10px]"
          disabled={isDeleting || elsewhere > 0}
          title={
            elsewhere > 0
              ? `${elsewhere} more selected in other layers — a delete stays in one collection`
              : "Delete the selected shapes"
          }
          onClick={() => void deleteSelectedRois()}
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </Button>
        <Button
          size="xs"
          variant="ghost"
          className="h-5 px-1.5 text-[10px] text-foreground/60 hover:text-foreground/90"
          onClick={() => clearSelectedRois()}
        >
          Clear
        </Button>
      </div>
      {selected.map((roi) => {
        const index = annotations?.findIndex((annotation) => annotation.id === roi.id) ?? -1;
        return (
          // Spread: the Smart wrapper wants a JSON-shaped object, and the
          // store's `name` may be `undefined`, which JSON has no word for.
          <MikroAnnotation.Smart key={roi.id} object={{ ...roi, name: roi.name ?? null }}>
            <div className="rounded-md border border-amber-400/30 bg-background/30 px-1.5 py-1">
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 font-mono text-[10px] text-foreground/90">
                  {index >= 0 ? indexLabel(index) : "—"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[10px] text-foreground/50">
                  {formatAnnotationKind(roi.kind)}
                </span>
                <button
                  type="button"
                  className="grid h-4 w-4 shrink-0 place-items-center rounded text-foreground/40 hover:bg-foreground/10 hover:text-foreground/90"
                  title="Deselect"
                  onClick={() => removeSelectedRoi(roi.id)}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
              {selectedTotal === 1 && <RoiAttributeSection roi={roi} />}
            </div>
          </MikroAnnotation.Smart>
        );
      })}
    </div>
  );
};

/**
 * One shape of the list. Memoized with stable handlers: a selection changes one
 * row's `isSelected`, and walking every vertex of every shape to re-measure the
 * whole list on each click is what a re-render here would otherwise cost.
 */
const AnnotationRow = memo(
  ({
    annotation,
    index,
    isSelected,
    isDeleting,
    measureOf,
    onToggle,
    onGoTo,
    onDelete,
  }: {
    annotation: SceneAnnotationFragment;
    index: number;
    isSelected: boolean;
    isDeleting: boolean;
    measureOf: (annotation: SceneAnnotationFragment) => string | null;
    onToggle: (annotation: SceneAnnotationFragment) => void;
    onGoTo: (annotation: SceneAnnotationFragment) => void;
    onDelete: (id: string) => void;
  }) => {
    const measure = useMemo(() => measureOf(annotation), [measureOf, annotation]);
    // The smart action button shows only under the pointer or focus, so it mounts
    // on the first of those: a long list holds no menu machinery per row.
    const [armed, setArmed] = useState(false);
    const arm = () => setArmed(true);

    return (
      <div
        className={`group flex cursor-pointer items-center gap-1.5 rounded-md border px-1.5 py-0.5 transition-colors ${
          isSelected
            ? // Amber — the same color the scene highlights the selected shape in.
              "border-amber-400/40 bg-amber-400/10"
            : "border-transparent hover:bg-foreground/5"
        }`}
        title={isSelected ? "Click to deselect" : "Click to select"}
        onClick={() => onToggle(annotation)}
        onMouseEnter={arm}
        onFocus={arm}
      >
        <span className="shrink-0 font-mono text-[10px] text-foreground/80">{indexLabel(index)}</span>
        <span className="min-w-0 flex-1 truncate text-[10px] text-foreground/45">
          {formatAnnotationKind(annotation.kind)}
          {measure && ` · ${measure}`}
        </span>
        {/* Hover-revealed: the smart action button (run workflows on this
            annotation). Wrapped so opening it never toggles the selection. */}
        <span
          className="h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          {armed && (
            <MikroAnnotation.ObjectButton
              object={annotation}
              variant="ghost"
              className="h-5 w-5 p-0 text-foreground/60 hover:text-foreground/90 [&_svg]:size-3"
            />
          )}
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="h-5 w-5 shrink-0 p-0 text-foreground/45 hover:text-foreground/90"
          title="Go to annotation"
          onClick={(event) => {
            event.stopPropagation();
            onGoTo(annotation);
          }}
        >
          <Focus className="h-3 w-3" />
        </Button>
        {/* Not `disabled` while deleting: a disabled button lets the click
            through to the row, which would toggle the selection. */}
        <Button
          variant="ghost"
          size="xs"
          className={`h-5 w-5 shrink-0 p-0 text-foreground/35 hover:text-red-700 dark:hover:text-red-300 ${
            isDeleting ? "opacity-40" : ""
          }`}
          title={isDeleting ? "Deleting…" : "Delete annotation"}
          aria-busy={isDeleting}
          onClick={(event) => {
            event.stopPropagation();
            if (!isDeleting) onDelete(annotation.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    );
  },
);
AnnotationRow.displayName = "AnnotationRow";

/**
 * Every shape of the layer, regardless of the current z slice or dim
 * selection. Clicking a row toggles it in the selection (multi-select by
 * default); the camera moves only through the go-to button, so building a
 * selection never yanks the view around.
 */
export const AnnotationList = ({
  layer,
  annotations,
  selectedIds,
}: {
  layer: AnnotationLayerVariant;
  annotations: readonly SceneAnnotationFragment[];
  selectedIds: ReadonlySet<string>;
}) => {
  const collection = layer.annotationCollection!;
  const toggleSelectedRoi = useRoiSelectionStore((s) => s.toggleSelectedRoi);
  const navigateToAnnotation = useNavigateToAnnotation();
  const { deleteRoi, deletingIds } = useDeleteRoi();
  const measureOf = useMeasureOf(layer);
  const systemId = collection.coordinateSystem.id ?? null;
  const axisNames = useMemo(
    () => (collection.coordinateSystem.axes ?? []).map((axis) => axis.name),
    [collection],
  );

  // The same SelectedRoi the canvas layer builds: raw collection-space vectors
  // plus the collection's own system — attribute plans do any frame conversion.
  const onToggle = useCallback(
    (annotation: SceneAnnotationFragment) =>
      toggleSelectedRoi({
        id: annotation.id,
        layerId: layer.id,
        name: annotation.name,
        kind: annotation.kind,
        systemId,
        axisNames,
        vectors: annotation.vectors ?? [],
        coordinates: annotation.coordinates ?? [],
      }),
    [toggleSelectedRoi, layer.id, systemId, axisNames],
  );
  const onGoTo = useCallback(
    (annotation: SceneAnnotationFragment) => navigateToAnnotation(annotation, layer),
    [navigateToAnnotation, layer],
  );
  const onDelete = useCallback((id: string) => void deleteRoi(id), [deleteRoi]);

  return (
    // Bounded: a collection can hold hundreds of shapes, the card must not.
    <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto border-t border-foreground/5 px-2 py-1.5">
      {annotations.map((annotation, index) => (
        <AnnotationRow
          key={annotation.id}
          annotation={annotation}
          index={index}
          isSelected={selectedIds.has(annotation.id)}
          isDeleting={deletingIds.has(annotation.id)}
          measureOf={measureOf}
          onToggle={onToggle}
          onGoTo={onGoTo}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
