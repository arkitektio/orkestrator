import { useEffect } from "react";
import { useRoiSelectionStore } from "./roiSelectionStore";
import { useDeleteSelectedRois } from "./useDeleteSelectedRois";
import { isTypingTarget } from "../../platform/input/keyboardTarget";

/**
 * Backspace deletes the selected annotations. Headless and mounted in
 * `SceneViewport` — it cannot live in the annotations panel, because sidebar
 * tabs unmount when inactive and the keybinding must not depend on which tab
 * the user happens to have open.
 */
export const RoiDeleteKeybinding = () => {
  const hasSelection = useRoiSelectionStore((s) => s.selectedRois.length > 0);
  const { deleteSelectedRois } = useDeleteSelectedRois();

  useEffect(() => {
    if (!hasSelection) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace") return;
      if (isTypingTarget(event.target as HTMLElement | null)) return;

      event.preventDefault();
      void deleteSelectedRois();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteSelectedRois, hasSelection]);

  return null;
};
