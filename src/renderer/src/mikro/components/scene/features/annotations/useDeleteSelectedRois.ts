import { useCallback, useState } from "react";
import { reportError, toast } from "@/core/notify";
import { useDeleteAnnotationMutation } from "@/mikro/api/graphql";
import { removeSceneAnnotation } from "../../../../lib/annotations/annotationCache";
import { useLineageSafeAnnotationDelete } from "../../../../lib/deletion/useLineageSafeAnnotationDelete";
import { useRoiSelectionStore, type SelectedRoi } from "./roiSelectionStore";

/**
 * The layers (⇔ collections; one collection per layer) a selection spans.
 * The marquee selects across every visible annotation layer, so a Backspace
 * over overlapping collections would silently delete from a collection the
 * user was not even looking at — deletion therefore refuses a multi-layer
 * selection and says so.
 */
export function selectionLayerIds(selected: readonly Pick<SelectedRoi, "layerId">[]): string[] {
  return [...new Set(selected.map((roi) => roi.layerId))];
}

const useDeleteAnnotation = () =>
  useDeleteAnnotationMutation({
    // Drop the shape from the cached lists instead of fetching them again.
    update: (cache, _result, { variables }) => {
      if (variables) removeSceneAnnotation(cache, variables.input.id);
    },
  });

/**
 * Delete one annotation by id, whether or not it is selected: the delete button
 * on each row of the layer card's list. A failure keeps the shape, and its
 * place in the selection, and says why.
 */
export const useDeleteRoi = (): {
  deleteRoi: (id: string) => Promise<void>;
  deletingIds: ReadonlySet<string>;
} => {
  const removeSelectedRoi = useRoiSelectionStore((s) => s.removeSelectedRoi);
  const [deleteAnnotationMutation, { client }] = useDeleteAnnotation();
  // Asks first what the delete would take along, and cascades only once agreed.
  const safeDelete = useLineageSafeAnnotationDelete();
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(new Set());

  const deleteRoi = useCallback(
    (id: string) =>
      safeDelete([id], async (ids, cascade, alsoGone) => {
        setDeletingIds((current) => new Set(current).add(id));
        try {
          for (const target of ids) {
            await deleteAnnotationMutation({ variables: { input: { id: target, cascade } } });
            removeSelectedRoi(target);
          }
          for (const gone of alsoGone) {
            removeSceneAnnotation(client.cache, gone);
            removeSelectedRoi(gone);
          }
        } catch (error) {
          reportError(error, "Couldn't delete the annotation");
        } finally {
          setDeletingIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });
        }
      }),
    [client, deleteAnnotationMutation, removeSelectedRoi, safeDelete],
  );

  return { deleteRoi, deletingIds };
};

/**
 * Delete every selected annotation, one mutation each, dropping only the
 * fulfilled ones from the selection — a partial failure leaves the failed
 * ROIs selected so the user can retry. Shared by the annotation layer card's
 * Delete button and the Backspace keybinding (`RoiDeleteKeybinding`).
 */
export const useDeleteSelectedRois = (): {
  deleteSelectedRois: () => Promise<void>;
  isDeleting: boolean;
} => {
  const selectedRois = useRoiSelectionStore((s) => s.selectedRois);
  const removeSelectedRoi = useRoiSelectionStore((s) => s.removeSelectedRoi);
  const [deleteAnnotationMutation, { loading: isDeleting, client }] = useDeleteAnnotation();
  const safeDelete = useLineageSafeAnnotationDelete();

  const deleteSelectedRois = useCallback(async () => {
    if (selectedRois.length === 0 || isDeleting) return;

    const layerIds = selectionLayerIds(selectedRois);
    if (layerIds.length > 1) {
      toast.warning(
        `Selection spans ${layerIds.length} annotation collections — narrow it to one layer's shapes first.`,
      );
      return;
    }

    await safeDelete(
      selectedRois.map((roi) => roi.id),
      async (ids, cascade, alsoGone) => {
        const results = await Promise.allSettled(
          ids.map(async (id) => {
            await deleteAnnotationMutation({
              variables: { input: { id, cascade } },
            });

            return id;
          }),
        );
        for (const gone of alsoGone) {
          removeSceneAnnotation(client.cache, gone);
          removeSelectedRoi(gone);
        }

        const failures: unknown[] = [];
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            removeSelectedRoi(result.value);
          } else {
            failures.push(result.reason);
          }
        });
        // One toast for the batch, the first refusal as its reason.
        if (failures.length > 0) {
          reportError(
            failures[0],
            failures.length === results.length
              ? `Couldn't delete the ${results.length === 1 ? "annotation" : "annotations"}`
              : `Couldn't delete ${failures.length} of ${results.length} annotations`,
          );
        }
      },
    );
  }, [client, deleteAnnotationMutation, isDeleting, removeSelectedRoi, safeDelete, selectedRois]);

  return { deleteSelectedRois, isDeleting };
};
