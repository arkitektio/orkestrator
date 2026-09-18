import { makeViewerSliceHooks, type ViewerSliceOf } from "../../../platform/stores/viewerStore";
import type { AnnotationMarks } from "../annotationGeometry";

/**
 * The annotations feature's slice: every annotation layer's marks, computed ONCE
 * per fold by the `AnnotationMarksIndexer` — and read by the layer (to draw),
 * its card (to count) and the Annotations panel (to list), which used to compute
 * them three times.
 */
export type AnnotationSlice = {
  annotationMarks: Record<string, AnnotationMarks>;
  /** Bumped whenever any layer's marks change — the panel's scalar trigger. */
  annotationMarksVersion: number;
  setAnnotationMarks: (marks: Record<string, AnnotationMarks>) => void;
};

export const createAnnotationSlice: ViewerSliceOf<AnnotationSlice> = (set) => ({
  annotationMarks: {},
  annotationMarksVersion: 0,
  setAnnotationMarks: (annotationMarks) =>
    set((state) => ({ annotationMarks, annotationMarksVersion: state.annotationMarksVersion + 1 })),
});

const hooks = makeViewerSliceHooks<AnnotationSlice>();
export const useAnnotationStore = hooks.useSliceStore;
export const useAnnotationStoreApi = hooks.useSliceStoreApi;

/** One layer's marks (undefined until indexed, or for another kind). */
export const useAnnotationMarks = (layerId: string): AnnotationMarks | undefined =>
  useAnnotationStore((s) => s.annotationMarks[layerId]);
