import { FlowNode } from "@/reaktion/types";
import { ValidationError } from "@/reaktion/validation/types";
import React, { useContext } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { EditFlowState, EditFlowStore, EMPTY_ERRORS } from "./store";

export type EditFlowStoreApi = EditFlowStore;

export const EditFlowStoreContext = React.createContext<EditFlowStoreApi | null>(null);

export const useEditFlowStoreApi = () => {
  const store = useContext(EditFlowStoreContext);
  if (!store) {
    throw new Error("useEditFlowStoreApi must be used within EditFlowStoreContext");
  }
  return store;
};

/**
 * Select ONE field or action. The store's `nodes` array is replaced on every
 * drag tick, so a selector returning the whole state (or a fresh object)
 * would rerender at pointer rate. Actions are stable references.
 */
export const useEditFlowStore = <T,>(selector: (state: EditFlowState) => T) => {
  const store = useEditFlowStoreApi();
  return useStore(store, selector);
};

export const useEditTemporal = () => {
  const store = useEditFlowStoreApi();
  return useStore(
    store.temporal,
    useShallow((temporalState) => ({
      undo: temporalState.undo,
      redo: temporalState.redo,
      canUndo: temporalState.pastStates.length > 0,
      canRedo: temporalState.futureStates.length > 0,
    })),
  );
};

/** The live node for `id` (reference-stable until that node changes). */
export const useEditNode = (id: string | null | undefined): FlowNode | undefined =>
  useEditFlowStore((state) => (id ? state.nodeById.get(id) : undefined));

/** O(1) lookup; the returned array is reference-stable across writes that don't touch this node. */
export const useEditNodeErrors = (id: string): readonly ValidationError[] =>
  useEditFlowStore((state) => state.errorsByNodeId.get(id) ?? EMPTY_ERRORS);

export const useSubflowChildCount = (id: string): number =>
  useEditFlowStore((state) => state.childCountByParent.get(id) ?? 0);

export const useEditDirty = () => useEditFlowStore((state) => state.dirty);
