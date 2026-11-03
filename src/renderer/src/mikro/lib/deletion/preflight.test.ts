// @vitest-environment jsdom
// (the generated Apollo layer touches `window`)
import { describe, expect, it } from "vitest";
import { LineageNodeKind } from "@/mikro/api/graphql";

import { summarizePreflights } from "./preflight";

const preflight = (target: string, casualties: { key: string; kind: LineageNodeKind; name: string }[], over = {}) => ({
  target,
  casualties: casualties.map((c) => ({ ...c, id: c.key.split(":")[1], depth: 1, parent: target })),
  blockers: [],
  cascadeCounts: [],
  truncated: false,
  needsCascade: casualties.length > 0,
  deletable: true,
  ...over,
});

describe("summarizePreflights", () => {
  it("names what goes along, once, and not a target", () => {
    const summary = summarizePreflights([
      { id: "a", preflight: preflight("annotation:a", [{ key: "annotation:b", kind: LineageNodeKind.Annotation, name: "Smoothed" }, { key: "dataset:4", kind: LineageNodeKind.Dataset, name: "Crop" }]) as never },
      { id: "b", preflight: preflight("annotation:b", []) as never },
    ]);
    expect(summary.casualtyCount).toBe(1);
    expect(summary.description).toBe("This also deletes 1 thing made from it: Crop (array dataset).");
    expect(summary.skipIds).toEqual(["b"]);
    expect(summary.casualtyKeys).toEqual(["dataset:4"]);
  });

  it("carries blockers and the other cascades", () => {
    const summary = summarizePreflights([
      {
        id: "a",
        preflight: preflight("annotation:a", [{ key: "dataset:4", kind: LineageNodeKind.Dataset, name: "Crop" }], {
          blockers: [{ key: "dataset:4", kind: LineageNodeKind.Dataset, id: "4", reason: "Only the creator can delete this" }],
          cascadeCounts: [{ label: "layer", count: 2 }],
        }) as never,
      },
    ]);
    expect(summary.blockers).toEqual(["Only the creator can delete this"]);
    expect(summary.description).toContain("With them go 2 layers.");
  });
});
