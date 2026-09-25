import React, { useCallback, useContext, useMemo } from "react";
import { useStore } from "zustand";

import { Structure } from "@/types";
import { selectFocus, SelectionState } from "./store";
import { SelectionContextType, SelectionSnapshot } from "./types";

export const SelectionContext = React.createContext<SelectionContextType>(null);

export const useSelectionStoreApi = () => {
  const store = useContext(SelectionContext);

  if (!store) {
    throw new Error("useSelectionStore must be used within a SelectionProvider");
  }

  return store;
};

export const useSelectionSelector = <T,>(
  selector: (state: SelectionState) => T,
): T => {
  const store = useSelectionStoreApi();

  return useStore(store, selector);
};

export const useSelection = (): SelectionSnapshot => {
  const selection = useSelectionSelector((state) => state.selection);
  const bselection = useSelectionSelector((state) => state.bselection);
  const isMultiSelecting = useSelectionSelector(
    (state) => state.isMultiSelecting,
  );
  const setSelection = useSelectionSelector((state) => state.setSelection);
  const setBSelection = useSelectionSelector((state) => state.setBSelection);
  const unselect = useSelectionSelector((state) => state.unselect);
  const setIsMultiSelecting = useSelectionSelector(
    (state) => state.setIsMultiSelecting,
  );
  const registerSelectables = useSelectionSelector(
    (state) => state.registerSelectables,
  );
  const unregisterSelectables = useSelectionSelector(
    (state) => state.unregisterSelectables,
  );
  const toggleSelection = useSelectionSelector((state) => state.toggleSelection);
  const toggleBSelection = useSelectionSelector((state) => state.toggleBSelection);
  const removeSelection = useSelectionSelector((state) => state.clear);
  const focus = useSelectionSelector(selectFocus);

  return useMemo(
    () => ({
      selection,
      bselection,
      isMultiSelecting,
      setSelection,
      setBSelection,
      unselect,
      setIsMultiSelecting,
      registerSelectables,
      unregisterSelectables,
      toggleSelection,
      toggleBSelection,
      removeSelection,
      focus,
    }),
    [
      selection,
      bselection,
      isMultiSelecting,
      setSelection,
      setBSelection,
      unselect,
      setIsMultiSelecting,
      registerSelectables,
      unregisterSelectables,
      toggleSelection,
      toggleBSelection,
      removeSelection,
      focus,
    ],
  );
};

export const useMySelect = (options: { self: Structure }) => {
  const { self } = options;
  const selection = useSelectionSelector((state) => state.selection);
  const bselection = useSelectionSelector((state) => state.bselection);
  const toggleSelection = useSelectionSelector((state) => state.toggleSelection);
  const toggleBSelection = useSelectionSelector((state) => state.toggleBSelection);

  const isSelected = useMemo(() => {
    const me = selection.findIndex(
      (item) =>
        item.identifier === self.identifier && item.object === self.object,
    );
    return me != -1 ? me + 1 : undefined;
  }, [selection, self]);

  const isBSelected = useMemo(() => {
    const me = bselection.findIndex(
      (item) =>
        item.identifier === self.identifier && item.object === self.object,
    );
    return me != -1 ? me + 1 : undefined;
  }, [bselection, self]);

  const toggle = useCallback(() => {
    toggleSelection(self);
  }, [self, toggleSelection]);

  const toggleB = useCallback(() => {
    toggleBSelection(self);
  }, [self, toggleBSelection]);

  return { isSelected, toggle, isBSelected, toggleB, selection, bselection };
};

export const useMySelection = (
  iam: Structure,
  options: {
    onClick?: (event: any) => {};
    unselectOutside?: boolean;
  } = {
      unselectOutside: false,
    },
) => {
  const isMultiSelecting = useSelectionSelector(
    (state) => state.isMultiSelecting,
  );
  const setIsMultiSelecting = useSelectionSelector(
    (state) => state.setIsMultiSelecting,
  );
  const focus = useSelectionSelector(selectFocus);
  const selection = useSelectionSelector((state) => state.selection);
  const setSelection = useSelectionSelector((state) => state.setSelection);

  const variables = useMemo(() => {
    const me = selection.find(
      (item) =>
        item.identifier === iam.identifier && item.object === iam.object,
    );

    if (!me) return { me: undefined, hasfocus: false, isSelected: false };
    const myindex = selection.indexOf(me);

    return {
      me: me,
      isSelected: true,

      hasfocus:
        focus?.identifier === iam.identifier && focus?.object === iam.object,
      myindex: myindex,
    };
  }, [selection, focus]);

  const onMouseDown = useCallback(
    (event: any) => {
      if (event.detail === 1) {
        if (event.nativeEvent.shiftKey || event.nativeEvent.shiftKey) {
          if (!isMultiSelecting) {
            // We are not multi selecting, so we should select this item
            setIsMultiSelecting(true);
            setSelection([iam]);
            return;
          }
          if (iam) {
            const array = selection.filter(
              (item) =>
                item.object !== iam.object ||
                item.identifier !== iam.identifier,
            );
            if (array.length === 0) {
              setIsMultiSelecting(false);
              setSelection([]);
            }
            // other elements exist, so we should unselect this item
            setSelection(array);
            return;
          } else {
            setSelection([...selection, iam]);
            return;
          }
        }
      }
      if (!isMultiSelecting) {
        options.onClick && options.onClick(event);
      }
      if (isMultiSelecting) {
        return;
      }
    },
    [isMultiSelecting, iam, selection, options.onClick, setIsMultiSelecting, setSelection],
  );

  const bind = {
    onMouseDown,
  };

  return {
    bind,
    ...variables,
    selection,
  };
};
