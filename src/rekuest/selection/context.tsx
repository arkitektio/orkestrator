import React, { useContext, useEffect } from "react";
import { Identifier } from "../api/scalars";

export type SelectionItem = {
  identifier: Identifier;
  id: any;
};

export type Selectable = {
  selectable: SelectionItem;
  item: HTMLElement;
};

export type SelectionContextType = {
  selection: SelectionItem[];
  bselection: SelectionItem[];
  isMultiSelecting: boolean;
  focus?: SelectionItem;
  setSelection: (selection: SelectionItem[]) => void;
  setBSelection: (selection: SelectionItem[]) => void;
  autoSelect: (identifier: SelectionItem[]) => void;
  unselect: (identifier: SelectionItem[]) => void;
  setIsMultiSelecting: (state: boolean) => void;
  registerSelectables: (selectable: Selectable[]) => void;
  unregisterSelectables: (selectables: Selectable[]) => void;
};

export const SelectionContext = React.createContext<SelectionContextType>({
  selection: [],
  setSelection: () => {},
  bselection: [],
  setBSelection: () => {},
  autoSelect: () => {},
  unselect: () => {},
  isMultiSelecting: false,
  setIsMultiSelecting: () => {},
  registerSelectables: () => {},
  unregisterSelectables: () => {},
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
    bselection,
    setBSelection,
  } = useModelSelector();

  const me = selection.find(
    (item) =>
      item.identifier === proposedSelection.identifier &&
      item.id === proposedSelection.id
  );


  const mefocus =
    focus?.identifier === proposedSelection.identifier &&
    focus?.id === proposedSelection.id;

  const selectionIndex = me && selection.indexOf(me);

  const bme = bselection.find(
    (item) =>
      item.identifier === proposedSelection.identifier &&
      item.id === proposedSelection.id
  );

  const bmefocus =
    focus?.identifier === proposedSelection.identifier &&
    focus?.id === proposedSelection.id;

  const bselectionIndex = bme && bselection.indexOf(bme);

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
      if (event.nativeEvent.shiftKey) {
        if (!isMultiSelecting) {
          // We are not multi selecting, so we should select this item
          setIsMultiSelecting(true);
          setBSelection([proposedSelection]);
          return;
        }
        if (me) {
          let array = bselection.filter((item) => item !== bme);
          if (array.length === 0) {
            setIsMultiSelecting(false);
            setBSelection([]);
          }
          // other elements exist, so we should unselect this item
          setBSelection(array);
          return;
        } else {
          setBSelection([...bselection, proposedSelection]);
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
    bselection: bselection,
    bisSelected: bme !== undefined,
    bisFocused: bmefocus,
    bselectionIndex,
  };
};
