import { describe, expect, it } from "vitest";

import type { DescendantsLike } from "../addLayer/derived";
import { collaborationRefs, derivedForest, flatten, lineageRootOf, pickDerived, subtreeKeys } from "./derivedSelection";

const KINDS = {
  dataset: "DATASET",
  tabledataset: "TABLE_DATASET",
  meshcollection: "MESH_COLLECTION",
  file: "FILE",
} as const;

const node = (key: string, parent: string, depth = 1) => {
  const [prefix, id] = key.split(":");
  return { key, kind: KINDS[prefix as keyof typeof KINDS], id, name: key, depth, parent };
};

// raw -> mask -> objects -> meshes; raw -> projection; a second raw shares the projection
const WALK: DescendantsLike[] = [
  {
    root: "dataset:1",
    more: false,
    nodes: [
      node("dataset:2", "dataset:1"),
      node("dataset:3", "dataset:1"),
      node("tabledataset:4", "dataset:2", 2),
      node("meshcollection:6", "tabledataset:4", 3),
    ],
  },
  { root: "dataset:7", more: true, nodes: [node("dataset:3", "dataset:7")] },
];

const keys = (nodes: { key: string }[]) => nodes.map((n) => n.key);

describe("lineageRootOf", () => {
  it("walks from what has a lineage and not from a scene", () => {
    expect(lineageRootOf({ identifier: "@mikro/arraydataset", id: "1" })).toEqual({ kind: "DATASET", id: "1" });
    expect(lineageRootOf({ identifier: "@mikro/scene", id: "1" })).toBeNull();
  });
});

describe("derivedForest", () => {
  it("lists each node once, under the first object that reaches it, parents first", () => {
    const forest = derivedForest(WALK);
    expect(keys(flatten(forest.trees))).toEqual(["dataset:2", "tabledataset:4", "meshcollection:6", "dataset:3"]);
    expect(forest.more).toBe(true);
    expect(forest.roots).toEqual(["dataset:1", "dataset:7"]);
    expect(flatten(forest.trees).map((n) => n.parent)).toEqual(["dataset:1", "dataset:2", "tabledataset:4", "dataset:1"]);
    expect(flatten(forest.trees)[1].identifier).toBe("@mikro/tabledataset");
  });

  it("leaves out an object that is being put in itself", () => {
    const forest = derivedForest([{ root: "dataset:1", more: false, nodes: [node("dataset:2", "dataset:1")] }, { root: "dataset:2", more: false, nodes: [] }]);
    expect(forest.trees).toEqual([]);
  });
});

describe("pickDerived", () => {
  const forest = derivedForest(WALK);

  it("takes nothing, everything within the depth, or what was ticked", () => {
    expect(pickDerived(forest, "none", 3, new Map())).toEqual([]);
    expect(keys(pickDerived(forest, "all", 2, new Map()))).toEqual(["dataset:2", "tabledataset:4", "dataset:3"]);
    expect(
      keys(pickDerived(forest, "custom", 1, new Map([["dataset:2", false], ["meshcollection:6", true]]))),
    ).toEqual(["meshcollection:6", "dataset:3"]);
  });
});

describe("subtreeKeys", () => {
  it("is the node and everything below it", () => {
    const [mask] = derivedForest(WALK).trees;
    expect(subtreeKeys(mask)).toEqual(["dataset:2", "tabledataset:4", "meshcollection:6"]);
  });
});

describe("collaborationRefs", () => {
  it("puts the objects first and each ref in once", () => {
    const raw = { identifier: "@mikro/arraydataset", id: "1" };
    const mask = { identifier: "@mikro/arraydataset", id: "2" };
    expect(collaborationRefs([raw], [mask, raw])).toEqual([raw, mask]);
  });
});
