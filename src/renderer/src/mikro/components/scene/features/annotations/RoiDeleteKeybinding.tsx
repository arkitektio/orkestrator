import { useEffect } from "react";
import { useRoiSelectionStore } from "./roiSelectionStore";
import { useRoiDrawingStoreApi } from "./roiDrawingStore";
import { useDeleteSelectedRois } from "./useDeleteSelectedRois";
import { isTypingTarget } from "../../platform/input/keyboardTarget";

/**
 * Backspace deletes the selected annotations — unless a shape is half-drawn,
 * when Backspace is the drawer's and discards that shape instead
 * (`RoiDrawer`). Headless and mounted in
 * `SceneViewport` — it cannot live in an annotation layer card, because sidebar
 * tabs unmount when inactive and the keybinding must not depend on which tab
 * the user happens to have open.
 */
export const RoiDeleteKeybinding = () => {
  const hasSelection = useRoiSelectionStore((s) => s.selectedRois.length > 0);
  const { deleteSelectedRois } = useDeleteSelectedRois();
  const roiDrawingApi = useRoiDrawingStoreApi();

  useEffect(() => {
    if (!hasSelection) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace") return;
      if (isTypingTarget(event.target as HTMLElement | null)) return;
      if (roiDrawingApi.getState().shapeInProgress) return;

      event.preventDefault();
      void deleteSelectedRois();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteSelectedRois, hasSelection, roiDrawingApi]);

  return null;
};
