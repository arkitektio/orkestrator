import { describe, expect, it } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import { createViewerStore } from "../../../platform/stores/viewerStore";
import { createAnnotationSlice, type AnnotationSlice } from "./annotationSlice";

const store = () => createViewerStore([createAnnotationSlice]) as unknown as StoreApi<AnnotationSlice>;

describe("annotationSlice", () => {
  it("selects, adds, toggles and clears", () => {
    const s = store();
    s.getState().selectAnnotation("a");
    s.getState().selectAnnotation("b");
    expect(s.getState().selectedAnnotationIds).toEqual({ b: true });
    s.getState().selectAnnotation("a", true);
    expect(s.getState().selectedAnnotationIds).toEqual({ a: true, b: true });
    s.getState().selectAnnotation("b", true);
    expect(s.getState().selectedAnnotationIds).toEqual({ a: true });
    const version = s.getState().selectionVersion;
    s.getState().clearSelection();
    expect(s.getState().selectedAnnotationIds).toEqual({});
    expect(s.getState().selectionVersion).toBe(version + 1);
    // Clearing nothing is not a change.
    s.getState().clearSelection();
    expect(s.getState().selectionVersion).toBe(version + 1);
  });

  it("switching tools drops the draft", () => {
    const s = store();
    s.getState().setAnnotateTool("PATH");
    s.getState().setDraft({ tool: "PATH", points: [], cursor: null, row: null, dragging: false });
    s.getState().setAnnotateTool("PATH");
    expect(s.getState().draft).not.toBeNull();
    s.getState().setAnnotateTool("LINE");
    expect(s.getState().draft).toBeNull();
  });
});
