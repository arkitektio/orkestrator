import { describe, expect, it } from "vitest";
import type { SerializedDockview } from "dockview";

import { hasRestorablePanels, widgetKeysToAdd } from "./dashboardLayout";

const layoutWith = (panelIds: string[]) =>
  ({
    panels: Object.fromEntries(panelIds.map((id) => [id, { id }])),
  }) as unknown as SerializedDockview;

describe("hasRestorablePanels", () => {
  it("accepts a layout that holds panels", () => {
    expect(hasRestorablePanels(layoutWith(["tasks"]))).toBe(true);
  });

  it("rejects a layout saved off a torn-down grid", () => {
    expect(hasRestorablePanels(layoutWith([]))).toBe(false);
  });

  it("rejects nothing saved at all", () => {
    expect(hasRestorablePanels(null)).toBe(false);
    expect(hasRestorablePanels(undefined)).toBe(false);
    expect(hasRestorablePanels({} as SerializedDockview)).toBe(false);
  });
});

describe("widgetKeysToAdd", () => {
  it("returns the widgets that have no panel yet", () => {
    expect(widgetKeysToAdd(["a", "b", "c"], new Set(["a"]), ["b"])).toEqual(["c"]);
  });

  it("leaves closed widgets closed", () => {
    expect(widgetKeysToAdd(["a"], new Set(["a"]), [])).toEqual([]);
  });

  it("never re-adds a key the grid already holds", () => {
    // `addPanel` throws on a duplicate id, so this is the guard that keeps an
    // effect from taking the dashboard down.
    expect(widgetKeysToAdd(["a"], new Set(), ["a"])).toEqual([]);
  });

  it("adds everything on a fresh grid", () => {
    expect(widgetKeysToAdd(["a", "b"], new Set(), [])).toEqual(["a", "b"]);
  });
});
