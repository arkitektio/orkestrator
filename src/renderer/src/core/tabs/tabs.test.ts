import { beforeEach, describe, expect, it } from "vitest";

import {
  activeTab,
  BESIDE_LAYOUT,
  bootTabs,
  closeOtherTabs,
  closeTab,
  createTab,
  focusTab,
  labelForPath,
  loadTabs,
  locationPathOf,
  MAX_TABS,
  MAX_WARM,
  moveTab,
  openTab,
  saveTabs,
  serializeTabs,
  setTabLabel,
  setTabPinned,
  openTabBeside,
  shownSplit,
  splitPartnerId,
  splitTab,
  splitTabWith,
  swapSplit,
  tabsStorageKey,
  toggleSplit,
  unsplit,
  warmIds,
  NEW_TAB_PATH,
  type TabsState,
} from "./tabs";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return Array.from(this.map.keys())[i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, v); }
}

let storage: MemoryStorage;
beforeEach(() => { storage = new MemoryStorage(); });

const stateOf = (...paths: string[]): TabsState => {
  const tabs = paths.map((p, i) => createTab(p, { id: `t${i}`, now: i }));
  const activeId = tabs[tabs.length - 1].id;
  return { tabs, activeId, viewId: activeId };
};
const ids = (s: TabsState) => s.tabs.map((t) => t.id);

describe("labelForPath", () => {
  it("names a tab after its last path segment until the page says otherwise", () => {
    expect(labelForPath("/mikro/arraydatasets")).toBe("Arraydatasets");
    expect(labelForPath("/")).toBe("Home");
    expect(labelForPath("/a/b?x=1")).toBe("B");
  });
});

describe("openTab", () => {
  it("appends and focuses the new tab", () => {
    const s = openTab(stateOf("/a"), "/b", { now: 5 });
    expect(s.tabs).toHaveLength(2);
    expect(locationPathOf(activeTab(s))).toBe("/b");
  });

  it("can open in the background, like a middle-click", () => {
    const s = openTab(stateOf("/a"), "/b", { background: true });
    expect(s.tabs).toHaveLength(2);
    expect(locationPathOf(activeTab(s))).toBe("/a");
  });

  it("gives each tab its own history", () => {
    const s = openTab(stateOf("/a"), "/b");
    s.tabs[1].history.push("/b/deeper");
    expect(locationPathOf(s.tabs[0])).toBe("/a");
    expect(locationPathOf(s.tabs[1])).toBe("/b/deeper");
  });

  it("refuses at the cap by default — a visible no-op the user can act on", () => {
    const full = stateOf(...Array.from({ length: MAX_TABS }, (_, i) => `/p${i}`));
    const s = openTab(full, "/one-more");
    expect(s).toBe(full);
  });

  it("evicts the least recently used non-active tab when asked to", () => {
    // Deep links must land somewhere even at the cap.
    const full = stateOf(...Array.from({ length: MAX_TABS }, (_, i) => `/p${i}`));
    const s = openTab(full, "/deep", { evict: true, now: 999 });
    expect(s.tabs).toHaveLength(MAX_TABS);
    expect(ids(s)).not.toContain("t0"); // oldest, and not active
    expect(locationPathOf(activeTab(s))).toBe("/deep");
  });
});

describe("focusTab", () => {
  it("focuses and bumps recency", () => {
    const s = focusTab(stateOf("/a", "/b"), "t0", 100);
    expect(s.activeId).toBe("t0");
    expect(s.tabs[0].lastActiveAt).toBe(100);
  });

  it("is a no-op for an unknown or already-active tab", () => {
    const s = stateOf("/a", "/b");
    expect(focusTab(s, "nope")).toBe(s);
    expect(focusTab(s, "t1")).toBe(s);
  });
});

