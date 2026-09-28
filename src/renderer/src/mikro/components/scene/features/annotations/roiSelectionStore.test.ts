// @vitest-environment jsdom
// (the generated `graphql.ts` enums are runtime values, and importing that
// module pulls in the Apollo hooks barrel, which touches `window` on load)
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HOVER_GRACE_MS,
  createRoiSelectionStore,
  type SelectedRoi,
} from "./roiSelectionStore";

const roi = (id: string, layerId: string): SelectedRoi => ({
  id,
  layerId,
  name: id,
  kind: "RECTANGLE" as never,
  systemId: "cs:1",
  axisNames: ["z", "y", "x"],
  vectors: [[0, 0, 0]],
  coordinates: [],
});

/**
 * A selection must not outlive its layer: a selected shape whose layer is
 * gone keeps describing something that is no longer in the scene.
 */
describe("dropLayerSelections", () => {
  it("drops selections belonging to a departed layer", () => {
    const store = createRoiSelectionStore();
    store.getState().replaceSelectedRois([roi("ann:1", "layer:a"), roi("ann:2", "layer:b")]);

    store.getState().dropLayerSelections(["layer:a"]);

    expect(store.getState().selectedRois.map((r) => r.id)).toEqual(["ann:2"]);
  });

  it("drops several layers at once", () => {
    const store = createRoiSelectionStore();
    store
      .getState()
      .replaceSelectedRois([
        roi("ann:1", "layer:a"),
        roi("ann:2", "layer:b"),
        roi("ann:3", "layer:c"),
      ]);

    store.getState().dropLayerSelections(["layer:a", "layer:c"]);

    expect(store.getState().selectedRois.map((r) => r.id)).toEqual(["ann:2"]);
  });

  it("leaves the list untouched when nothing was selected in those layers", () => {
    // Runs on every reconcile that removes a layer, so a no-op must not
    // publish a new array and re-render every selection consumer.
    const store = createRoiSelectionStore();
    store.getState().replaceSelectedRois([roi("ann:1", "layer:a")]);
    const before = store.getState().selectedRois;

    store.getState().dropLayerSelections(["layer:z"]);

    expect(store.getState().selectedRois).toBe(before);
  });

  it("is a no-op on an empty removal list", () => {
    const store = createRoiSelectionStore();
    store.getState().replaceSelectedRois([roi("ann:1", "layer:a")]);

    store.getState().dropLayerSelections([]);

    expect(store.getState().selectedRois).toHaveLength(1);
  });
});

/**
 * The hover behind the attached action button: enter is immediate, leave is
 * forgiven for a grace period (the pointer has to reach the button), and the
 * overlay can hold it open while the pointer is on the button or its popover
 * is showing.
 */
describe("hoveredRoi", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("hovers immediately and clears only after the grace", () => {
    const store = createRoiSelectionStore();
    store.getState().hoverRoi(roi("ann:1", "layer:a"));
    expect(store.getState().hoveredRoi?.id).toBe("ann:1");

    store.getState().unhoverRoi("ann:1");
    expect(store.getState().hoveredRoi?.id).toBe("ann:1");
    vi.advanceTimersByTime(HOVER_GRACE_MS - 1);
    expect(store.getState().hoveredRoi?.id).toBe("ann:1");
    vi.advanceTimersByTime(1);
    expect(store.getState().hoveredRoi).toBeNull();
  });

  it("re-entering (or entering another shape) cancels a pending clear", () => {
    const store = createRoiSelectionStore();
    store.getState().hoverRoi(roi("ann:1", "layer:a"));
    store.getState().unhoverRoi("ann:1");
    store.getState().hoverRoi(roi("ann:2", "layer:a"));
    vi.advanceTimersByTime(HOVER_GRACE_MS * 2);
    expect(store.getState().hoveredRoi?.id).toBe("ann:2");
  });

  it("ignores a leave for a shape that is not the hovered one", () => {
    const store = createRoiSelectionStore();
    store.getState().hoverRoi(roi("ann:2", "layer:a"));
    store.getState().unhoverRoi("ann:1");
    vi.advanceTimersByTime(HOVER_GRACE_MS * 2);
    expect(store.getState().hoveredRoi?.id).toBe("ann:2");
  });

  it("keeps the same hovered object identity for a repeated enter", () => {
    const store = createRoiSelectionStore();
    const first = roi("ann:1", "layer:a");
    store.getState().hoverRoi(first);
    store.getState().hoverRoi({ ...first });
    expect(store.getState().hoveredRoi).toBe(first);
  });

  it("holding keeps the hover past the grace; releasing clears after it", () => {
    const store = createRoiSelectionStore();
    store.getState().hoverRoi(roi("ann:1", "layer:a"));
    store.getState().holdHover(true);
    store.getState().unhoverRoi("ann:1");
    vi.advanceTimersByTime(HOVER_GRACE_MS * 5);
    expect(store.getState().hoveredRoi?.id).toBe("ann:1");

    store.getState().holdHover(false);
    expect(store.getState().hoveredRoi?.id).toBe("ann:1");
    vi.advanceTimersByTime(HOVER_GRACE_MS);
    expect(store.getState().hoveredRoi).toBeNull();
  });

  it("a hold taken during the grace cancels the clear", () => {
    const store = createRoiSelectionStore();
    store.getState().hoverRoi(roi("ann:1", "layer:a"));
    store.getState().unhoverRoi("ann:1");
    vi.advanceTimersByTime(HOVER_GRACE_MS - 1);
    store.getState().holdHover(true);
    vi.advanceTimersByTime(HOVER_GRACE_MS * 5);
    expect(store.getState().hoveredRoi?.id).toBe("ann:1");
  });

  it("a release without a hold is a no-op (a departing button must not clear)", () => {
    const store = createRoiSelectionStore();
    store.getState().hoverRoi(roi("ann:1", "layer:a"));
    store.getState().holdHover(false);
    vi.advanceTimersByTime(HOVER_GRACE_MS * 5);
    expect(store.getState().hoveredRoi?.id).toBe("ann:1");
  });

  it("drops with its layer", () => {
    const store = createRoiSelectionStore();
    store.getState().hoverRoi(roi("ann:1", "layer:a"));
    store.getState().dropLayerSelections(["layer:a"]);
    expect(store.getState().hoveredRoi).toBeNull();

    store.getState().hoverRoi(roi("ann:2", "layer:b"));
    store.getState().clearVisibleLayerRois("layer:b");
    expect(store.getState().hoveredRoi).toBeNull();
  });
});
