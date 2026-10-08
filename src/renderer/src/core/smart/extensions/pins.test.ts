import { describe, expect, it } from "vitest";
import { loadPins, pinKey, savePins, smartPinsStorageKey, togglePin } from "./pins";

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

describe("smart pins", () => {
  it("keeps the order things were pinned in, and unpins by key", () => {
    const a = pinKey("rekuest.actions", "1");
    const b = pinKey("rekuest.shortcuts", "1");
    expect(togglePin(togglePin([], a), b)).toEqual([a, b]);
    expect(togglePin([a, b], a)).toEqual([b]);
  });

  it("reads back what it saved", () => {
    const storage = memoryStorage();
    savePins("org-a", ["rekuest.actions:1"], storage);
    expect(loadPins("org-a", storage)).toEqual(["rekuest.actions:1"]);
  });

  it("keeps each profile's pins to itself", () => {
    const storage = memoryStorage();
    savePins("org-a", ["rekuest.actions:1"], storage);
    expect(loadPins("org-b", storage)).toEqual([]);
    expect(loadPins(null, storage)).toEqual([]);
  });

  it("degrades to no pins on a corrupt entry", () => {
    const storage = memoryStorage();
    storage.setItem(smartPinsStorageKey("org-a"), "{not json");
    expect(loadPins("org-a", storage)).toEqual([]);
    storage.setItem(smartPinsStorageKey("org-a"), JSON.stringify({ pins: [1] }));
    expect(loadPins("org-a", storage)).toEqual([]);
  });
});
