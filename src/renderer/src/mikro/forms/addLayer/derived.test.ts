import { describe, expect, it } from "vitest";

import { derivedTree, detailIds, drawnContainers, type ChildDetail, type DescendantsLike } from "./derived";

const node = (key: string, parent: string, depth = 1) => {
  const [prefix, id] = key.split(":");
  const kind = (
    {
      dataset: "DATASET",
      tabledataset: "TABLE_DATASET",
      sparsedataset: "SPARSE_DATASET",
      meshcollection: "MESH_COLLECTION",
      file: "FILE",
    } as const
  )[prefix as "dataset"];
  return { key, kind, id, name: key, depth, parent };
};

// raw (drawn) -> mask -> objects; raw -> projection; raw -> export.tif; raw -> matrix -> meshes
const WALK: DescendantsLike[] = [
  {
    root: "dataset:1",
    more: false,
    nodes: [
      node("dataset:2", "dataset:1"),
      node("dataset:3", "dataset:1"),
      node("file:9", "dataset:1"),
      node("sparsedataset:5", "dataset:1"),
      node("tabledataset:4", "dataset:2", 2),
      node("meshcollection:6", "sparsedataset:5", 2),
    ],
  },
];

const ready = (keys: string[], space = "world-child"): Map<string, ChildDetail> =>
  new Map(keys.map((key) => [key, { wholeLens: `lens-${key}`, space }]));

const ALL = ["dataset:2", "dataset:3", "tabledataset:4", "meshcollection:6"];
const shape = (rows: ReturnType<typeof derivedTree>[number]["rows"]): unknown =>
  rows.map((row) => (row.children.length ? { [row.key]: shape(row.children) } : row.key));

describe("drawnContainers", () => {
  it("starts from each drawn container once, whatever layer draws it", () => {
    expect(
      drawnContainers([
        { __typename: "IntensityLayer", lens: { dataset: { id: "1" } } },
        { __typename: "IntensityLayer", lens: { dataset: { id: "1" } } },
        { __typename: "PointLayer", tableDataset: { id: "4" } },
        { __typename: "MeshLayer", collection: { id: "6" } },
        { __typename: "NetworkLayer", collection: { id: "7" } },
        { __typename: "AnnotationLayer", annotationCollection: { id: "8" } },
      ]),
    ).toEqual([
      { kind: "DATASET", id: "1" },
      { kind: "TABLE_DATASET", id: "4" },
      { kind: "MESH_COLLECTION", id: "6" },
      { kind: "NETWORK_COLLECTION", id: "7" },
      { kind: "ANNOTATION_COLLECTION", id: "8" },
    ]);
  });
});

describe("derivedTree", () => {
  it("nests by parent, drops what no layer draws, and lifts a sparse matrix's children to the root", () => {
    const [group] = derivedTree({
      descendants: WALK,
      details: ready(ALL),
      drawn: new Set(["dataset:1"]),
      placed: new Set(["world-child"]),
    });
    expect(shape(group.rows)).toEqual([{ "dataset:2": ["tabledataset:4"] }, "dataset:3", "meshcollection:6"]);
    expect(group.rows.every((row) => row.blocked === null)).toBe(true);
    expect(group.rows[0].wholeLens).toBe("lens-dataset:2");
  });

  it("keeps a drawn child only for what is still to add under it", () => {
    const [group] = derivedTree({
      descendants: WALK,
      details: ready(ALL),
      drawn: new Set(["dataset:1", "dataset:2", "dataset:3"]),
      placed: new Set(["world-child"]),
    });
    expect(shape(group.rows)).toEqual([{ "dataset:2": ["tabledataset:4"] }, "meshcollection:6"]);
    expect(group.rows[0].blocked).toBe("drawn");
  });

  it("marks what the world does not reach, and waits for details it does not have", () => {
    const details = ready(["dataset:2"], "elsewhere");
    const [group] = derivedTree({ descendants: WALK, details, drawn: new Set(), placed: new Set(["world-child"]) });
    expect(group.rows[0].blocked).toBe("unplaced");
    expect(group.rows[1].blocked).toBe("loading");
  });

  it("lists a node reached from two drawn containers once", () => {
    const groups = derivedTree({
      descendants: [
        ...WALK,
        { root: "dataset:2", more: false, nodes: [node("tabledataset:4", "dataset:2")] },
      ],
      details: ready(ALL),
      drawn: new Set(["dataset:1", "dataset:2"]),
      placed: new Set(["world-child"]),
    });
    expect(groups).toHaveLength(1);
  });

  it("keeps an empty group when the walk was cut short", () => {
    expect(
      derivedTree({
        descendants: [{ root: "dataset:1", more: true, nodes: [] }],
        details: null,
        drawn: new Set(),
        placed: new Set(),
      }),
    ).toEqual([{ root: "dataset:1", rows: [], more: true }]);
  });
});

describe("detailIds", () => {
  it("asks each kind's list for its own and the drawn roots, never a sparse matrix or a file", () => {
    expect(detailIds(WALK)).toEqual({
      datasets: ["1", "2", "3"],
      tables: ["4"],
      meshes: ["6"],
      networks: [],
      annotations: [],
    });
  });
});
