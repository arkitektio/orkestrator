import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";

export interface SelectionState {
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;
}

export const createSelectionStore = () =>
  createStore<SelectionState>()(
  immer((set) => ({
    selectedLayerId: null,
    setSelectedLayerId: (id) =>
      set((state) => {
        state.selectedLayerId = id;
      }),
  })),
);

const {
  StoreContext: SelectionStoreContext,
  useScopedStore: useSelectionStore,
  useStoreApi: useSelectionStoreApi,
} = createScopedStoreHooks<SelectionState>("SelectionStore");

export { SelectionStoreContext, useSelectionStore, useSelectionStoreApi };
