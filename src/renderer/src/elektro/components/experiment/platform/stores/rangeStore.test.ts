import { describe, expect, it } from "vitest";
import {
  MAX_HISTORY,
  clampWindow,
  createRangeStore,
  panBy,
  zoomAbout,
} from "./rangeStore";

const world = { start: 0, end: 1000 };

describe("clampWindow", () => {
  it("preserves width when a pan runs off the end", () => {
    // Clamping each edge independently would squash the window instead.
    expect(clampWindow({ start: 950, end: 1050 }, world)).toEqual({ start: 900, end: 1000 });
    expect(clampWindow({ start: -50, end: 50 }, world)).toEqual({ start: 0, end: 100 });
  });

  it("shows the whole world for a window wider than it", () => {
    expect(clampWindow({ start: -500, end: 5000 }, world)).toEqual(world);
  });

  it("refuses to collapse below the minimum width", () => {
    const w = clampWindow({ start: 500, end: 500 }, world, 10);
    expect(w.end - w.start).toBeCloseTo(10, 9);
    expect((w.start + w.end) / 2).toBeCloseTo(500, 9);
  });

  it("orders an inverted window", () => {
    expect(clampWindow({ start: 600, end: 400 }, world)).toEqual({ start: 400, end: 600 });
  });

  it("passes through when there is no world yet", () => {
    expect(clampWindow({ start: -5, end: 5 }, null)).toEqual({ start: -5, end: 5 });
  });
});

describe("zoomAbout / panBy", () => {
  it("keeps the anchor fixed while zooming", () => {
    const w = { start: 0, end: 100 };
    const anchor = 25;
    const z = zoomAbout(w, anchor, 0.5);
    // The anchor sits at the same FRACTION of the window before and after.
    expect((anchor - z.start) / (z.end - z.start)).toBeCloseTo(0.25, 9);
    expect(z.end - z.start).toBeCloseTo(50, 9);
  });

  it("pans without changing width", () => {
    expect(panBy({ start: 10, end: 20 }, 5)).toEqual({ start: 15, end: 25 });
  });
});

describe("range store", () => {
  it("opens on the whole world", () => {
    const store = createRangeStore({ worldSpan: world });
    expect(store.getState().committedRange).toEqual(world);
  });

  it("moves the live window without committing it", () => {
    // The two-plane split: gestures touch live only.
    const store = createRangeStore({ worldSpan: world });
    store.getState().setLiveRange({ start: 100, end: 200 });
    expect(store.getState().liveRange).toEqual({ start: 100, end: 200 });
    expect(store.getState().committedRange).toEqual(world);
    store.getState().commitRange();
    expect(store.getState().committedRange).toEqual({ start: 100, end: 200 });
  });

  it("does not notify for a live move that clamps to the same window", () => {
    const store = createRangeStore({ worldSpan: world });
    let calls = 0;
    store.subscribe(() => (calls += 1));
    store.getState().setLiveRange({ start: -100, end: 5000 }); // clamps to world
    expect(calls).toBe(0);
  });

  it("records deliberate jumps, and undoes and redoes them", () => {
    const store = createRangeStore({ worldSpan: world });
    store.getState().jumpTo({ start: 100, end: 200 });
    store.getState().jumpTo({ start: 300, end: 400 });
    store.getState().undo();
    expect(store.getState().committedRange).toEqual({ start: 100, end: 200 });
    store.getState().undo();
    expect(store.getState().committedRange).toEqual(world);
    store.getState().redo();
    expect(store.getState().committedRange).toEqual({ start: 100, end: 200 });
  });

  it("does not record live pans in history", () => {
    const store = createRangeStore({ worldSpan: world });
    store.getState().setLiveRange({ start: 10, end: 20 });
    store.getState().commitRange();
    expect(store.getState().history).toHaveLength(0);
  });

  it("clears the redo stack on a new jump", () => {
    const store = createRangeStore({ worldSpan: world });
    store.getState().jumpTo({ start: 100, end: 200 });
    store.getState().undo();
    store.getState().jumpTo({ start: 500, end: 600 });
    expect(store.getState().future).toHaveLength(0);
  });

  it("bounds history", () => {
    const store = createRangeStore({ worldSpan: { start: 0, end: 1e6 } });
    for (let i = 0; i < MAX_HISTORY + 20; i++) {
      store.getState().jumpTo({ start: i, end: i + 10 });
    }
    expect(store.getState().history.length).toBe(MAX_HISTORY);
  });

  it("fits to the world", () => {
    const store = createRangeStore({ worldSpan: world });
    store.getState().jumpTo({ start: 100, end: 200 });
    store.getState().fit();
    expect(store.getState().committedRange).toEqual(world);
  });

  it("opens on the world once it first becomes known", () => {
    const store = createRangeStore();
    store.getState().setWorld(world, 1);
    expect(store.getState().committedRange).toEqual(world);
  });

  it("keeps a restored URL range when the world arrives later", () => {
    // The `?brush=` flow: the range is known at mount, the data after. Opening
    // on the whole world here would throw away a shared link's zoom.
    const store = createRangeStore({ range: { start: 100, end: 200 } });
    store.getState().setWorld(world, 1);
    expect(store.getState().committedRange).toEqual({ start: 100, end: 200 });
  });

  it("still clamps a restored range into the world", () => {
    const store = createRangeStore({ range: { start: 900, end: 5000 } });
    store.getState().setWorld(world, 1);
    expect(store.getState().committedRange).toEqual({ start: 0, end: 1000 });
  });
});
