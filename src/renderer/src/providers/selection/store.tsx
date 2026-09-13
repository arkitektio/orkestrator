import { Box, boxesIntersect } from "@air/react-drag-to-select";
import { createStore, StoreApi } from "zustand/vanilla";

import { Structure } from "../../types";

export interface Selectable {
  structure: Structure;
  item: HTMLElement;
}

const isSameStructure = (left: Structure, right: Structure) =>
  left.identifier === right.identifier && left.object === right.object;

export interface SelectionState {
  selection: Structure[];
  bselection: Structure[];
  /**
   * Registered selectable elements in registration order (which, for a single
   * React commit, is DOM order). Keyboard focus (`focusIndex`) and marquee
   * selection index into / iterate this array.
   *
   * Registration is batched: `registerSelectables` / `unregisterSelectables`
   * queue their changes and publish one new array per microtask, so mounting a
   * list of N cards costs one store notification rather than N. Call
   * `flushSelectables()` when the current array is needed synchronously.
   */
  selectables: Selectable[];
  focusIndex: number | undefined;
  isMultiSelecting: boolean;
  setSelection: (selection: Structure[]) => void;
  setBSelection: (bselection: Structure[]) => void;
  setFocusIndex: (
    updater: number | undefined | ((prev?: number) => number | undefined),
  ) => void;
  setIsMultiSelecting: (isMultiSelecting: boolean) => void;
  registerSelectables: (newItems: Selectable[]) => void;
  unregisterSelectables: (items: Selectable[]) => void;
  /** Apply pending register/unregister calls now (no-op when nothing is pending). */
  flushSelectables: () => void;
  unselect: (structures: Structure[]) => void;
  toggleSelection: (structure: Structure) => void;
  toggleBSelection: (structure: Structure) => void;
  clear: () => void;
  /**
   * Marquee (drag-to-select) lifecycle. While a marquee is active the
   * bounding rects of all selectables are cached so that
   * `handleSelectionChange`, which runs on every mouse move, does not force a
   * layout per selectable per frame. The cache is invalidated on scroll.
   */
  beginMarquee: () => void;
  endMarquee: () => void;
  handleSelectionChange: (box: Box) => void;
}

export type SelectionStore = StoreApi<SelectionState>;

type PendingOp =
  | { type: "add"; selectable: Selectable }
  | { type: "remove"; item: HTMLElement };

const scheduleMicrotask = (fn: () => void) => {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(fn);
  } else {
    void Promise.resolve().then(fn);
  }
};

export const createSelectionStore = (): SelectionStore => {
  // Node-keyed registry. A Map keeps insertion order, so `Array.from(values())`
  // is the registration-ordered array the rest of the app expects.
  const byNode = new Map<HTMLElement, Selectable>();
  let pending: PendingOp[] = [];
  let flushScheduled = false;

  // Marquee rect cache (see `beginMarquee`).
  let rectCache: Map<HTMLElement, DOMRect> | null = null;
  const invalidateRects = () => {
    if (rectCache) {
      rectCache.clear();
    }
  };

  return createStore<SelectionState>((set, get) => {
    const flush = () => {
      flushScheduled = false;
      if (pending.length === 0) {
        return;
      }
      const ops = pending;
      pending = [];

      let changed = false;
      for (const op of ops) {
        if (op.type === "add") {
          const existing = byNode.get(op.selectable.item);
          if (
            existing &&
            isSameStructure(existing.structure, op.selectable.structure)
          ) {
            continue;
          }
          byNode.set(op.selectable.item, op.selectable);
          changed = true;
        } else if (byNode.delete(op.item)) {
          changed = true;
        }
      }

      if (changed) {
        invalidateRects();
        set({ selectables: Array.from(byNode.values()) });
      }
    };

    const schedule = () => {
      if (!flushScheduled) {
        flushScheduled = true;
        scheduleMicrotask(flush);
      }
    };

    return {
      selection: [],
      bselection: [],
      selectables: [],
      focusIndex: undefined,
      isMultiSelecting: false,

      setSelection: (selection) => set({ selection }),
      setBSelection: (bselection) => set({ bselection }),
      setFocusIndex: (updater) =>
        set((state) => ({
          focusIndex:
            typeof updater === "function" ? updater(state.focusIndex) : updater,
        })),
      setIsMultiSelecting: (isMultiSelecting) => set({ isMultiSelecting }),

      registerSelectables: (newItems) => {
        for (const selectable of newItems) {
          pending.push({ type: "add", selectable });
        }
        schedule();
      },

      unregisterSelectables: (toRemove) => {
        for (const selectable of toRemove) {
          pending.push({ type: "remove", item: selectable.item });
        }
        schedule();
      },

      flushSelectables: flush,

      unselect: (structures) =>
        set((state) => ({
          selection: state.selection.filter(
            (item) =>
              !structures.some((candidate) => isSameStructure(candidate, item)),
          ),
        })),

      toggleSelection: (structure) =>
        set((state) => {
          const exists = state.selection.some((item) =>
            isSameStructure(item, structure),
          );

          if (exists) {
            return {
              selection: state.selection.filter(
                (item) => !isSameStructure(item, structure),
              ),
            };
          }

          return {
            selection: [...state.selection, structure],
            bselection: state.bselection.filter(
              (item) => !isSameStructure(item, structure),
            ),
          };
        }),

      toggleBSelection: (structure) =>
        set((state) => {
          const exists = state.bselection.some((item) =>
            isSameStructure(item, structure),
          );

          if (exists) {
            return {
              bselection: state.bselection.filter(
                (item) => !isSameStructure(item, structure),
              ),
            };
          }

          return {
            bselection: [...state.bselection, structure],
            selection: state.selection.filter(
              (item) => !isSameStructure(item, structure),
            ),
          };
        }),

      clear: () =>
        set({
          selection: [],
          bselection: [],
          focusIndex: undefined,
          isMultiSelecting: false,
        }),

      beginMarquee: () => {
        flush();
        rectCache = new Map();
        if (typeof document !== "undefined") {
          document.addEventListener("scroll", invalidateRects, {
            capture: true,
            passive: true,
          });
        }
      },

      endMarquee: () => {
        rectCache = null;
        if (typeof document !== "undefined") {
          document.removeEventListener("scroll", invalidateRects, {
            capture: true,
          });
        }
      },

      handleSelectionChange: (box) => {
        flush();
        const { selectables, bselection } = get();
        if (box.width <= 5 && box.height <= 5) {
          return;
        }

        const scrollAwareBox = {
          ...box,
          top: box.top + window.scrollY,
          left: box.left + window.scrollX,
        };

        const cache = rectCache;
        const rectOf = (item: HTMLElement) => {
          if (!cache) {
            return item.getBoundingClientRect();
          }
          let rect = cache.get(item);
          if (!rect) {
            rect = item.getBoundingClientRect();
            cache.set(item, rect);
          }
          return rect;
        };

        const selection: Structure[] = [];
        for (const item of selectables) {
          if (boxesIntersect(scrollAwareBox, rectOf(item.item))) {
            selection.push(item.structure);
          }
        }

        set({
          selection,
          isMultiSelecting: true,
          bselection: bselection.filter(
            (item) =>
              !selection.some((candidate) => isSameStructure(candidate, item)),
          ),
        });
      },
    };
  });
};

export const selectFocus = (state: SelectionState): Structure | undefined => {
  if (state.focusIndex === undefined) {
    return undefined;
  }

  return state.selectables[state.focusIndex]?.structure;
};