describe("closeTab", () => {
  it("moves to the right-hand neighbour when closing the active tab", () => {
    // The browser rule.
    let s = stateOf("/a", "/b", "/c");
    s = focusTab(s, "t1");
    s = closeTab(s, "t1");
    expect(ids(s)).toEqual(["t0", "t2"]);
    expect(s.activeId).toBe("t2");
  });

  it("falls back to the left-hand neighbour at the end of the strip", () => {
    const s = closeTab(stateOf("/a", "/b", "/c"), "t2");
    expect(s.activeId).toBe("t1");
  });

  it("stays put when closing a tab you are not looking at", () => {
    const s = closeTab(stateOf("/a", "/b", "/c"), "t0");
    expect(ids(s)).toEqual(["t1", "t2"]);
    expect(s.activeId).toBe("t2");
  });

  it("never reaches zero: closing the last tab leaves a fresh root tab", () => {
    const s = closeTab(stateOf("/a"), "t0");
    expect(s.tabs).toHaveLength(1);
    expect(locationPathOf(activeTab(s))).toBe("/");
    expect(s.activeId).toBe(s.tabs[0].id);
  });

  it("is a no-op for an unknown tab", () => {
    const s = stateOf("/a");
    expect(closeTab(s, "nope")).toBe(s);
  });
});

describe("closeOtherTabs / moveTab / setTabLabel", () => {
  it("keeps exactly the one", () => {
    const s = closeOtherTabs(stateOf("/a", "/b", "/c"), "t1");
    expect(ids(s)).toEqual(["t1"]);
    expect(s.activeId).toBe("t1");
  });

  it("reorders within the strip and clamps the index", () => {
    expect(ids(moveTab(stateOf("/a", "/b", "/c"), "t2", 0))).toEqual(["t2", "t0", "t1"]);
    expect(moveTab(stateOf("/a", "/b"), "t0", 99).tabs).toHaveLength(2);
  });

  it("updates a label and ignores empty or unchanged ones", () => {
    const s = stateOf("/a");
    expect(setTabLabel(s, "t0", "HeLa s3").tabs[0].label).toBe("HeLa s3");
    expect(setTabLabel(s, "t0", "")).toBe(s);
    expect(setTabLabel(s, "t0", s.tabs[0].label)).toBe(s);
  });
});

describe("pinned tabs", () => {
  const pinnedIds = (s: TabsState) => s.tabs.filter((t) => t.pinned).map((t) => t.id);

  it("gathers pinned tabs at the top, in the order they were pinned", () => {
    let s = stateOf("/a", "/b", "/c", "/d");
    s = setTabPinned(s, "t2", true);
    expect(ids(s)).toEqual(["t2", "t0", "t1", "t3"]);
    s = setTabPinned(s, "t3", true);
    expect(ids(s)).toEqual(["t2", "t3", "t0", "t1"]);
    expect(pinnedIds(s)).toEqual(["t2", "t3"]);
  });

  it("unpins to the head of the rest — the shortest way out of the block", () => {
    let s = stateOf("/a", "/b", "/c");
    s = setTabPinned(setTabPinned(s, "t0", true), "t1", true);
    s = setTabPinned(s, "t0", false);
    expect(ids(s)).toEqual(["t1", "t0", "t2"]);
    expect(pinnedIds(s)).toEqual(["t1"]);
    expect(s.tabs.find((t) => t.id === "t0")).not.toHaveProperty("pinned");
  });

  it("changes neither the active tab nor anything when already so", () => {
    const s = stateOf("/a", "/b");
    expect(setTabPinned(s, "t0", true).activeId).toBe("t1");
    expect(setTabPinned(s, "t0", false)).toBe(s);
    expect(setTabPinned(s, "nope", true)).toBe(s);
  });

  it("survives Close others", () => {
    let s = stateOf("/a", "/b", "/c");
    s = setTabPinned(s, "t0", true);
    s = closeOtherTabs(s, "t2");
    expect(ids(s)).toEqual(["t0", "t2"]);
    expect(s.activeId).toBe("t2");
  });

  it("is never the one evicted to make room", () => {
    // t0 is the stalest by far, and pinned; the victim is the next stalest.
    let s = stateOf(...Array.from({ length: MAX_TABS }, (_, i) => `/p${i}`));
    s = setTabPinned(s, "t0", true);
    s = openTab(s, "/new-one", { evict: true });
    expect(ids(s)).toContain("t0");
    expect(ids(s)).not.toContain("t1");
  });

  it("refuses rather than evict when everything else is pinned", () => {
    let s = stateOf(...Array.from({ length: MAX_TABS }, (_, i) => `/p${i}`));
    for (const id of ids(s).slice(0, -1)) s = setTabPinned(s, id, true);
    expect(openTab(s, "/new-one", { evict: true })).toBe(s);
  });

  it("still closes when asked to by name", () => {
    const s = closeTab(setTabPinned(stateOf("/a", "/b"), "t0", true), "t0");
    expect(ids(s)).toEqual(["t1"]);
  });

  it("keeps a move inside the tab's own block", () => {
    let s = stateOf("/a", "/b", "/c", "/d");
    s = setTabPinned(setTabPinned(s, "t0", true), "t1", true); // [t0 t1 | t2 t3]
    expect(ids(moveTab(s, "t0", 3))).toEqual(["t1", "t0", "t2", "t3"]);
    expect(ids(moveTab(s, "t3", 0))).toEqual(["t0", "t1", "t3", "t2"]);
  });

  it("is remembered across a reload", () => {
    const s = setTabPinned(stateOf("/a", "/b"), "t1", true);
    saveTabs("org-a", s, storage);
    const back = loadTabs("org-a", storage)!;
    expect(back.tabs.map((t) => [t.id, Boolean(t.pinned)])).toEqual([
      ["t1", true],
      ["t0", false],
    ]);
  });
});

