// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Structure } from "../../types";
import { createSelectionStore, selectFocus, type Selectable } from "./store";

// `isSameStructure` compares `identifier` (string) AND `object` (by reference),
// so structures that should be "the same" must share the same object reference.
const objA = { id: "a" };
const objB = { id: "b" };
const sA: Structure = { identifier: "@x/s", object: objA };
const sB: Structure = { identifier: "@x/s", object: objB };

const fakeSelectable = (
  structure: Structure,
  rect: { left: number; top: number; width: number; height: number },
): Selectable => ({
  structure,
  item: {
    getBoundingClientRect: vi.fn(() => ({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    })),
  } as unknown as HTMLElement,
});

let store: ReturnType<typeof createSelectionStore>;
beforeEach(() => {
  store = createSelectionStore();
});

describe("setSelection / setBSelection", () => {
  it("replaces the respective selection arrays", () => {
    store.getState().setSelection([sA]);
    store.getState().setBSelection([sB]);
    expect(store.getState().selection).toEqual([sA]);
    expect(store.getState().bselection).toEqual([sB]);
  });
});

describe("toggleSelection", () => {
  it("adds a structure that is not selected", () => {
    store.getState().toggleSelection(sA);
    expect(store.getState().selection).toEqual([sA]);
  });

  it("removes a structure that is already selected", () => {
    store.getState().setSelection([sA]);
    store.getState().toggleSelection(sA);
    expect(store.getState().selection).toEqual([]);
  });

  it("removes the structure from the b-selection when adding to the main selection", () => {
    store.getState().setBSelection([sA]);
    store.getState().toggleSelection(sA);
    expect(store.getState().selection).toEqual([sA]);
    expect(store.getState().bselection).toEqual([]);
  });
});

describe("toggleBSelection", () => {
  it("is mutually exclusive with the main selection", () => {
    store.getState().setSelection([sA]);
    store.getState().toggleBSelection(sA);
    expect(store.getState().bselection).toEqual([sA]);
    expect(store.getState().selection).toEqual([]);
  });
});

describe("unselect", () => {
  it("removes only the matching structures", () => {
    store.getState().setSelection([sA, sB]);
    store.getState().unselect([sA]);
    expect(store.getState().selection).toEqual([sB]);
  });
});

describe("registerSelectables / unregisterSelectables", () => {
  it("de-duplicates by element + structure", () => {
    const sel = fakeSelectable(sA, { left: 0, top: 0, width: 10, height: 10 });
    store.getState().registerSelectables([sel]);
    store.getState().registerSelectables([sel]);
    store.getState().flushSelectables();
    expect(store.getState().selectables).toHaveLength(1);
  });

  it("removes selectables by element", () => {
    const sel = fakeSelectable(sA, { left: 0, top: 0, width: 10, height: 10 });
    store.getState().registerSelectables([sel]);
    store.getState().unregisterSelectables([sel]);
    store.getState().flushSelectables();
    expect(store.getState().selectables).toHaveLength(0);
  });

  it("keeps a second element showing the same structure when one is removed", () => {
    const first = fakeSelectable(sA, { left: 0, top: 0, width: 10, height: 10 });
    const second = fakeSelectable(sA, { left: 20, top: 0, width: 10, height: 10 });
    store.getState().registerSelectables([first, second]);
    store.getState().unregisterSelectables([first]);
    store.getState().flushSelectables();
    expect(store.getState().selectables).toEqual([second]);
  });

  it("publishes once per flush, in registration order, regardless of call count", async () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const sels = Array.from({ length: 50 }, (_, i) =>
      fakeSelectable({ identifier: "@x/s", object: { id: String(i) } }, {
        left: i,
        top: 0,
        width: 1,
        height: 1,
      }),
    );
    for (const sel of sels) {
      store.getState().registerSelectables([sel]);
    }
    expect(listener).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().selectables).toEqual(sels);
    unsubscribe();
  });

  it("applies a register followed by an unregister of the same element in order", () => {
    const sel = fakeSelectable(sA, { left: 0, top: 0, width: 10, height: 10 });
    store.getState().registerSelectables([sel]);
    store.getState().unregisterSelectables([sel]);
    store.getState().registerSelectables([sel]);
    store.getState().flushSelectables();
    expect(store.getState().selectables).toEqual([sel]);
  });

  it("does not notify when a flush changes nothing", () => {
    const sel = fakeSelectable(sA, { left: 0, top: 0, width: 10, height: 10 });
    store.getState().registerSelectables([sel]);
    store.getState().flushSelectables();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.getState().registerSelectables([sel]);
    store.getState().flushSelectables();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe("clear", () => {
  it("resets selection state", () => {
    store.getState().setSelection([sA]);
    store.getState().setBSelection([sB]);
    store.getState().setIsMultiSelecting(true);
    store.getState().clear();
    const s = store.getState();
    expect(s.selection).toEqual([]);
    expect(s.bselection).toEqual([]);
    expect(s.isMultiSelecting).toBe(false);
    expect(s.focusIndex).toBeUndefined();
  });
});

describe("handleSelectionChange", () => {
  it("ignores tiny boxes (treated as clicks)", () => {
    store.getState().setSelection([sA]);
    store.getState().handleSelectionChange({ left: 0, top: 0, width: 2, height: 2 });
    // unchanged
    expect(store.getState().selection).toEqual([sA]);
    expect(store.getState().isMultiSelecting).toBe(false);
  });

  it("selects selectables whose rect intersects the drag box", () => {
    const inside = fakeSelectable(sA, { left: 10, top: 10, width: 20, height: 20 });
    const outside = fakeSelectable(sB, { left: 500, top: 500, width: 10, height: 10 });
    store.getState().registerSelectables([inside, outside]);
    // No explicit flush: handleSelectionChange flushes pending registrations.
    store.getState().handleSelectionChange({ left: 0, top: 0, width: 50, height: 50 });
    expect(store.getState().selection).toEqual([sA]);
    expect(store.getState().isMultiSelecting).toBe(true);
  });

  it("measures each selectable once per marquee while the rect cache is active", () => {
    const inside = fakeSelectable(sA, { left: 10, top: 10, width: 20, height: 20 });
    store.getState().registerSelectables([inside]);
    store.getState().beginMarquee();
    store.getState().handleSelectionChange({ left: 0, top: 0, width: 50, height: 50 });
    store.getState().handleSelectionChange({ left: 0, top: 0, width: 60, height: 60 });
    expect(inside.item.getBoundingClientRect).toHaveBeenCalledTimes(1);
    store.getState().endMarquee();
    store.getState().handleSelectionChange({ left: 0, top: 0, width: 70, height: 70 });
    expect(inside.item.getBoundingClientRect).toHaveBeenCalledTimes(2);
  });
});

describe("selectFocus", () => {
  it("returns undefined when there is no focus index", () => {
    expect(selectFocus(store.getState())).toBeUndefined();
  });

  it("returns the structure of the focused selectable", () => {
    const sel = fakeSelectable(sA, { left: 0, top: 0, width: 10, height: 10 });
    store.getState().registerSelectables([sel]);
    store.getState().flushSelectables();
    store.getState().setFocusIndex(0);
    expect(selectFocus(store.getState())).toBe(sA);
  });
});
