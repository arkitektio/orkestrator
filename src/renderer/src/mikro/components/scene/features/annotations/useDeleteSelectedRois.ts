import { useCallback } from "react";
import { toast } from "sonner";
import { useDeleteAnnotationMutation } from "@/mikro/api/graphql";
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

/**
 * Delete every selected annotation, one mutation each, dropping only the
 * fulfilled ones from the selection — a partial failure leaves the failed
 * ROIs selected so the user can retry. Shared by the annotations panel's
 * Delete button and the Backspace keybinding (`RoiDeleteKeybinding`).
 */
export const useDeleteSelectedRois = (): {
  deleteSelectedRois: () => Promise<void>;
  isDeleting: boolean;
} => {
  const selectedRois = useRoiSelectionStore((s) => s.selectedRois);
  const removeSelectedRoi = useRoiSelectionStore((s) => s.removeSelectedRoi);
  const [deleteAnnotationMutation, { loading: isDeleting }] = useDeleteAnnotationMutation({
    refetchQueries: ["GetSceneAnnotations"],
    awaitRefetchQueries: false,
  });

  const deleteSelectedRois = useCallback(async () => {
    if (selectedRois.length === 0 || isDeleting) return;

    const layerIds = selectionLayerIds(selectedRois);
    if (layerIds.length > 1) {
      toast.warning(
        `Selection spans ${layerIds.length} annotation collections — narrow it (or delete per collection from the annotations panel).`,
      );
      return;
    }

    const roisToDelete = [...selectedRois];

    const results = await Promise.allSettled(
      roisToDelete.map(async (roi) => {
        await deleteAnnotationMutation({
          variables: { input: { id: roi.id } },
        });

        return roi.id;
      }),
    );

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        removeSelectedRoi(result.value);
      }
    });
  }, [deleteAnnotationMutation, isDeleting, removeSelectedRoi, selectedRois]);

  return { deleteSelectedRois, isDeleting };
};
