import { beforeEach, describe, expect, it } from "vitest";

import {
  activePinKey,
  addPin,
  emptyPinState,
  isPinned,
  loadPins,
  MAX_PINS,
  movePin,
  pinKey,
  pinsStorageKey,
  removePin,
  routeOfPin,
  savePins,
  type Pin,
  type PinState,
} from "./pins";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.get(key) ?? null; }
  key(index: number) { return Array.from(this.map.keys())[index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

let storage: MemoryStorage;
beforeEach(() => { storage = new MemoryStorage(); });

const entity = (id: string, label = `Image ${id}`): Pin => ({
  kind: "entity", identifier: "@mikro/arraydataset", id, label,
});
const route = (path: string, label = path): Pin => ({ kind: "route", route: path, label });

const buildModelPath = (identifier: string, id: string) =>
  identifier === "@mikro/arraydataset" ? `mikro/arraydatasets/${id}` : undefined;

const stateOf = (...pins: Pin[]): PinState => ({ version: 1, pins });
const keys = (s: PinState) => s.pins.map(pinKey);

describe("addPin", () => {
  it("appends in the order the user pinned things", () => {
    const s = addPin(addPin(emptyPinState(), entity("1")), entity("2"));
    expect(keys(s)).toEqual([
      "entity:@mikro/arraydataset:1",
      "entity:@mikro/arraydataset:2",
    ]);
  });

  it("does not reorder when pinning something already pinned", () => {
    // The rail is a place the user arranges; a list that rearranges itself
    // whenever you revisit something cannot be learned.
    let s = addPin(addPin(addPin(emptyPinState(), entity("1")), entity("2")), entity("3"));
    s = addPin(s, entity("1"));
    expect(keys(s)).toEqual([
      "entity:@mikro/arraydataset:1",
      "entity:@mikro/arraydataset:2",
      "entity:@mikro/arraydataset:3",
    ]);
  });

  it("refreshes a stale label on re-pin", () => {
    let s = addPin(emptyPinState(), entity("1", "Untitled"));
    s = addPin(s, entity("1", "HeLa s3"));
    expect(s.pins[0].label).toBe("HeLa s3");
  });

  it("keeps an empty label from clobbering a good one", () => {
    let s = addPin(emptyPinState(), entity("1", "HeLa s3"));
    s = addPin(s, entity("1", ""));
    expect(s.pins[0].label).toBe("HeLa s3");
  });

  it("refuses at the cap rather than dropping something kept on purpose", () => {
    // Unlike a tab strip, nothing here is disposable — every entry was asked
    // for, so silently evicting one would lose a deliberate choice.
    let s = emptyPinState();
    for (let i = 0; i < MAX_PINS; i++) s = addPin(s, entity(`e${i}`));

    const full = s;
    s = addPin(s, entity("one-too-many"));
    expect(s).toBe(full);
    expect(keys(s)).not.toContain("entity:@mikro/arraydataset:one-too-many");
  });

  it("treats an entity and a route as different pins", () => {
    const s = addPin(addPin(emptyPinState(), entity("1")), route("/mikro/arraydatasets"));
    expect(s.pins).toHaveLength(2);
  });
});

describe("removePin / isPinned", () => {
  it("removes just the one", () => {
    const s = removePin(stateOf(entity("1"), entity("2")), "entity:@mikro/arraydataset:1");
    expect(keys(s)).toEqual(["entity:@mikro/arraydataset:2"]);
  });

  it("is a no-op for something that is not pinned", () => {
    expect(removePin(stateOf(entity("1")), "nope").pins).toHaveLength(1);
  });

  it("reports whether something is pinned", () => {
    const s = stateOf(route("/settings"));
    expect(isPinned(s, "route:/settings")).toBe(true);
    expect(isPinned(s, "route:/mikro")).toBe(false);
  });
});

describe("movePin", () => {
  it("reorders within the rail", () => {
    const s = movePin(stateOf(entity("1"), entity("2"), entity("3")), "entity:@mikro/arraydataset:3", 0);
    expect(keys(s)[0]).toBe("entity:@mikro/arraydataset:3");
  });

  it("is a no-op for an unknown pin", () => {
    const s = stateOf(entity("1"));
    expect(movePin(s, "nope", 0)).toBe(s);
  });

  it("clamps an out-of-range index instead of losing the pin", () => {
    const s = movePin(stateOf(entity("1"), entity("2")), "entity:@mikro/arraydataset:1", 99);
    expect(s.pins).toHaveLength(2);
  });
});

describe("routeOfPin", () => {
  it("resolves an entity through the registry, with a leading slash", () => {
    expect(routeOfPin(entity("42"), buildModelPath)).toBe("/mikro/arraydatasets/42");
  });

  it("returns nothing for a model the deployment no longer registers", () => {
    // A module dropped from the deployment must not navigate to `/undefined`.
    expect(routeOfPin({ ...entity("1"), identifier: "@gone/thing" }, buildModelPath))
      .toBeUndefined();
  });

  it("passes a route pin through unchanged", () => {
    expect(routeOfPin(route("/settings"), buildModelPath)).toBe("/settings");
  });
});

describe("activePinKey", () => {
  // Derived from the URL, not stored — so a navigation from anywhere (a card
  // link, a local action, the back button) highlights the right pin without
  // every one of those sites knowing pins exist.
  const pins = [entity("42"), route("/settings")];

  it("matches the pin showing the current path", () => {
    expect(activePinKey(pins, "/mikro/arraydatasets/42", buildModelPath))
      .toBe("entity:@mikro/arraydataset:42");
  });

  it("matches a subroute of a pin", () => {
    expect(activePinKey(pins, "/settings/appearance", buildModelPath)).toBe("route:/settings");
  });

  it("matches nothing when the user is somewhere no pin covers", () => {
    expect(activePinKey(pins, "/kraph/graphs", buildModelPath)).toBeUndefined();
  });

  it("picks the MOST SPECIFIC pin, not the first one listed", () => {
    // The bug this replaced: `.find()` returned whichever matching pin sat
    // higher in the list, so pinning a module root stole the highlight from
    // every page inside it.
    const nested = [route("/mikro"), route("/mikro/arraydatasets/5")];
    expect(activePinKey(nested, "/mikro/arraydatasets/5", buildModelPath))
      .toBe("route:/mikro/arraydatasets/5");
  });

  it("picks the most specific pin regardless of pin order", () => {
    const nested = [route("/mikro/arraydatasets/5"), route("/mikro")];
    expect(activePinKey(nested, "/mikro/arraydatasets/5", buildModelPath))
      .toBe("route:/mikro/arraydatasets/5");
  });

  it("still falls back to an ancestor when nothing more specific is pinned", () => {
    expect(activePinKey([route("/mikro")], "/mikro/arraydatasets/5", buildModelPath))
      .toBe("route:/mikro");
  });

  it("does not let one route claim another that merely shares a prefix", () => {
    // `/mikro/arraydatasets` must not match `/mikro/arraydatasets2` — a bare
    // `startsWith` would say it does.
    expect(activePinKey([route("/mikro/arraydatasets")], "/mikro/arraydatasets2", buildModelPath))
      .toBeUndefined();
  });

  describe("when two pins point at the same page", () => {
    // A route pin and an entity pin for the same dataset are different records
    // resolving to one path; nothing in the URL separates them.
    const sameRoute = [route("/mikro/arraydatasets/42"), entity("42")];

    it("prefers the pin the user actually clicked", () => {
      expect(
        activePinKey(sameRoute, "/mikro/arraydatasets/42", buildModelPath, "entity:@mikro/arraydataset:42"),
      ).toBe("entity:@mikro/arraydataset:42");

      expect(
        activePinKey(sameRoute, "/mikro/arraydatasets/42", buildModelPath, "route:/mikro/arraydatasets/42"),
      ).toBe("route:/mikro/arraydatasets/42");
    });

    it("still answers when nothing was clicked", () => {
      expect(activePinKey(sameRoute, "/mikro/arraydatasets/42", buildModelPath)).toBeDefined();
    });
  });

  it("ignores a clicked pin that no longer covers the path", () => {
    // The hint is a tiebreaker among matching pins, never an override: having
    // clicked one pin must not keep it lit after navigating elsewhere.
    expect(
      activePinKey(pins, "/settings", buildModelPath, "entity:@mikro/arraydataset:42"),
    ).toBe("route:/settings");
  });

  it("ignores a clicked pin that has since been unpinned", () => {
    expect(activePinKey(pins, "/settings", buildModelPath, "route:/gone")).toBe("route:/settings");
  });
});

describe("persistence", () => {
  it("round-trips per profile", () => {
    savePins("org-a", stateOf(entity("1")), storage);
    savePins("org-b", stateOf(entity("2"), entity("3")), storage);

    expect(loadPins("org-a", storage).pins).toHaveLength(1);
    expect(loadPins("org-b", storage).pins).toHaveLength(2);
  });

  it("stores nothing at all when signed out", () => {
    // Pins belong to a membership. A shared signed-out bucket would leak a
    // tenant-scoped id into whichever organization signed in next.
    savePins(null, stateOf(entity("1")), storage);
    expect(storage.length).toBe(0);
  });

  it("reads nothing when signed out, even if a key was left behind", () => {
    savePins("org-a", stateOf(entity("1")), storage);
    expect(loadPins(null, storage).pins).toEqual([]);
  });

  it("keys on the membership, which the profile id already is", () => {
    // `baseUrl::user::organization` — one bucket per membership, so the same
    // person in two organizations keeps two separate rails.
    expect(pinsStorageKey("https://lok.test::u1::o1")).toContain("u1");
    expect(pinsStorageKey("https://lok.test::u1::o1")).not.toBe(
      pinsStorageKey("https://lok.test::u1::o2"),
    );
  });

  it("returns empty rather than throwing on damaged storage", () => {
    storage.setItem(pinsStorageKey("org-a"), "{not json");
    expect(loadPins("org-a", storage)).toEqual(emptyPinState());
  });

  it("salvages the readable pins when one row is malformed", () => {
    // One bad row must not unpin everything else the user kept.
    storage.setItem(
      pinsStorageKey("org-a"),
      JSON.stringify({ version: 1, pins: [entity("good"), { kind: "entity", id: 5 }] }),
    );
    const state = loadPins("org-a", storage);
    expect(state.pins).toHaveLength(1);
    expect(state.pins[0].label).toBe("Image good");
  });
});
