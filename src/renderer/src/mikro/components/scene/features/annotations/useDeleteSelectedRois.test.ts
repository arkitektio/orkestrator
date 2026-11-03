// @vitest-environment jsdom
// (the hook module pulls the generated Apollo layer, which touches `window`)
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  reportError: vi.fn(),
  removeSceneAnnotation: vi.fn(),
  // What the preflight decided: cascade or not, and which shapes go along.
  verdict: { cascade: false, alsoGone: [] as string[] },
}));

vi.mock("@/mikro/api/graphql", () => ({
  useDeleteAnnotationMutation: () => [mocks.mutate, { loading: false, client: { cache: "cache" } }],
}));

// The preflight and its toast are `useLineageSafeAnnotationDelete`'s; here it
// hands the delete straight on with the verdict the test set.
vi.mock("../../../../lib/deletion/useLineageSafeAnnotationDelete", () => ({
  useLineageSafeAnnotationDelete:
    () =>
    (ids: string[], run: (ids: string[], cascade: boolean, alsoGone: string[]) => Promise<void>) =>
      run(ids, mocks.verdict.cascade, mocks.verdict.alsoGone),
}));

vi.mock("@/core/notify", () => ({
  reportError: mocks.reportError,
  toast: { warning: vi.fn() },
}));

vi.mock("../../../../lib/annotations/annotationCache", () => ({
  removeSceneAnnotation: mocks.removeSceneAnnotation,
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
  mocks.removeSceneAnnotation.mockReset();
  mocks.verdict = { cascade: false, alsoGone: [] };
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

    expect(mocks.mutate).toHaveBeenCalledWith({ variables: { input: { id: "1", cascade: false } } });
    expect(store.getState().selectedRois).toEqual([]);
    expect(result.current.deletingIds.size).toBe(0);
  });

  it("cascades once agreed, and drops what went along from the lists", async () => {
    mocks.mutate.mockResolvedValue({});
    mocks.verdict = { cascade: true, alsoGone: ["2"] };
    store.getState().mergeSelectedRois([{ id: "2", layerId: "a" } as SelectedRoi]);
    const { result } = renderHook(() => useDeleteRoi(), { wrapper });

    await act(() => result.current.deleteRoi("1"));

    expect(mocks.mutate).toHaveBeenCalledWith({ variables: { input: { id: "1", cascade: true } } });
    expect(mocks.removeSceneAnnotation).toHaveBeenCalledWith("cache", "2");
    expect(store.getState().selectedRois).toEqual([]);
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
