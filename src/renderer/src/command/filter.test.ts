import { describe, expect, it } from "vitest";

import { matchesFilter } from "./filter";

describe("matchesFilter", () => {
  it("matches everything when nothing is typed", () => {
    expect(matchesFilter(["Folders"], "")).toBe(true);
    expect(matchesFilter(["Folders"], undefined)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesFilter(["Array Datasets"], "ARRAY")).toBe(true);
  });

  it("ANDs tokens across all the parts it is given", () => {
    // "mikro fold" should find "Mikro / Folders" even though no single
    // contiguous substring spans both words.
    expect(matchesFilter(["Folders", "Mikro"], "mikro fold")).toBe(true);
    expect(matchesFilter(["Folders", "Mikro"], "mikro graph")).toBe(false);
  });

  it("skips absent parts rather than matching on them", () => {
    expect(matchesFilter(["Settings", undefined, null], "settings")).toBe(true);
    expect(matchesFilter([undefined, null], "anything")).toBe(false);
  });

  it("ignores surrounding whitespace", () => {
    expect(matchesFilter(["Settings"], "  settings  ")).toBe(true);
  });
});