describe("warmIds", () => {
  it("keeps the active tab plus the most recent, up to the cap", () => {
    // A scene holds a multi-gigabyte cache; the mounted set must be bounded.
    const tabs = Array.from({ length: MAX_WARM + 3 }, (_, i) =>
      createTab(`/p${i}`, { id: `t${i}`, now: i }),
    );
    const s: TabsState = { tabs, activeId: "t0", viewId: "t0" }; // active is the OLDEST
    const warm = warmIds(s);
    expect(warm.size).toBe(MAX_WARM);
    expect(warm.has("t0")).toBe(true); // active always
    expect(warm.has(`t${MAX_WARM + 2}`)).toBe(true); // most recent
    expect(warm.has("t1")).toBe(false); // old and not active
  });
});

describe("split view — the partner belongs to the tab", () => {
  const besideOf = (s: TabsState, id: string) => s.tabs.find((t) => t.id === id)?.beside;

  it("shows a tab beside the view tab, which keeps focus", () => {
    const s = splitTab(stateOf("/a", "/b", "/c"), "t0");
    expect(shownSplit(s)).toEqual({ left: "t2", right: "t0" });
    expect(s.activeId).toBe("t2");
    expect(s.viewId).toBe("t2");
    expect(besideOf(s, "t2")).toBe("t0");
    expect(splitPartnerId(s)).toBe("t0");
  });

  it("splits to the left: the other tab becomes the view, this one its partner", () => {
    const s = splitTab(stateOf("/a", "/b"), "t0", "left");
    expect(shownSplit(s)).toEqual({ left: "t0", right: "t1" });
    expect(s.viewId).toBe("t0");
    expect(s.activeId).toBe("t1"); // still the tab that had focus
  });

  it("cannot split a tab with itself, nor with a tab that is not there", () => {
    const s = stateOf("/a", "/b");
    expect(splitTab(s, "t1")).toBe(s);
    expect(splitTab(s, "nope")).toBe(s);
    expect(splitPartnerId(s)).toBeNull();
    expect(shownSplit(s)).toBeUndefined();
  });

  it("focusing the partner only moves focus; the view and its pair persist", () => {
    let s = splitTab(stateOf("/a", "/b"), "t0"); // t1 > t0
    s = focusTab(s, "t0");
    expect(s.activeId).toBe("t0");
    expect(s.viewId).toBe("t1");
    expect(shownSplit(s)).toEqual({ left: "t1", right: "t0" });
  });

  it("switching to a tab shows it with its OWN partner, or alone — nothing is inherited", () => {
    let s = splitTab(stateOf("/a", "/b", "/c"), "t0"); // t2 > t0
    s = focusTab(s, "t1"); // t1 has no partner
    expect(s.viewId).toBe("t1");
    expect(s.activeId).toBe("t1");
    expect(shownSplit(s)).toBeUndefined();
    expect(besideOf(s, "t1")).toBeUndefined();
    expect(besideOf(s, "t2")).toBe("t0"); // t2 keeps its pair
    // Back to t2: its pair is back. And t0 as the view shows t0 alone.
    expect(shownSplit(focusTab(s, "t2"))).toEqual({ left: "t2", right: "t0" });
    expect(shownSplit(focusTab(s, "t0"))).toBeUndefined();
    // A new tab starts alone too.
    const opened = openTab(splitTab(stateOf("/a", "/b"), "t0"), "/d");
    expect(shownSplit(opened)).toBeUndefined();
    expect(opened.viewId).toBe(opened.activeId);
    // A background open touches nothing.
    const bg = openTab(s, "/e", { background: true });
    expect(bg.viewId).toBe(s.viewId);
    expect(bg.activeId).toBe(s.activeId);
  });

  it("one partner may be shown by several tabs", () => {
    let s = splitTab(stateOf("/a", "/b", "/c"), "t0"); // t2 > t0
    s = focusTab(s, "t1");
    s = splitTab(s, "t0"); // t1 > t0 as well
    expect(besideOf(s, "t1")).toBe("t0");
    expect(besideOf(s, "t2")).toBe("t0");
    expect(shownSplit(focusTab(s, "t2"))).toEqual({ left: "t2", right: "t0" });
  });

  it("closing the view tab shows its partner in its place", () => {
    const s = closeTab(splitTab(stateOf("/a", "/b", "/c"), "t0"), "t2"); // t2 > t0, close t2
    expect(ids(s)).toEqual(["t0", "t1"]);
    expect(s.viewId).toBe("t0");
    expect(s.activeId).toBe("t0");
    expect(shownSplit(s)).toBeUndefined();
  });

  it("closing a partner takes it from beside every tab; a focused one hands focus to the view", () => {
    let s = splitTab(stateOf("/a", "/b", "/c"), "t0"); // t2 > t0
    s = splitTab(focusTab(s, "t1"), "t0"); // t1 > t0 too; view t1
    s = focusTab(s, "t0"); // focus the partner
    s = closeTab(s, "t0");
    expect(ids(s)).toEqual(["t1", "t2"]);
    expect(besideOf(s, "t1")).toBeUndefined();
    expect(besideOf(s, "t2")).toBeUndefined();
    expect(s.viewId).toBe("t1");
    expect(s.activeId).toBe("t1");
    expect(s.tabs.find((t) => t.id === "t1")).not.toHaveProperty("beside");
  });

  it("closing a tab outside the pair leaves it alone", () => {
    const s = closeTab(splitTab(stateOf("/a", "/b", "/c"), "t0"), "t1");
    expect(shownSplit(s)).toEqual({ left: "t2", right: "t0" });
  });

  it("close-others keeps the tab's own partner", () => {
    const s = closeOtherTabs(splitTab(stateOf("/a", "/b", "/c"), "t0"), "t2");
    expect(ids(s).sort()).toEqual(["t0", "t2"]);
    expect(shownSplit(s)).toEqual({ left: "t2", right: "t0" });
    // From the partner: it becomes the view, alone, unless the view was pinned.
    const fromPartner = closeOtherTabs(splitTab(stateOf("/a", "/b", "/c"), "t0"), "t0");
    expect(ids(fromPartner)).toEqual(["t0"]);
    expect(fromPartner.viewId).toBe("t0");
  });

  it("unsplits and swaps by owner, the view's pair by default", () => {
    let s = splitTab(stateOf("/a", "/b"), "t0"); // t1 > t0
    const swapped = swapSplit(s);
    expect(shownSplit(swapped)).toEqual({ left: "t0", right: "t1" });
    expect(swapped.viewId).toBe("t0");
    expect(swapped.activeId).toBe("t1"); // the same TAB keeps focus
    expect(besideOf(swapped, "t1")).toBeUndefined();

    const focusedPartner = focusTab(s, "t0");
    const un = unsplit(focusedPartner);
    expect(shownSplit(un)).toBeUndefined();
    expect(un.activeId).toBe("t1"); // focus falls back to the view
    expect(un.tabs.find((t) => t.id === "t1")).not.toHaveProperty("beside");

    const plain = stateOf("/a");
    expect(unsplit(plain)).toBe(plain);
    expect(swapSplit(plain)).toBe(plain);
  });

  it("unsplits and swaps another owner's pair by id, leaving the screen alone", () => {
    let s = splitTab(stateOf("/a", "/b", "/c"), "t0"); // t2 > t0
    s = focusTab(s, "t1"); // view t1, alone
    const un = unsplit(s, "t2");
    expect(besideOf(un, "t2")).toBeUndefined();
    expect(un.viewId).toBe("t1");
    const sw = swapSplit(s, "t2");
    expect(besideOf(sw, "t0")).toBe("t2");
    expect(besideOf(sw, "t2")).toBeUndefined();
    expect(sw.viewId).toBe("t1");
  });

  it("splits a chosen tab: it becomes the view, with the named partner or a new tab", () => {
    const s = splitTabWith(stateOf("/a", "/b", "/c"), "t0", "t1"); // from t0's row
    expect(s.viewId).toBe("t0");
    expect(s.activeId).toBe("t0");
    expect(shownSplit(s)).toEqual({ left: "t0", right: "t1" });

    const fresh = splitTabWith(stateOf("/a", "/b"), "t0");
    expect(fresh.viewId).toBe("t0");
    expect(fresh.tabs).toHaveLength(3);
    expect(shownSplit(fresh)).toEqual({ left: "t0", right: fresh.tabs[2].id });
    expect(locationPathOf(fresh.tabs[2])).toBe(NEW_TAB_PATH);

    const plain = stateOf("/a", "/b");
    expect(splitTabWith(plain, "t0", "t0")).toBe(plain);
    expect(splitTabWith(plain, "nope", "t0")).toBe(plain);
  });

  it("toggles: the most recent other tab, then off; a new tab when alone", () => {
    let s = stateOf("/a", "/b", "/c");
    s = focusTab(s, "t0", 50);
    s = focusTab(s, "t2", 60); // active t2; the most recent OTHER is t0, not the neighbour t1
    s = toggleSplit(s);
    expect(shownSplit(s)).toEqual({ left: "t2", right: "t0" });
    expect(shownSplit(toggleSplit(s))).toBeUndefined();

    const alone = toggleSplit(stateOf("/a"));
    expect(alone.tabs).toHaveLength(2);
    expect(locationPathOf(alone.tabs[1])).toBe(NEW_TAB_PATH);
    expect(shownSplit(alone)).toEqual({ left: "t0", right: alone.tabs[1].id });
    expect(alone.activeId).toBe("t0");
  });

  it("opens to the side: a new tab as the view's partner, focus unmoved", () => {
    let s = openTabBeside(stateOf("/a"), "/b");
    expect(s.activeId).toBe("t0");
    expect(shownSplit(s)).toEqual({ left: "t0", right: s.tabs[1].id });
    expect(locationPathOf(s.tabs[1])).toBe("/b");
    // Half the width: no page sidebar to start with, unless asked for.
    expect(s.tabs[1].layout).toEqual(BESIDE_LAYOUT);
    const shown = openTabBeside(stateOf("/a"), "/b", { layout: { pageSidebar: true } });
    expect(shown.tabs[1].layout).toEqual({ pageSidebar: true });

    // It replaces the previous partner, which stays open.
    s = openTabBeside(s, "/c");
    expect(shownSplit(s)).toEqual({ left: "t0", right: s.tabs[2].id });
    expect(s.tabs).toHaveLength(3);

    // Refused at the cap without `evict`, like any open.
    const full = stateOf(...Array.from({ length: MAX_TABS }, (_, i) => `/p${i}`));
    expect(openTabBeside(full, "/more")).toBe(full);
  });

  it("never evicts a pane to make room, and scrubs an evicted partner", () => {
    let s = stateOf(...Array.from({ length: MAX_TABS }, (_, i) => `/p${i}`));
    // Active is the last; split with the OLDEST, which eviction would otherwise take.
    s = splitTab(s, "t0");
    s = openTab(s, "/more", { evict: true });
    expect(ids(s)).toContain("t0");
    expect(ids(s)).not.toContain("t1");
  });

  it("keeps both panes warm", () => {
    const tabs = Array.from({ length: MAX_WARM + 3 }, (_, i) =>
      createTab(`/p${i}`, { id: `t${i}`, now: i }),
    );
    const s = splitTab({ tabs, activeId: "t0", viewId: "t0" }, "t1"); // both the OLDEST
    const warm = warmIds(s);
    expect(warm.size).toBe(MAX_WARM);
    expect(warm.has("t0")).toBe(true);
    expect(warm.has("t1")).toBe(true);
    expect(warm.has(`t${MAX_WARM + 2}`)).toBe(true);
  });

  it("keeps a tab's layout defaults, and persists them", () => {
    const s = openTab(stateOf("/a"), "/b", { layout: { sidebar: false } });
    expect(s.tabs[1].layout).toEqual({ sidebar: false });
    expect(s.tabs[0]).not.toHaveProperty("layout");
    saveTabs("org-a", s, storage);
    const back = loadTabs("org-a", storage)!;
    expect(back.tabs[1].layout).toEqual({ sidebar: false });
    expect(back.tabs[0]).not.toHaveProperty("layout");
  });

  it("round-trips through storage, and mends what does not hold", () => {
    let s = splitTab(stateOf("/a", "/b", "/c"), "t0"); // t2 > t0
    s = focusTab(s, "t0"); // partner focused
    saveTabs("org-a", s, storage);
    const back = loadTabs("org-a", storage)!;
    expect(shownSplit(back)).toEqual({ left: "t2", right: "t0" });
    expect(back.viewId).toBe("t2");
    expect(back.activeId).toBe("t0");

    // A partner that is gone is no partner.
    const persisted = serializeTabs(s);
    persisted.tabs[2].beside = "gone";
    storage.setItem(tabsStorageKey("org-a"), JSON.stringify(persisted));
    expect(loadTabs("org-a", storage)!.tabs[2]).not.toHaveProperty("beside");

    // A view that no longer holds the focus gives way to the focused tab.
    const stale = serializeTabs(s);
    stale.viewId = "t1";
    storage.setItem(tabsStorageKey("org-a"), JSON.stringify(stale));
    expect(loadTabs("org-a", storage)!.viewId).toBe("t0");

    // Saved before the field existed: still loads, the active tab as the view.
    const { viewId: _v, ...older } = serializeTabs(s);
    storage.setItem(tabsStorageKey("org-a"), JSON.stringify(older));
    expect(loadTabs("org-a", storage)!.viewId).toBe("t0");
  });
});

