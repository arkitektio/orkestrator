import { describe, expect, it } from "vitest";
import {
  MAX_RECENT_TERMS,
  addRecentTerm,
  loadRecentTerms,
  recentTermsStorageKey,
  saveRecentTerms,
} from "./recentTerms";

const memoryStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  };
};

describe("recent terms", () => {
  it("puts the newest first and keeps one row per word", () => {
    const first = addRecentTerm([], { key: "AIS", at: 1 });
    const second = addRecentTerm(first, { key: "Cell", at: 2 });
    expect(addRecentTerm(second, { key: "AIS", at: 3 }).map((t) => t.key)).toEqual([
      "AIS",
      "Cell",
    ]);
  });

  it("caps the list", () => {
    let terms = addRecentTerm([], { key: "t0", at: 0 });
    for (let i = 1; i < MAX_RECENT_TERMS + 5; i++) {
      terms = addRecentTerm(terms, { key: `t${i}`, at: i });
    }
    expect(terms).toHaveLength(MAX_RECENT_TERMS);
    expect(terms[0]?.key).toBe(`t${MAX_RECENT_TERMS + 4}`);
  });

  it("keeps each profile's words to itself", () => {
    const storage = memoryStorage();
    saveRecentTerms("org-a", [{ key: "AIS", label: null, color: [1, 2, 3], at: 1 }], storage);
    expect(loadRecentTerms("org-a", storage)).toEqual([
      { key: "AIS", label: null, color: [1, 2, 3], at: 1 },
    ]);
    expect(loadRecentTerms("org-b", storage)).toEqual([]);
    expect(loadRecentTerms(null, storage)).toEqual([]);
  });

  it("drops a bad row, not the whole list, and survives a corrupt entry", () => {
    const storage = memoryStorage();
    storage.setItem(
      recentTermsStorageKey("org-a"),
      JSON.stringify([{ key: "AIS", at: 1 }, { key: 3 }, { at: 2 }]),
    );
    expect(loadRecentTerms("org-a", storage)).toEqual([{ key: "AIS", at: 1 }]);
    storage.setItem(recentTermsStorageKey("org-a"), "{not json");
    expect(loadRecentTerms("org-a", storage)).toEqual([]);
  });
});
