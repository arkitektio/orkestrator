import React, { Ref, RefObject, useContext, useEffect, useRef } from "react";
import { ConnectDropTarget } from "react-dnd";
import { Identifier } from "../api/scalars";

export type SelectionItem = {
  identifier: Identifier;
  object: any;
};

export type Selectable = {
  selectable: SelectionItem;
  item: HTMLElement;
};

export type SelectionContextType = {
  selection: SelectionItem[];
  isMultiSelecting: boolean;
  focus?: SelectionItem;
  setSelection: (selection: SelectionItem[]) => void;
  autoSelect: (identifier: SelectionItem[]) => void;
  unselect: (identifier: SelectionItem[]) => void;
  setIsMultiSelecting: (state: boolean) => void;
  registerSelectables: (selectable: Selectable[]) => void;
  unregisterSelectables: (selectables: Selectable[]) => void;
};

export const SelectionContext = React.createContext<SelectionContextType>({
  selection: [],
  setSelection: () => {
    console.error("Not implemented");
  },
  autoSelect: () => {
    console.error("Not implemented");
  },
  unselect: () => {
    console.error("Not implemented");
  },
  isMultiSelecting: false,
  setIsMultiSelecting: () => {
    console.error("Not implemented");
  },
  registerSelectables: () => {
    console.error("Not implemented");
  },
  unregisterSelectables: () => {
    console.error("Not implemented");
  },
});

export const useModelSelector = () => useContext(SelectionContext);

export const useAutoSelect = (
  selection: SelectionItem[],
  dependencies: any[] = []
) => {
  const { autoSelect, unselect } = useModelSelector();

  return useEffect(() => {
    autoSelect(selection);

    return () => unselect(selection);
  }, dependencies);
};

export const useModelSelect = (
  proposedSelection: SelectionItem,
  options: {
    onClick?: (event: any) => {};
    unselectOutside?: boolean;
  } = {
    unselectOutside: false,
  }
) => {
  const {
    isMultiSelecting,
    setIsMultiSelecting,
    focus,
    selection,
    setSelection,
  } = useModelSelector();

  const me = selection.find(
    (item) =>
      item.identifier === proposedSelection.identifier &&
      item.object === proposedSelection.object
  );

  const mefocus =
    focus?.identifier === proposedSelection.identifier &&
    focus?.object === proposedSelection.object;

  const selectionIndex = me && selection.indexOf(me);

  const onMouseDown = (event: any) => {
    event.stopPropagation();
    if (event.detail === 1) {
      if (event.nativeEvent.ctrlKey) {
        if (!isMultiSelecting) {
          // We are not multi selecting, so we should select this item
          setIsMultiSelecting(true);
          setSelection([proposedSelection]);
          return;
        }
        if (me) {
          let array = selection.filter((item) => item !== me);
          if (array.length === 0) {
            setIsMultiSelecting(false);
            setSelection([]);
          }
          // other elements exist, so we should unselect this item
          setSelection(array);
          return;
        } else {
          setSelection([...selection, proposedSelection]);
          return;
        }
      }
      if (!isMultiSelecting) {
        options.onClick && options.onClick(event);
      }
      if (isMultiSelecting) {
        return;
      }
    }

    // if (event.detail == 2) {
    //   if (isMultiSelecting) {
    //     setIsMultiSelecting(false);
    //     setSelection([]);
    //   } else {
    //     setIsMultiSelecting(true);
    //     setSelection([proposedSelection]);
    //   }
    // }
  };

  const bind = {
    onMouseDown,
  };

  return {
    bind,
    isSelecting: isMultiSelecting,
    isSelected: me !== undefined,
    isFocused: mefocus,
    selectionIndex,
    selection: selection,
  };
};
