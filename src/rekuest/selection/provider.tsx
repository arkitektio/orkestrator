import {
  Box,
  useSelectionContainer,
  boxesIntersect,
} from "@air/react-drag-to-select";
import React, { Ref, useCallback, useEffect, useState } from "react";
import { useDragDropManager } from "react-dnd";
import { Selectable, SelectionContext, SelectionItem } from "./context";
export type ArkitektProps = { children: React.ReactNode };

export const SelectionProvider: React.FC<ArkitektProps> = ({ children }) => {
  const [selection, setSelection] = useState<SelectionItem[]>([]);
  const [bselection, setBSelection] = useState<SelectionItem[]>([]);
  const [selectables, setSelectables] = useState<Selectable[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [focus, setFocus] = useState<SelectionItem | undefined>();
  const [focusIndex, setFocusIndex] = useState<number>();
  const [isMultiSelecting, setIsMultiSelecting] = useState<boolean>(false);

  const autoSelect = (autoSelection: SelectionItem[]) => {
    console.log("autoselect", autoSelection);
    setSelection((selection) => selection.concat(autoSelection));
  };

  const unselect = (unselected: SelectionItem[]) => {
    console.log("unselect", unselected);
    setSelection((selection) =>
      selection.filter(
        (item) =>
          !unselected.some(
            (uns) =>
              item.identifier == uns.identifier && uns.object == item.object
          )
      )
    );
  };

  useEffect(() => {
    if (focusIndex !== undefined) {
      const focus = selectables[focusIndex];
      if (focus) {
        console.log("focus", focus);
        setFocus(focus.selectable);
      }
    } else {
      setFocus(undefined);
    }
  }, [focusIndex]);

  useEffect(() => {
    const listener = {
      handleEvent: (e: KeyboardEvent) => {
        if ((e.key === "ArrowDown" || e.key == "ArrowRight") && e.ctrlKey) {
          setFocusIndex((i) =>
            i === undefined || i >= (selectables.length || 0) - 1 ? 0 : i + 1
          );
        }
        if ((e.key === "ArrowUp" || e.key == "ArrowLeft ") && e.ctrlKey) {
          setFocusIndex((i) => (i === undefined || i <= 0 ? 0 : i - 1));
        }
        if (e.key === "Tab") {
          setFocusIndex(undefined);
        }
      },
    };

    const onOutListener = {
      handleEvent: (e: MouseEvent) => {
        setFocusIndex(undefined);
      },
    };

    document.addEventListener("keydown", listener);
    document.addEventListener("click", onOutListener);

    return () => {
      document.removeEventListener("keydown", listener);
      document.removeEventListener("click", onOutListener);
    };
  }, [selectables]);

  useEffect(() => {
    if (isMultiSelecting) {
      const handler = (e: any) => {
        e.stopPropagation();
        if (isMultiSelecting) {
          console.log(e);
          console.log("Called");
          setIsMultiSelecting(false);
          setSelection([]);
          setBSelection([]);
        }
      };

      document.body.addEventListener("mousedown", handler);

      return () => {
        document.body.removeEventListener("mousedown", handler);
      };
    }
  }, [isMultiSelecting, setIsMultiSelecting]);

  const handleSelectionChange = (box: Box) => {
    const scrollAwareBox = {
      ...box,
      top: box.top + window.scrollY,
      left: box.left + window.scrollX,
    };

    

    if (box.width > 56 && box.height > 65) {
      const indexesToSelect: number[] = [];
      console.log(selectables);
      selectables.forEach((item, index) => {
        let lala = item.item.getBoundingClientRect();
        if (lala && boxesIntersect(scrollAwareBox, lala)) {
          indexesToSelect.push(index);
        }
      });

      setSelection((selection) =>
        selectables
          .map((item) => item.selectable)
          .filter((_, index) => indexesToSelect.includes(index))
      );
      setIsMultiSelecting(true);
    }
  };

  const { DragSelection } = useSelectionContainer({
    onSelectionChange: handleSelectionChange,
    shouldStartSelecting: (target) => {
      /**
       * In this example, we're preventing users from selecting in elements
       * that have a data-disableselect attribute on them or one of their parents
       */

      

      if (target instanceof HTMLElement) {
        let el = target;
        return el.dataset.enableselect == "true";
      }

      /**
       * If the target doesn't exist, return false
       * This would most likely not happen. It's really a TS safety check
       */
      return false;
    },
    selectionProps: {
      style: {
        border: "2px rgb(var(--color-primary-400))",
        borderRadius: 4,
        backgroundColor: "rgb(var(--color-primary-300))",
        opacity: 0.5,
      },
    },
  });

  return (
    <SelectionContext.Provider
      value={{
        selection: selection,
        bselection: bselection,
        setBSelection: setBSelection,
        setSelection: setSelection,
        autoSelect: autoSelect,
        setIsMultiSelecting,
        focus: focus,
        registerSelectables: (newselectables) => {
          setSelectables((selectables) => selectables.concat(newselectables));
        },
        unregisterSelectables(unselectables) {
          setSelectables((selectables) =>
            selectables.filter(
              (s) =>
                !unselectables.some(
                  (s2) =>
                    s2.selectable.identifier == s.selectable.identifier &&
                    s2.selectable.object == s.selectable.object
                )
            )
          );
        },

        unselect,
        isMultiSelecting,
      }}
    >
      <DragSelection />
      {children}
    </SelectionContext.Provider>
  );
};
