// @vitest-environment jsdom
// (the generated Apollo layer touches `window`)
import { describe, expect, it, vi } from "vitest";
import { print, type DocumentNode } from "graphql";
import { LineageNodeKind } from "@/mikro/api/graphql";

import { cacheIdOfKey, PREFLIGHT_BATCH, preflightDeleteDerived, preflightDeletes, summarizePreflights } from "./preflight";

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

describe("delete derived", () => {
  it("words what goes as the whole delete, the target kept", () => {
    const summary = summarizePreflights(
      [{ id: "a", preflight: preflight("annotation:a", [{ key: "dataset:4", kind: LineageNodeKind.Dataset, name: "Straightened" }]) as never }],
      5,
      "derived",
    );
    expect(summary.description).toBe("Deletes 1 thing made from it: Straightened (array dataset).");
    expect(summary.casualtyKeys).toEqual(["dataset:4"]);
  });

  it("reads the server's keys as cache ids", () => {
    expect(cacheIdOfKey("dataset:4")).toEqual({ __typename: "ArrayDataset", id: "4" });
    expect(cacheIdOfKey("tabledataset:7")).toEqual({ __typename: "TableDataset", id: "7" });
    expect(cacheIdOfKey("annotation:9f2c-11")).toEqual({ __typename: "Annotation", id: "9f2c-11" });
    expect(cacheIdOfKey("lens:1")).toBeNull();
    expect(cacheIdOfKey("nokey")).toBeNull();
  });
});

describe("batched preflights", () => {
  const answer = (target: string) => ({
    target,
    casualties: [],
    blockers: [],
    cascadeCounts: [],
    truncated: false,
    needsCascade: false,
    deletable: true,
  });

  it("asks every target in one request, one aliased field each", async () => {
    const query = vi.fn(async ({ variables }: { variables: Record<string, string> }) => ({
      data: Object.fromEntries(
        Object.entries(variables).map(([name, id]) => [name.replace("id", "t"), answer(`dataset:${id}`)]),
      ),
    }));
    const summary = await preflightDeletes({ query } as never, "ArrayDataset", ["1", "2", "3"]);
    expect(query).toHaveBeenCalledTimes(1);
    const { query: document, variables } = query.mock.calls[0][0] as unknown as { query: DocumentNode; variables: object };
    expect(variables).toEqual({ id0: "1", id1: "2", id2: "3" });
    const printed = print(document);
    expect(printed).toContain("t0: preflightDeleteArrayDataset(id: $id0)");
    expect(printed).toContain("t2: preflightDeleteArrayDataset(id: $id2)");
    expect(printed).toContain("fragment DeletePreflight on DeletePreflight");
    expect(summary.blockers).toEqual([]);
  });

  it("keeps the shared variables and chunks a long selection", async () => {
    const query = vi.fn(async ({ variables }: { variables: Record<string, string> }) => ({
      data: Object.fromEntries(
        Object.entries(variables)
          .filter(([name]) => name !== "kind")
          .map(([name, id]) => [name.replace("id", "t"), answer(`dataset:${id}`)]),
      ),
    }));
    const ids = Array.from({ length: PREFLIGHT_BATCH + 1 }, (_, index) => String(index));
    await preflightDeleteDerived({ query } as never, LineageNodeKind.Dataset, ids);
    expect(query).toHaveBeenCalledTimes(2);
    const first = query.mock.calls[0][0] as unknown as { query: DocumentNode; variables: Record<string, string> };
    expect(first.variables.kind).toBe(LineageNodeKind.Dataset);
    expect(print(first.query)).toContain("t0: preflightDeleteDerived(kind: $kind, id: $id0)");
  });
});
