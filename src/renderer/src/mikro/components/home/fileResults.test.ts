import { describe, expect, it } from "vitest";
import { LineageNodeKind } from "../../api/graphql";
import { resultsByRoot, rootKey } from "./fileResults";

describe("rootKey", () => {
  it("spells the kind the way the server keys its nodes", () => {
    expect(rootKey(LineageNodeKind.Dataset, "12")).toBe("dataset:12");
    expect(rootKey(LineageNodeKind.TableDataset, "3")).toBe("tabledataset:3");
    expect(rootKey(LineageNodeKind.MeshCollection, "7")).toBe("meshcollection:7");
  });
});

describe("resultsByRoot", () => {
  it("indexes each root's results by its key", () => {
    const mask = { key: "dataset:9", kind: LineageNodeKind.Dataset, id: "9", name: "Mask", depth: 1 };
    const grouped = resultsByRoot([
      { root: "dataset:1", more: true, nodes: [mask] },
      { root: "tabledataset:2", more: false, nodes: [] },
    ]);

    expect(grouped.get(rootKey(LineageNodeKind.Dataset, "1"))).toEqual({ results: [mask], more: true });
    expect(grouped.get(rootKey(LineageNodeKind.TableDataset, "2"))).toEqual({ results: [], more: false });
  });
});
