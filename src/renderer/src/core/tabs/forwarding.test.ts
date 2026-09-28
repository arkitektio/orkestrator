import { describe, expect, it } from "vitest";

import { activeTab, forwardedPath, openTab, quickTabsState } from "./tabs";

describe("quick bar tab forwarding", () => {
  it("is parked at the root", () => {
    expect(forwardedPath(quickTabsState(0))).toBeNull();
  });

  it("forwards a navigation of the active tab", () => {
    const state = quickTabsState(0);
    activeTab(state).history.push("/mikro/images/7?x=1");
    expect(forwardedPath(state)).toBe("/mikro/images/7?x=1");
  });

  it("forwards a tab opened in front", () => {
    expect(forwardedPath(openTab(quickTabsState(0), "/kraph/graphs/2", { now: 1 }))).toBe(
      "/kraph/graphs/2",
    );
  });

  it("forwards a tab opened in the background", () => {
    const state = openTab(quickTabsState(0), "/rekuest/actions/3", { now: 1, background: true });
    expect(forwardedPath(state)).toBe("/rekuest/actions/3");
  });
});
