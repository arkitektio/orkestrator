import { beforeEach, describe, expect, it } from "vitest";

import {
  clampRailWidth,
  DEFAULT_RAIL_WIDTH,
  loadRailWidth,
  MAX_RAIL_WIDTH,
  MIN_RAIL_WIDTH,
  RAIL_WIDTH_STORAGE_KEY,
  railWidthFromPointer,
  saveRailWidth,
} from "./railWidth";

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

describe("clampRailWidth", () => {
  it("keeps the rail readable and keeps it chrome", () => {
    // Narrower than the minimum and a label is unreadable; wider than the
    // maximum and the rail competes with the page instead of framing it.
    expect(clampRailWidth(10)).toBe(MIN_RAIL_WIDTH);
    expect(clampRailWidth(5000)).toBe(MAX_RAIL_WIDTH);
    expect(clampRailWidth(260)).toBe(260);
  });

  it("rounds to whole pixels", () => {
    expect(clampRailWidth(260.6)).toBe(261);
  });
});

describe("railWidthFromPointer", () => {
  it("turns page pixels into the counter-zoomed rail's own", () => {
    // Page zoomed to 0.8: the rail carries CSS zoom 1.25, so a pointer at
    // x=300 page px sits 240 rail px from the edge.
    expect(railWidthFromPointer(300, 1.25)).toBe(240);
    expect(railWidthFromPointer(300, 1)).toBe(300);
  });

  it("treats an unknown zoom as none, and still clamps", () => {
    expect(railWidthFromPointer(300, Number.NaN)).toBe(300);
    expect(railWidthFromPointer(300, 0)).toBe(300);
    expect(railWidthFromPointer(5000, 1.25)).toBe(MAX_RAIL_WIDTH);
  });
});

describe("persistence", () => {
  it("round-trips a dragged width", () => {
    saveRailWidth(300, storage);
    expect(loadRailWidth(storage)).toBe(300);
  });

  it("clamps on the way in as well as out", () => {
    // A value written by an older build with different limits must still land
    // inside the current ones.
    storage.setItem(RAIL_WIDTH_STORAGE_KEY, "9999");
    expect(loadRailWidth(storage)).toBe(MAX_RAIL_WIDTH);
  });

  it("falls back rather than collapsing the rail on unreadable storage", () => {
    storage.setItem(RAIL_WIDTH_STORAGE_KEY, "not-a-number");
    expect(loadRailWidth(storage)).toBe(DEFAULT_RAIL_WIDTH);
  });

  it("defaults when nothing has been stored", () => {
    expect(loadRailWidth(storage)).toBe(DEFAULT_RAIL_WIDTH);
  });

  it("is global, not per-organization", () => {
    // A preference about this person's screen, not about the tenant's data —
    // unlike tabs and recents, it must survive an organization switch.
    expect(RAIL_WIDTH_STORAGE_KEY).not.toContain("guest");
    expect(RAIL_WIDTH_STORAGE_KEY).not.toMatch(/org|profile/);
  });
});