describe("persistence", () => {
  it("round-trips tabs, histories and the active id per membership", () => {
    let s = stateOf("/a", "/b");
    s.tabs[1].history.push("/b/deeper");
    s.tabs[1].history.go(-1);
    s = setTabLabel(s, "t1", "Bee");
    s = openTab(s, "/c");

    saveTabs("org-a", s, storage);
    const back = loadTabs("org-a", storage);

    expect(back).not.toBeNull();
    expect(ids(back!)).toEqual(ids(s));
    expect(back!.activeId).toBe(s.activeId);
    expect(back!.tabs[1].label).toBe("Bee");
    expect(back!.tabs[1].history.canGoForward).toBe(true);
    expect(locationPathOf(back!.tabs[1])).toBe("/b");
    expect(locationPathOf(back!.tabs[2])).toBe("/c");
  });

  it("keeps memberships apart", () => {
    saveTabs("org-a", stateOf("/a"), storage);
    saveTabs("org-b", stateOf("/x", "/y"), storage);
    expect(loadTabs("org-a", storage)!.tabs).toHaveLength(1);
    expect(loadTabs("org-b", storage)!.tabs).toHaveLength(2);
  });

  it("writes nothing and reads nothing for a signed-out user", () => {
    saveTabs(null, stateOf("/a"), storage);
    expect(storage.length).toBe(0);
    expect(loadTabs(null, storage)).toBeNull();
  });

  it("drops a malformed row without losing the others", () => {
    const persisted = serializeTabs(stateOf("/a", "/b"));
    (persisted.tabs as unknown[]).push({ id: "bad", history: { nonsense: true } });
    storage.setItem(tabsStorageKey("org-a"), JSON.stringify(persisted));

    const back = loadTabs("org-a", storage);
    expect(ids(back!)).toEqual(["t0", "t1"]);
  });

  it("repairs a dangling active id to the last tab", () => {
    const persisted = serializeTabs(stateOf("/a", "/b"));
    persisted.activeId = "gone";
    storage.setItem(tabsStorageKey("org-a"), JSON.stringify(persisted));
    expect(loadTabs("org-a", storage)!.activeId).toBe("t1");
  });

  it("returns null rather than throwing on garbage", () => {
    storage.setItem(tabsStorageKey("org-a"), "{not json");
    expect(loadTabs("org-a", storage)).toBeNull();
    storage.setItem(tabsStorageKey("org-a"), JSON.stringify({ version: 1, activeId: "x", tabs: [] }));
    expect(loadTabs("org-a", storage)).toBeNull();
  });
});

