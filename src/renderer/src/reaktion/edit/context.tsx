import React, { useContext } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { createEditFlowStore, EditFlowState } from "./store";

export type EditFlowStoreApi = ReturnType<typeof createEditFlowStore>;

export const EditFlowStoreContext =
  React.createContext<EditFlowStoreApi | null>(null);

export const useEditFlowStoreApi = () => {
  const store = useContext(EditFlowStoreContext);

  if (!store) {
    throw new Error("useEditFlowStoreApi must be used within EditFlowStoreContext");
  }

  return store;
};

export const useEditFlowStore = <T,>(selector: (state: EditFlowState) => T) => {
  const store = useEditFlowStoreApi();
  return useStore(store, selector);
};

/**
 * Undo/redo state of the flow store's temporal (zundo) history.
 *
 * NOTE: there is deliberately no hook that returns the whole flow state. The
 * store's `nodes` array is replaced on every drag tick, so any component
 * subscribed to the whole state rerenders at pointer rate — with one such
 * subscription per node and per edge that was the entire graph. Select the
 * field or action you need with `useEditFlowStore((s) => s.field)`; actions
 * are stable references and never cause a rerender.
 */
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

export const useEditNodeErrors = (id: string) =>
  // Shallow-compared so the per-node array only changes when this node's
  // errors change, not on every store write.
  useEditFlowStore(
    useShallow((state) =>
      state.remainingErrors.filter((error) => error.id === id && error.type === "node"),
    ),
  );

export const useSubflowChildCount = (id: string) => {
  return useEditFlowStore(
    (state) => state.nodes.filter((node) => node.parentId === id).length,
  );
};

