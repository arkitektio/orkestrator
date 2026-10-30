// @vitest-environment jsdom
// (the generated `graphql.ts` enums are runtime values, and importing that
// module pulls in the Apollo hooks barrel, which touches `window` on load)
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HOVER_GRACE_MS,
  createRoiSelectionStore,
  type SelectedRoi,
  findVisibleRoi,
  type VisibleRoi,
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

  it("records where the pointer entered a shape, once per hover", () => {
    const store = createRoiSelectionStore();
    expect(store.getState().hoverPoint()).toBeNull();
    store.getState().hoverRoi(roi("ann:1", "layer:a"), [1, 2, 3]);
    expect(store.getState().hoverPoint()).toEqual([1, 2, 3]);
    // Later moves over the same shape do not drag the point along.
    store.getState().hoverRoi(roi("ann:1", "layer:a"), [9, 9, 9]);
    expect(store.getState().hoverPoint()).toEqual([1, 2, 3]);
    // Another shape is another hover; one without a point reports none.
    store.getState().hoverRoi(roi("ann:2", "layer:a"), [4, 5, 6]);
    expect(store.getState().hoverPoint()).toEqual([4, 5, 6]);
    store.getState().hoverRoi(roi("ann:3", "layer:a"));
    expect(store.getState().hoverPoint()).toBeNull();
    // And nothing hovered means no point.
    store.getState().hoverRoi(roi("ann:4", "layer:a"), [7, 8, 9]);
    store.getState().unhoverRoi("ann:4");
    vi.advanceTimersByTime(HOVER_GRACE_MS);
    expect(store.getState().hoverPoint()).toBeNull();
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

  it("a held hover is not taken over by another shape; released, the next move takes it", () => {
    const store = createRoiSelectionStore();
    store.getState().hoverRoi(roi("ann:1", "layer:a"), [1, 2, 3]);
    store.getState().holdHover(true);

    store.getState().hoverRoi(roi("ann:2", "layer:a"), [9, 9, 9]);
    expect(store.getState().hoveredRoi?.id).toBe("ann:1");
    expect(store.getState().hoverPoint()).toEqual([1, 2, 3]);

    store.getState().holdHover(false);
    store.getState().hoverRoi(roi("ann:2", "layer:a"), [9, 9, 9]);
    expect(store.getState().hoveredRoi?.id).toBe("ann:2");
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

/** The click menu's target: one shape and where it was clicked. */
describe("menuRoi", () => {
  it("opens on a shape at the clicked point, and closes", () => {
    const store = createRoiSelectionStore();
    store.getState().openRoiMenu(roi("ann:1", "layer:a"), [1, 2, 3]);
    expect(store.getState().menuRoi).toEqual({ roi: roi("ann:1", "layer:a"), point: [1, 2, 3] });

    store.getState().openRoiMenu(roi("ann:2", "layer:a"));
    expect(store.getState().menuRoi).toEqual({ roi: roi("ann:2", "layer:a"), point: null });

    store.getState().closeRoiMenu();
    expect(store.getState().menuRoi).toBeNull();
  });

  it("closes with its layer", () => {
    const store = createRoiSelectionStore();
    store.getState().openRoiMenu(roi("ann:1", "layer:a"));
    store.getState().dropLayerSelections(["layer:a"]);
    expect(store.getState().menuRoi).toBeNull();

    store.getState().openRoiMenu(roi("ann:2", "layer:b"));
    store.getState().clearVisibleLayerRois("layer:b");
    expect(store.getState().menuRoi).toBeNull();
  });
});

describe("visibleRois", () => {
  const visible = (id: string, layerId: string) =>
    ({ id, layerId, vectors: [[0, 0, 0]], bounds: {}, zSpan: {} }) as unknown as VisibleRoi;

  it("replaces one layer's shapes and leaves the others", () => {
    const store = createRoiSelectionStore();
    const { setVisibleLayerRois } = store.getState();
    setVisibleLayerRois("a", [visible("1", "a"), visible("2", "a")]);
    setVisibleLayerRois("b", [visible("3", "b")]);
    setVisibleLayerRois("a", [visible("4", "a")]);
    const { visibleRois } = store.getState();
    expect([...visibleRois.a.keys()]).toEqual(["4"]);
    expect(visibleRois.b.size).toBe(1);
    expect(findVisibleRoi(visibleRois, "3")?.layerId).toBe("b");
    expect(findVisibleRoi(visibleRois, "1")).toBeUndefined();
  });

  it("is not walked by the store's other writes", () => {
    const store = createRoiSelectionStore();
    const roi = visible("1", "a");
    store.getState().setVisibleLayerRois("a", [roi]);
    store.getState().hoverRoi(visible("2", "b"));
    store.getState().selectOnlyRoi(visible("2", "b"));
    // Immer freezes whatever it walks: a frozen roi means it read all of them.
    expect(Object.isFrozen(roi)).toBe(false);
    expect(store.getState().visibleRois.a.get("1")).toBe(roi);
  });

  it("clearing a layer drops its shapes, and its hover and menu with it", () => {
    const store = createRoiSelectionStore();
    const roi = visible("1", "a");
    store.getState().setVisibleLayerRois("a", [roi]);
    store.getState().setVisibleLayerRois("b", [visible("2", "b")]);
    store.getState().hoverRoi(roi);
    store.getState().openRoiMenu(roi);
    store.getState().clearVisibleLayerRois("a");
    const state = store.getState();
    expect(state.visibleRois.a).toBeUndefined();
    expect(state.visibleRois.b.size).toBe(1);
    expect(state.hoveredRoi).toBeNull();
    expect(state.menuRoi).toBeNull();
  });
});
