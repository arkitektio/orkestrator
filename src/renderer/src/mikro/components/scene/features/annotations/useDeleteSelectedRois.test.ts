// @vitest-environment jsdom
// (the hook module pulls the generated Apollo layer, which touches `window`)
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("@/mikro/api/graphql", () => ({
  useDeleteAnnotationMutation: () => [mocks.mutate, { loading: false }],
}));

vi.mock("@/core/notify", () => ({
  reportError: mocks.reportError,
  toast: { warning: vi.fn() },
}));

vi.mock("../../../../lib/annotations/annotationCache", () => ({
  removeSceneAnnotation: vi.fn(),
}));

import { RoiSelectionStoreContext, createRoiSelectionStore, type SelectedRoi } from "./roiSelectionStore";
import { selectionLayerIds, useDeleteRoi } from "./useDeleteSelectedRois";

const roi = { id: "1", layerId: "a" } as SelectedRoi;

let store: ReturnType<typeof createRoiSelectionStore>;

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(RoiSelectionStoreContext.Provider, { value: store }, children);

beforeEach(() => {
  mocks.mutate.mockReset();
  mocks.reportError.mockReset();
  store = createRoiSelectionStore();
  store.getState().selectOnlyRoi(roi);
});

describe("selectionLayerIds", () => {
  it("names each layer once — the multi-collection delete guard's input", () => {
    expect(selectionLayerIds([])).toEqual([]);
    expect(selectionLayerIds([{ layerId: "a" }, { layerId: "a" }])).toEqual(["a"]);
    expect(selectionLayerIds([{ layerId: "a" }, { layerId: "b" }, { layerId: "a" }])).toEqual(["a", "b"]);
  });
});

describe("useDeleteRoi", () => {
  it("deletes the one shape and drops it from the selection", async () => {
    mocks.mutate.mockResolvedValue({});
    const { result } = renderHook(() => useDeleteRoi(), { wrapper });

    await act(() => result.current.deleteRoi("1"));

    expect(mocks.mutate).toHaveBeenCalledWith({ variables: { input: { id: "1" } } });
    expect(store.getState().selectedRois).toEqual([]);
    expect(result.current.deletingIds.size).toBe(0);
  });

  it("marks the shape while the delete runs", async () => {
    let finish = () => {};
    mocks.mutate.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useDeleteRoi(), { wrapper });

    let pending = Promise.resolve();
    act(() => {
      pending = result.current.deleteRoi("1");
    });
    expect(result.current.deletingIds.has("1")).toBe(true);

    await act(async () => {
      finish();
      await pending;
    });
    expect(result.current.deletingIds.has("1")).toBe(false);
  });

  it("keeps a refused shape selected and says why", async () => {
    const refusal = new Error("nope");
    mocks.mutate.mockRejectedValue(refusal);
    const { result } = renderHook(() => useDeleteRoi(), { wrapper });

    await act(() => result.current.deleteRoi("1"));

    expect(mocks.reportError).toHaveBeenCalledWith(refusal, "Couldn't delete the annotation");
    expect(store.getState().selectedRois.map((r) => r.id)).toEqual(["1"]);
    expect(result.current.deletingIds.size).toBe(0);
  });
});