describe("bootTabs — one rule for every entry path", () => {
  it("cold start with a deep link: one tab at the hash", () => {
    const s = bootTabs("org-a", "/mikro/arraydatasets/5", storage);
    expect(s.tabs).toHaveLength(1);
    expect(locationPathOf(activeTab(s))).toBe("/mikro/arraydatasets/5");
  });

  it("cold start with no hash: one tab at the root", () => {
    const s = bootTabs("org-a", null, storage);
    expect(s.tabs).toHaveLength(1);
    expect(locationPathOf(activeTab(s))).toBe("/");
  });

  it("reload: the hash equals the restored active location, so nothing new opens", () => {
    saveTabs("org-a", stateOf("/a", "/b"), storage);
    const s = bootTabs("org-a", "/b", storage);
    expect(s.tabs).toHaveLength(2);
    expect(locationPathOf(activeTab(s))).toBe("/b");
  });

  it("deep link into a saved session: opens it as a new active tab", () => {
    saveTabs("org-a", stateOf("/a", "/b"), storage);
    const s = bootTabs("org-a", "/c", storage);
    expect(s.tabs).toHaveLength(3);
    expect(locationPathOf(activeTab(s))).toBe("/c");
  });

  it("a deep link lands even when the saved session is at the cap", () => {
    saveTabs("org-a", stateOf(...Array.from({ length: MAX_TABS }, (_, i) => `/p${i}`)), storage);
    const s = bootTabs("org-a", "/deep", storage);
    expect(s.tabs).toHaveLength(MAX_TABS);
    expect(locationPathOf(activeTab(s))).toBe("/deep");
  });

  it("signed out: starts from the hash in memory, saving nothing", () => {
    const s = bootTabs(null, "/somewhere", storage);
    expect(locationPathOf(activeTab(s))).toBe("/somewhere");
    expect(storage.length).toBe(0);
  });
});

