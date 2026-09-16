import { beforeEach, describe, expect, it } from "vitest";

import {
  activeTab,
  bootTabs,
  closeOtherTabs,
  closeTab,
  createTab,
  focusOrOpenForPin,
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
  tabsStorageKey,
  warmIds,
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
  return { tabs, activeId: tabs[tabs.length - 1].id };
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

describe("focusOrOpenForPin", () => {
  it("opens a tab carrying the pin key", () => {
    const s = focusOrOpenForPin(stateOf("/a"), "route:/b", "/b");
    expect(s.tabs).toHaveLength(2);
    expect(activeTab(s).pinKey).toBe("route:/b");
  });

  it("focuses the existing tab for that pin instead of opening a second", () => {
    let s = focusOrOpenForPin(stateOf("/a"), "route:/b", "/b");
    s = focusTab(s, "t0");
    s = focusOrOpenForPin(s, "route:/b", "/b");
    expect(s.tabs).toHaveLength(2);
    expect(activeTab(s).pinKey).toBe("route:/b");
  });
});

describe("warmIds", () => {
  it("keeps the active tab plus the most recent, up to the cap", () => {
    // A scene holds a multi-gigabyte cache; the mounted set must be bounded.
    const tabs = Array.from({ length: MAX_WARM + 3 }, (_, i) =>
      createTab(`/p${i}`, { id: `t${i}`, now: i }),
    );
    const s: TabsState = { tabs, activeId: "t0" }; // active is the OLDEST
    const warm = warmIds(s);
    expect(warm.size).toBe(MAX_WARM);
    expect(warm.has("t0")).toBe(true); // active always
    expect(warm.has(`t${MAX_WARM + 2}`)).toBe(true); // most recent
    expect(warm.has("t1")).toBe(false); // old and not active
  });
});

describe("persistence", () => {
  it("round-trips tabs, histories and the active id per membership", () => {
    let s = stateOf("/a", "/b");
    s.tabs[1].history.push("/b/deeper");
    s.tabs[1].history.go(-1);
    s = setTabLabel(s, "t1", "Bee");
    s = focusOrOpenForPin(s, "route:/c", "/c");

    saveTabs("org-a", s, storage);
    const back = loadTabs("org-a", storage);

    expect(back).not.toBeNull();
    expect(ids(back!)).toEqual(ids(s));
    expect(back!.activeId).toBe(s.activeId);
    expect(back!.tabs[1].label).toBe("Bee");
    expect(back!.tabs[1].history.canGoForward).toBe(true);
    expect(locationPathOf(back!.tabs[1])).toBe("/b");
    expect(back!.tabs[2].pinKey).toBe("route:/c");
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
