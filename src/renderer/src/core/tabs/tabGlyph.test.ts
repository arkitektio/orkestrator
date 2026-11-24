import { describe, expect, it } from "vitest";
import { openTab, quickTabsState, setTabGlyph, tabGlyphOf } from "./tabs";

const blok = { identifier: "@rekuest/materialized_blok", id: "7" };

describe("a tab's glyph", () => {
  it("is shown while the tab is on the page that set it", () => {
    const opened = openTab(quickTabsState(0), "/rekuest/materialized_bloks/7", { now: 1 });
    const tab = opened.tabs.find((t) => t.id === opened.activeId)!;
    const withGlyph = setTabGlyph(opened, tab.id, blok, "/rekuest/materialized_bloks/7");
    const shown = withGlyph.tabs.find((t) => t.id === tab.id)!;
    expect(tabGlyphOf(shown)).toEqual({ ...blok, pathname: "/rekuest/materialized_bloks/7" });
  });

  it("is not shown once the tab is on another page", () => {
    const opened = openTab(quickTabsState(0), "/rekuest/materialized_bloks/7", { now: 1 });
    const tab = opened.tabs.find((t) => t.id === opened.activeId)!;
    const withGlyph = setTabGlyph(opened, tab.id, blok, "/rekuest/elsewhere");
    expect(tabGlyphOf(withGlyph.tabs.find((t) => t.id === tab.id)!)).toBeNull();
  });

  it("changes nothing when set to what it is, and is dropped with null", () => {
    const opened = openTab(quickTabsState(0), "/rekuest/materialized_bloks/7", { now: 1 });
    const id = opened.activeId!;
    const once = setTabGlyph(opened, id, blok, "/rekuest/materialized_bloks/7");
    expect(setTabGlyph(once, id, blok, "/rekuest/materialized_bloks/7")).toBe(once);
    const dropped = setTabGlyph(once, id, null, "/rekuest/materialized_bloks/7");
    expect(dropped.tabs.find((t) => t.id === id)!.glyph).toBeUndefined();
  });
});
