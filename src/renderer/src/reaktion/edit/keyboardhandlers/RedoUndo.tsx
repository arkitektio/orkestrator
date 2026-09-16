import { useEffect } from "react";
import { useEditFlowStoreApi } from "../context";

const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || element.isContentEditable;
};

/** One keydown listener for the editor's lifetime; reads history state at fire time. */
export const RedoUndoHandler = () => {
  const store = useEditFlowStoreApi();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (isEditableTarget(event.target)) return;
      const temporal = store.temporal.getState();
      const key = event.key.toLowerCase();
      const isRedo = key === "y" || (key === "z" && event.shiftKey);
      const isUndo = key === "z" && !event.shiftKey;
      if (isRedo && temporal.futureStates.length > 0) {
        event.preventDefault();
        temporal.redo();
      } else if (isUndo && temporal.pastStates.length > 0) {
        event.preventDefault();
        temporal.undo();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [store]);

  return null;
};
