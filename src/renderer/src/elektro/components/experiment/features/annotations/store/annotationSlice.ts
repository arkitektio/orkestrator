import { makeViewerSliceHooks, type ViewerSliceOf } from "../../../platform/stores/viewerStore";
import type { AnnotationMarks } from "../annotationGeometry";
import type { AnnotateTool, Draft } from "../annotationTools";

/**
 * The annotations feature's slice.
 *
 *  - `annotationMarks`: every annotation layer's marks, computed ONCE per fold by
 *    the `AnnotationMarksIndexer` — read by the layer (to draw), its card (to
 *    count) and the Annotations panel (to list).
 *  - `annotateTool` / `draft`: the scene's `roiDrawingStore`, transposed. The
 *    draft moves at POINTER rate, so nothing subscribes to it through React: the
 *    preview overlay binds it imperatively (P17).
 *  - `selectedAnnotationIds`: the scene's `roiSelectionStore`. Kept across a mode
 *    switch — leaving ANNOTATE keeps what you selected highlighted.
 */
export type AnnotationSlice = {
  annotationMarks: Record<string, AnnotationMarks>;
  /** Bumped whenever any layer's marks change — the panel's scalar trigger. */
  annotationMarksVersion: number;
  setAnnotationMarks: (marks: Record<string, AnnotationMarks>) => void;

  annotateTool: AnnotateTool;
  /** Switching tools abandons an in-progress shape. */
  setAnnotateTool: (tool: AnnotateTool) => void;
  draft: Draft | null;
  setDraft: (draft: Draft | null) => void;

  /** Annotation ids → true. Replaced whole on every change. */
  selectedAnnotationIds: Record<string, true>;
  /** Bumped on every selection change — the scalar a mark layer rebinds on. */
  selectionVersion: number;
  /** Select one annotation; `additive` toggles it within the selection instead. */
  selectAnnotation: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
};

const NO_SELECTION: Record<string, true> = {};

export const createAnnotationSlice: ViewerSliceOf<AnnotationSlice> = (set, get) => ({
  annotationMarks: {},
  annotationMarksVersion: 0,
  setAnnotationMarks: (annotationMarks) =>
    set((state) => ({ annotationMarks, annotationMarksVersion: state.annotationMarksVersion + 1 })),

  annotateTool: "EVENT",
  setAnnotateTool: (annotateTool) => {
    if (get().annotateTool === annotateTool) return;
    set({ annotateTool, draft: null });
  },
  draft: null,
  setDraft: (draft) => {
    if (get().draft !== draft) set({ draft });
  },

  selectedAnnotationIds: NO_SELECTION,
  selectionVersion: 0,
  selectAnnotation: (id, additive = false) =>
    set((state) => {
      let next: Record<string, true>;
      if (!additive) {
        next = { [id]: true };
      } else if (state.selectedAnnotationIds[id]) {
        next = { ...state.selectedAnnotationIds };
        delete next[id];
      } else {
        next = { ...state.selectedAnnotationIds, [id]: true };
      }
      return { selectedAnnotationIds: next, selectionVersion: state.selectionVersion + 1 };
    }),
  clearSelection: () => {
    if (Object.keys(get().selectedAnnotationIds).length === 0) return;
    set((state) => ({ selectedAnnotationIds: NO_SELECTION, selectionVersion: state.selectionVersion + 1 }));
  },
});

const hooks = makeViewerSliceHooks<AnnotationSlice>();
export const useAnnotationStore = hooks.useSliceStore;
export const useAnnotationStoreApi = hooks.useSliceStoreApi;

/** One layer's marks (undefined until indexed, or for another kind). */
export const useAnnotationMarks = (layerId: string): AnnotationMarks | undefined =>
  useAnnotationStore((s) => s.annotationMarks[layerId]);

/** Whether one annotation is selected — a boolean, so a row re-renders only on its own flip. */
export const useIsAnnotationSelected = (annotationId: string): boolean =>
  useAnnotationStore((s) => s.selectedAnnotationIds[annotationId] === true);
