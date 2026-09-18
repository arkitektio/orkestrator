import { describe, expect, it } from "vitest";
import { siteLabelOf, sitesOf, whereOf } from "./sites";

const site = (id: string, label: string, over: Record<string, unknown> = {}) => ({
  id,
  kind: "VOLTAGE",
  label,
  cell: "c1",
  location: "soma",
  position: 0.5,
  ...over,
});

describe("sitesOf", () => {
  it("reads the named kind only, deduplicated, in anchor order", () => {
    const soma = site("1", "soma_v");
    const dataset = {
      anchors: [
        { recordingSite: soma, stimulusSite: null },
        { recordingSite: soma },
        { recordingSite: site("2", "dend_v"), stimulusSite: site("9", "iclamp") },
      ],
    };
    expect(sitesOf(dataset, "recording").map((s) => s.label)).toEqual(["soma_v", "dend_v"]);
    expect(sitesOf(dataset, "stimulus").map((s) => s.label)).toEqual(["iclamp"]);
  });

  it("is empty without anchors", () => {
    expect(sitesOf({ anchors: null }, "recording")).toEqual([]);
  });
});

describe("siteLabelOf", () => {
  it("prefers site labels and falls back to the dataset name", () => {
    expect(siteLabelOf({ name: "ds", anchors: [{ recordingSite: site("1", "soma_v") }] }, "recording")).toBe(
      "soma_v",
    );
    expect(siteLabelOf({ name: "ds", anchors: [] }, "recording")).toBe("ds");
  });
});

describe("whereOf", () => {
  it("formats cell, location and position", () => {
    expect(whereOf({ cell: "c1", location: "soma", position: 0.5 })).toBe("c1 · soma(0.5)");
    expect(whereOf({ cell: null, location: "dend" })).toBe("dend");
    expect(whereOf({})).toBeNull();
  });
});
