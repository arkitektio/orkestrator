import { describe, expect, it } from "vitest";

import { layerDerived, layerDerivedCount } from "./layerDerived";

const node = (kind: string, id: string, parent: string, key = `${kind.toLowerCase()}:${id}`) =>
  ({ key, kind, id, name: `${kind} ${id}`, depth: 1, parent }) as never;

describe("layerDerived", () => {
  const walk = [
    {
      root: "dataset:1",
      more: true,
      nodes: [
        node("DATASET", "2", "dataset:1", "dataset:2"),
        node("MESH_COLLECTION", "5", "dataset:2", "meshcollection:5"),
        node("TABLE_DATASET", "3", "dataset:1", "tabledataset:3"),
        node("FILE", "9", "dataset:1", "file:9"),
        node("DATASET", "2", "dataset:1", "dataset:2"),
      ],
    },
  ];

  it("splits what was made from the dataset from what lies further down, each once", () => {
    const derived = layerDerived(walk, null);
    expect(derived.direct.map((r) => `${r.__typename}:${r.id}`)).toEqual(["ArrayDataset:2", "TableDataset:3"]);
    expect(derived.further.map((r) => `${r.__typename}:${r.id}`)).toEqual(["MeshCollection:5"]);
    expect(derived.more).toBe(true);
    expect(layerDerivedCount(derived)).toBe(3);
  });

  it("hands a drawable child its whole lens once the details land", () => {
    const before = layerDerived(walk, null).direct[0] as { fullLens?: { id: string } | null };
    expect(before.fullLens).toBeNull();
    const details = new Map([["dataset:2", { wholeLens: "lens:7", space: "s" }]]);
    const after = layerDerived(walk, details).direct[0] as { fullLens?: { id: string } | null };
    expect(after.fullLens).toEqual({ id: "lens:7" });
  });
});
