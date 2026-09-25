import { describe, expect, it } from "vitest";

import { matchesFilter, rankByFilter, scoreFilter } from "./filter";

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

describe("matchesFilter — fuzzy", () => {
  it("matches a partial word at a word start", () => {
    expect(matchesFilter(["Array Datasets"], "data")).toBe(true);
  });

  it("matches tokens in any order", () => {
    expect(matchesFilter(["Array Datasets"], "datasets array")).toBe(true);
  });

  it("matches an abbreviation-style subsequence", () => {
    expect(matchesFilter(["Array Datasets"], "arrdat")).toBe(true);
    expect(matchesFilter(["Table Datasets"], "arrdat")).toBe(false);
    expect(matchesFilter(["Solo Broadcasts"], "sbr")).toBe(true);
  });

  it("forgives one typo in tokens of four or more letters", () => {
    expect(matchesFilter(["Home"], "hoem")).toBe(true); // swap
    expect(matchesFilter(["Tasks"], "tasjs")).toBe(true); // substitution
    expect(matchesFilter(["Settings"], "settngs")).toBe(true); // deletion
  });

  it("keeps short tokens strict", () => {
    expect(matchesFilter(["Pods"], "pdo")).toBe(false);
    expect(matchesFilter(["Tasks"], "tks")).toBe(false);
  });

  it("does not match letters scattered across long text", () => {
    const long = ["Change which organization you are working in"];
    expect(matchesFilter(long, "cae")).toBe(false);
    expect(matchesFilter(long, "wor")).toBe(true);
  });

  it("never matches across a part boundary", () => {
    expect(matchesFilter(["Array", "Datasets"], "aydat")).toBe(false);
  });
});

describe("scoreFilter", () => {
  it("is 1 with nothing typed and 0 with nothing to match", () => {
    expect(scoreFilter(["Tasks"], "")).toBe(1);
    expect(scoreFilter([undefined, null], "tasks")).toBe(0);
  });

  it("ranks the tiers strictly: exact > prefix > word start > substring > subsequence > typo", () => {
    const tiers = [
      scoreFilter(["Tasks"], "tasks"),
      scoreFilter(["Tasks"], "task"),
      scoreFilter(["Org Tasks"], "task"),
      scoreFilter(["Toolboxes"], "box"),
      scoreFilter(["Table Datasets"], "tbl"),
      scoreFilter(["Home"], "hoem"),
    ];
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i], `tier ${i}`).toBeGreaterThan(0);
      expect(tiers[i - 1], `tier ${i - 1} > tier ${i}`).toBeGreaterThan(tiers[i]);
    }
  });

  it("weighs earlier parts more, so a label hit beats a keyword hit", () => {
    expect(scoreFilter(["Tasks", "x"], "tasks")).toBeGreaterThan(scoreFilter(["x", "Tasks"], "tasks"));
    expect(scoreFilter(["Rois"], "rois")).toBeGreaterThan(
      scoreFilter(["Annotations", "/mikro/annotations", "Mikro", "rois"], "rois"),
    );
  });

  it("requires every token to land", () => {
    expect(scoreFilter(["Tasks"], "tasks zzz")).toBe(0);
  });
});

describe("rankByFilter", () => {
  const items = [{ label: "Org Tasks" }, { label: "Tasks" }, { label: "Dashboards" }, { label: "Dashboard" }];
  const labels = (filter: string, limit?: number) =>
    rankByFilter(items, (i) => [i.label], filter, limit).map((i) => i.label);

  it("keeps the given order, and the cap, with nothing typed", () => {
    expect(labels("")).toEqual(["Org Tasks", "Tasks", "Dashboards", "Dashboard"]);
    expect(labels("", 2)).toEqual(["Org Tasks", "Tasks"]);
  });

  it("puts the best match first and drops the rest", () => {
    expect(labels("tasks")).toEqual(["Tasks", "Org Tasks"]);
  });

  it("lets the shorter label win a tie", () => {
    expect(labels("dash")).toEqual(["Dashboard", "Dashboards"]);
  });

  it("caps after ranking, not before", () => {
    // Insertion order would have kept "Org Tasks".
    expect(labels("tasks", 1)).toEqual(["Tasks"]);
  });
});
