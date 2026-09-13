import { useSelectionContainer } from "@air/react-drag-to-select";
import React, { useEffect, useState } from "react";
import { useStore } from "zustand";

import { SelectionContext } from "./SelectionContext";
import { SelectionBox } from "./components/SelectionBox";
import { createSelectionStore } from "./store";
export type ArkitektProps = { children: React.ReactNode };

export const SelectionProvider: React.FC<ArkitektProps> = ({ children }) => {
  // Created once per provider (lazy initializer), never re-created.
  const [store] = useState(createSelectionStore);
  const setFocusIndex = useStore(store, (state) => state.setFocusIndex);
  const handleSelectionChange = useStore(
    store,
    (state) => state.handleSelectionChange,
  );
  const beginMarquee = useStore(store, (state) => state.beginMarquee);
  const endMarquee = useStore(store, (state) => state.endMarquee);

  // The keyboard handlers read `selectables` from the store on demand instead
  // of subscribing to it: subscribing rerendered the provider (and rebound
  // the document listeners) every time a list of cards mounted or unmounted.
  useEffect(() => {
    const listener = {
      handleEvent: (e: KeyboardEvent) => {
        if ((e.key === "ArrowDown" || e.key == "ArrowRight") && e.ctrlKey) {
          store.getState().flushSelectables();
          const count = store.getState().selectables.length;
          setFocusIndex((i) =>
            i === undefined || i >= (count || 0) - 1 ? 0 : i + 1,
          );
        }
        if ((e.key === "ArrowUp" || e.key == "ArrowLeft") && e.ctrlKey) {
          setFocusIndex((i) => (i === undefined || i <= 0 ? 0 : i - 1));
        }
        if (e.key === "Tab") {
          setFocusIndex(undefined);
        }
      },
    };

    const onOutListener = {
      handleEvent: () => {
        setFocusIndex(undefined);
      },
    };

    document.addEventListener("keydown", listener);
    document.addEventListener("click", onOutListener);

    return () => {
      document.removeEventListener("keydown", listener);
      document.removeEventListener("click", onOutListener);
    };
  }, [store, setFocusIndex]);

  const { DragSelection } = useSelectionContainer({
    onSelectionStart: beginMarquee,
    onSelectionEnd: endMarquee,
    onSelectionChange: handleSelectionChange,
    shouldStartSelecting: (target) => {
      /**
       * In this example, we're preventing users from selecting in elements
       * that have a data-disableselect attribute on them or one of their parents
       */

      if (target instanceof HTMLElement) {
        const el = target;
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
        border: "2px orange dashed",
        borderRadius: 4,
        backgroundColor: "orange",
        opacity: 0,
      },
    },
  });

  return (
    <SelectionContext.Provider value={store}>
      <DragSelection />
      {children}
      <SelectionBox />
    </SelectionContext.Provider>
  );
};