describe("tab labels have a source", () => {
  const page = (pathname: string) => ({ source: "page" as const, pathname });
  const path = (pathname: string) => ({ source: "path" as const, pathname });

  it("lets a page's own title beat the path-derived fallback for its location", () => {
    // The page knows its name ("HeLa s3"); the path only knows an id ("5").
    let s = stateOf("/mikro/arraydatasets/5");
    s = setTabLabel(s, "t0", "HeLa s3", page("/mikro/arraydatasets/5"));
    s = setTabLabel(s, "t0", "5", path("/mikro/arraydatasets/5"));
    expect(s.tabs[0].label).toBe("HeLa s3");
  });

  it("does not care which reported first", () => {
    // Effects run child-first and pages may wait on a query, so precedence
    // is by location, not by timing.
    let s = stateOf("/mikro/arraydatasets/5");
    s = setTabLabel(s, "t0", "5", path("/mikro/arraydatasets/5"));
    s = setTabLabel(s, "t0", "HeLa s3", page("/mikro/arraydatasets/5"));
    s = setTabLabel(s, "t0", "5", path("/mikro/arraydatasets/5"));
    expect(s.tabs[0].label).toBe("HeLa s3");
  });

  it("releases the claim when the tab navigates somewhere else", () => {
    let s = stateOf("/mikro/arraydatasets/5");
    s = setTabLabel(s, "t0", "HeLa s3", page("/mikro/arraydatasets/5"));
    s = setTabLabel(s, "t0", "Folders", path("/mikro/folders"));
    expect(s.tabs[0].label).toBe("Folders");
    expect(s.tabs[0].labelPath).toBeUndefined();
  });

  it("lets a later page title replace an earlier one", () => {
    let s = stateOf("/a");
    s = setTabLabel(s, "t0", "Draft", page("/a"));
    s = setTabLabel(s, "t0", "Final", page("/a"));
    expect(s.tabs[0].label).toBe("Final");
  });

  it("survives persistence, so a restored tab keeps its page name", () => {
    let s = stateOf("/mikro/arraydatasets/5");
    s = setTabLabel(s, "t0", "HeLa s3", page("/mikro/arraydatasets/5"));
    saveTabs("org-a", s, storage);
    expect(loadTabs("org-a", storage)!.tabs[0].label).toBe("HeLa s3");
  });
});
