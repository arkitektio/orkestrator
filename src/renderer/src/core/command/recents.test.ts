import { beforeEach, describe, expect, it } from "vitest";

import {
  addRecent,
  loadRecents,
  MAX_RECENTS,
  recentsStorageKey,
  recordRecent,
  type RecentEntry,
} from "./recents";

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

const entity = (id: string, at = 1): RecentEntry => ({
  kind: "entity", identifier: "@mikro/image", id, label: `Image ${id}`, at,
});

describe("addRecent", () => {
  it("puts the newest first", () => {
    const list = addRecent(addRecent([], entity("a", 1)), entity("b", 2));
    expect(list.map((e) => (e.kind === "entity" ? e.id : ""))).toEqual(["b", "a"]);
  });

  it("moves a revisited entry to the front instead of duplicating it", () => {
    let list = addRecent([], entity("a", 1));
    list = addRecent(list, entity("b", 2));
    list = addRecent(list, entity("a", 3));
    expect(list).toHaveLength(2);
    expect(list[0].kind === "entity" && list[0].id).toBe("a");
  });

  it("treats the same id in different models as different things", () => {
    const list = addRecent(
      addRecent([], entity("1")),
      { kind: "entity", identifier: "@kraph/graph", id: "1", label: "G", at: 2 },
    );
    expect(list).toHaveLength(2);
  });

  it("caps the list", () => {
    let list: RecentEntry[] = [];
    for (let i = 0; i < MAX_RECENTS + 10; i++) {
      list = addRecent(list, entity(String(i), i));
    }
    expect(list).toHaveLength(MAX_RECENTS);
  });
});

describe("per-profile scoping", () => {
  it("keeps organizations from seeing each other's recents", () => {
    // Entity ids are tenant-scoped: a recent from another organization would
    // navigate to a 404 or a permission error.
    recordRecent("org-a", entity("a"), storage);
    recordRecent("org-b", entity("b"), storage);

    expect(loadRecents("org-a", storage)).toHaveLength(1);
    expect(loadRecents("org-b", storage)).toHaveLength(1);
    expect(loadRecents("org-a", storage)[0]).toMatchObject({ id: "a" });
  });

  it("gives a signed-out user their own bucket", () => {
    expect(recentsStorageKey(null)).toContain("guest");
    expect(loadRecents(null, storage)).toEqual([]);
  });
});

describe("reading damaged storage", () => {
  it("returns empty rather than throwing on non-JSON", () => {
    storage.setItem(recentsStorageKey("org-a"), "{not json");
    expect(loadRecents("org-a", storage)).toEqual([]);
  });

  it("returns empty when the value is not a list", () => {
    storage.setItem(recentsStorageKey("org-a"), JSON.stringify({ nope: true }));
    expect(loadRecents("org-a", storage)).toEqual([]);
  });

  it("drops only the entries that fail the schema", () => {
    storage.setItem(
      recentsStorageKey("org-a"),
      JSON.stringify([entity("good"), { kind: "entity", id: 5 }, { kind: "alien" }]),
    );
    const list = loadRecents("org-a", storage);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: "good" });
  });
});
