import { describe, expect, it } from "vitest";
import {
  component,
  datasetResident,
  edge,
  graphFromSpaces,
  keyEdge,
  lens,
  lineage,
  lineageDataset,
  lineageEdge,
  lineageTable,
  mesh,
  owner,
  register,
  space,
  table,
} from "./__fixtures__/lineage";
import {
  ancestors,
  childEdgesOf,
  datasetKey,
  descendants,
  graphFromComponent,
  graphFromLineage,
  isDereference,
  mergeGraphs,
  nodeOfCandidate,
  ownerOf,
  parentEdgesOf,
  primaryChain,
  treeSpaces,
} from "./spaceGraph";

describe("graphFromComponent — the children tree", () => {
  // world ← raw grid (registered) ← mask grid (segmented) ← crop of the mask;
  // and a stray grid the server's undirected walk brought along.
  const build = () =>
    graphFromComponent(
      component(
        "world",
        [
          space("world", [], "Stage world"),
          space("grid-raw", [datasetResident("raw")], "raw grid"),
          space("grid-mask", [
            datasetResident("mask", {
              derivedFrom: [edge("seg", "grid-mask", "grid-raw", { valueRelation: "CATEGORIZED" })],
            }),
          ]),
          space("crop-mask", [lens("l-crop", "mask", { space: "crop-mask", slices: [{ axis: "x", start: 0, stop: 8 }] })]),
          space("grid-stray", [datasetResident("stray")]),
        ],
        [
          register("reg-raw", "grid-raw", "world"),
          edge("seg", "grid-mask", "grid-raw", { valueRelation: "CATEGORIZED" }),
          edge("cut", "crop-mask", "grid-mask", { kind: "TRANSLATION" }),
          // The stray grid is registered into ANOTHER world.
          register("reg-stray", "grid-stray", "other-world"),
        ],
      ),
    );

  it("gives each space its depth below the world, and none to what the walk does not reach", () => {
    const graph = build();
    expect(graph.spaces.get("world")?.depth).toBe(0);
    expect(graph.spaces.get("grid-raw")?.depth).toBe(1);
    expect(graph.spaces.get("grid-mask")?.depth).toBe(2);
    expect(graph.spaces.get("crop-mask")?.depth).toBe(3);
    expect(graph.spaces.get("grid-stray")?.depth).toBeNull();
    expect(graph.spaces.get("other-world")?.depth).toBeNull();
  });

  it("lists the tree's spaces in walking order, the world first, and only what is placeable", () => {
    const graph = build();
    expect(treeSpaces(graph).map((s) => s.id)).toEqual(["world", "grid-raw", "grid-mask", "crop-mask"]);
    expect(treeSpaces(graph, new Set(["grid-mask"])).map((s) => s.id)).toEqual(["world", "grid-mask"]);
  });

  it("tells a registration from a derivation by the child's own claim", () => {
    const graph = build();
    expect(graph.edges.get("reg-raw")?.derivation).toBe(false);
    expect(graph.edges.get("seg")?.derivation).toBe(true);
    expect(graph.edges.get("seg")?.ordinal).toBe(0);
    const raw = graph.nodes.get(datasetKey("raw"))!;
    // Registered into the world, derived from nothing.
    expect(parentEdgesOf(graph, raw)).toEqual([]);
    expect(ancestors(graph, raw)).toEqual([]);
  });

  it("files a crop lens's space under its dataset and reads its cut as an IDENTICAL derivation", () => {
    const graph = build();
    const mask = graph.nodes.get(datasetKey("mask"))!;
    expect(mask.spaces.has("crop-mask")).toBe(true);
    expect(ownerOf(graph, "crop-mask")).toBe(mask);
    // The crop edge joins two spaces of one container: not a parent of it.
    expect(parentEdgesOf(graph, mask).map((e) => e.id)).toEqual(["seg"]);
    expect(primaryChain(graph, mask)[0].parent?.id).toBe("raw");
  });

  it("files a pyramid level's space under the dataset its edge lands in", () => {
    const graph = graphFromComponent(
      component(
        "world",
        [
          space("world", []),
          space("grid-d", [datasetResident("d")]),
          space("level-1", [{ __typename: "DataArray", id: "a1", level: 1, toParent: { id: "lvl" } }]),
        ],
        [register("reg", "grid-d", "world"), edge("lvl", "level-1", "grid-d", { kind: "SEQUENCE" })],
      ),
    );
    const d = graph.nodes.get(datasetKey("d"))!;
    expect(d.spaces.has("level-1")).toBe(true);
    expect(graph.edges.get("lvl")).toMatchObject({ derivation: true, ordinal: 0, valueRelation: "IDENTICAL" });
    expect(graph.spaces.get("level-1")?.depth).toBe(2);
  });

  it("keeps a table beside the mask that keys it, not under it", () => {
    const graph = graphFromComponent(
      component(
        "world",
        [
          space("world", []),
          space("grid-mask", [datasetResident("mask")]),
          space("space-t", [table("t", { derivedFrom: [edge("m", "space-t", "grid-mask", { kind: "UNMAPPABLE" })] })]),
        ],
        [
          register("reg", "grid-mask", "world"),
          edge("m", "space-t", "grid-mask", { kind: "UNMAPPABLE" }),
          // The key edge as the tree gives it: FIELD, mask → table, no field.
          edge("key", "grid-mask", "space-t", { kind: "FIELD" }),
        ],
      ),
    );
    const key = graph.edges.get("key")!;
    expect(isDereference(key, graph)).toBe(true);
    const mask = graph.nodes.get(datasetKey("mask"))!;
    expect(parentEdgesOf(graph, mask)).toEqual([]);
    expect(childEdgesOf(graph, mask).map((e) => e.id).sort()).toEqual(["key", "m"]);
    expect(descendants(graph, mask).map((r) => r.node.key)).toEqual(["TableDataset:t"]);
    // The table is a child through its measurement, at depth 2 — never the
    // mask a child of the table.
    expect(graph.spaces.get("space-t")?.depth).toBe(2);
    expect(graph.spaces.get("grid-mask")?.depth).toBe(1);
  });

  it("records a dataset's derivation once however many lenses show it", () => {
    const derivedFrom = [
      edge("e-primary", "grid-mask", "grid-raw", { valueRelation: "CATEGORIZED" }),
      edge("e-second", "grid-mask", "grid-other", { kind: "UNMAPPABLE" }),
    ];
    const graph = graphFromSpaces([
      space("grid-mask", [
        lens("l1", "mask", { derivedFrom }),
        lens("l2", "mask", { derivedFrom, slices: [{ axis: "x", start: 0, stop: 10 }] }),
        datasetResident("mask", { derivedFrom }),
      ]),
    ]);
    expect(graph.edges.size).toBe(2);
    expect(graph.edges.get("e-primary")?.ordinal).toBe(0);
    expect(graph.edges.get("e-second")?.ordinal).toBe(1);
  });

  it("gives tables, meshes and networks nodes of their own with their column roles", () => {
    const graph = graphFromSpaces([
      space("space-t", [table("t", { roles: ["COORDINATE", "TRACK_ID"] })]),
      space("space-m", [mesh("m")]),
    ]);
    expect(graph.nodes.get("TableDataset:t")?.columnRoles).toEqual(["COORDINATE", "TRACK_ID"]);
    expect(graph.nodes.get("MeshCollection:m")?.name).toBe("mesh collection 1");
    expect(ownerOf(graph, "space-m")?.kind).toBe("mesh");
  });

  it("keeps a dataset's source file content types", () => {
    const graph = graphFromSpaces([
      space("grid-photo", [datasetResident("photo", { contentTypes: ["image/png"] })]),
    ]);
    expect(graph.nodes.get(datasetKey("photo"))?.sourceContentTypes).toEqual(["image/png"]);
  });
});

describe("dereference edges", () => {
  it("is a FIELD edge whose field is its input, and nothing else, when the field is known", () => {
    const graph = graphFromSpaces([
      space("grid-mask", [
        datasetResident("mask", {
          derivedFrom: [edge("warp", "grid-mask", "grid-raw", { kind: "FIELD", field: "grid-field" })],
        }),
      ]),
      space("space-t", [table("t", { derivedFrom: [keyEdge("key", "grid-mask", "space-t")] })]),
    ]);
    expect(isDereference(graph.edges.get("key")!, graph)).toBe(true);
    expect(isDereference(graph.edges.get("warp")!, graph)).toBe(false);
  });

  it("is a child of the mask it keys, never a parent of it", () => {
    const graph = graphFromSpaces([
      space("grid-mask", [datasetResident("mask")]),
      space("space-t", [table("t", { derivedFrom: [keyEdge("key", "grid-mask", "space-t")] })]),
    ]);
    const mask = graph.nodes.get(datasetKey("mask"))!;
    expect(parentEdgesOf(graph, mask)).toEqual([]);
    expect(childEdgesOf(graph, mask).map((e) => e.id)).toEqual(["key"]);
    expect(descendants(graph, mask).map((r) => r.node.key)).toEqual(["TableDataset:t"]);
  });
});

describe("primaryChain", () => {
  const rawMaskCrop = () =>
    graphFromSpaces([
      space("grid-raw", [datasetResident("raw")]),
      space("grid-mask", [
        datasetResident("mask", {
          derivedFrom: [edge("seg", "grid-mask", "grid-raw", { valueRelation: "CATEGORIZED" })],
        }),
      ]),
      space("grid-crop", [
        datasetResident("crop", {
          derivedFrom: [edge("cut", "grid-crop", "grid-mask", { kind: "TRANSLATION", valueRelation: "IDENTICAL" })],
        }),
      ]),
    ]);

  it("follows primary parents to the root", () => {
    const graph = rawMaskCrop();
    const chain = primaryChain(graph, graph.nodes.get(datasetKey("crop"))!);
    expect(chain.map((step) => [step.edge.id, step.parent?.id])).toEqual([
      ["cut", "mask"],
      ["seg", "raw"],
    ]);
  });

  it("stops at a space nobody known lives in, reporting the edge", () => {
    const graph = graphFromSpaces([
      space("grid-mask", [
        datasetResident("mask", {
          derivedFrom: [edge("seg", "grid-mask", "grid-elsewhere", { valueRelation: "CATEGORIZED" })],
        }),
      ]),
    ]);
    const chain = primaryChain(graph, graph.nodes.get(datasetKey("mask"))!);
    expect(chain).toHaveLength(1);
    expect(chain[0].parent).toBeUndefined();
  });

  it("does not loop on a cycle and honours maxDepth", () => {
    const graph = graphFromSpaces([
      space("grid-a", [datasetResident("a", { derivedFrom: [edge("ab", "grid-a", "grid-b")] })]),
      space("grid-b", [datasetResident("b", { derivedFrom: [edge("ba", "grid-b", "grid-a")] })]),
    ]);
    const a = graph.nodes.get(datasetKey("a"))!;
    expect(primaryChain(graph, a).map((s) => s.edge.id)).toEqual(["ab", "ba"]);
    expect(primaryChain(graph, a, 1).map((s) => s.edge.id)).toEqual(["ab"]);
    expect(ancestors(graph, a).map((r) => r.node.id)).toEqual(["b"]);
  });

  it("prefers the declared primary parent over an UNMAPPABLE second one", () => {
    const graph = graphFromSpaces([
      space("grid-raw", [datasetResident("raw")]),
      space("grid-other", [datasetResident("other")]),
      space("grid-fused", [
        datasetResident("fused", {
          derivedFrom: [
            edge("second", "grid-fused", "grid-other", { kind: "UNMAPPABLE" }),
            edge("first", "grid-fused", "grid-raw", { valueRelation: "IDENTICAL" }),
          ],
        }),
      ]),
    ]);
    // Ordinal, not id order: "second" sorts before "first" alphabetically.
    graph.edges.get("second")!.ordinal = 1;
    graph.edges.get("first")!.ordinal = 0;
    const chain = primaryChain(graph, graph.nodes.get(datasetKey("fused"))!);
    expect(chain[0].parent?.id).toBe("raw");
  });
});

describe("graphFromLineage — the provenance helper", () => {
  it("resolves an edge landing in a crop-lens space through the lens's dataset", () => {
    const graph = graphFromLineage(
      lineage(
        "grid-mask",
        [lineageDataset("raw"), lineageDataset("mask", { derivedFrom: [edge("seg", "grid-mask", "crop-raw", { valueRelation: "CATEGORIZED" })] })],
        [
          lineageEdge(
            edge("seg", "grid-mask", "crop-raw", { valueRelation: "CATEGORIZED" }),
            [owner("ArrayDataset", "mask")],
            [owner("Lens", "l-crop", "raw")],
          ),
        ],
      ),
    );

    expect(graph.depth).toBe("lineage");
    expect(ownerOf(graph, "crop-raw")?.id).toBe("raw");
    const mask = graph.nodes.get(datasetKey("mask"))!;
    expect(primaryChain(graph, mask)[0].parent?.id).toBe("raw");
    expect(graph.edges.get("seg")?.ordinal).toBe(0);
    expect(graph.edges.get("seg")?.derivation).toBe(true);
  });

  it("reads a table's primary ordinal off its id-only derivedFrom", () => {
    const measure = edge("measure", "space-t", "grid-mask", { kind: "UNMAPPABLE" });
    const other = edge("other", "space-t", "grid-raw", { kind: "UNMAPPABLE" });
    const graph = graphFromLineage(
      lineage(
        "space-t",
        [lineageDataset("mask"), lineageDataset("raw"), lineageTable("t", { edgeIds: ["measure", "other"] })],
        [
          lineageEdge(other, [owner("TableDataset", "t")], [owner("ArrayDataset", "raw")]),
          lineageEdge(measure, [owner("TableDataset", "t")], [owner("ArrayDataset", "mask")]),
        ],
      ),
    );
    const t = graph.nodes.get("TableDataset:t")!;
    expect(parentEdgesOf(graph, t).map((e) => e.id)).toEqual(["measure", "other"]);
    expect(t.columnRoles).toEqual(["COORDINATE", "COORDINATE"]);
  });

  it("stubs a space whose owner was cut off by maxDepth, off the tree", () => {
    const graph = graphFromLineage(
      lineage(
        "grid-mask",
        [lineageDataset("mask", { derivedFrom: [edge("seg", "grid-mask", "grid-far", { valueRelation: "CATEGORIZED" })] })],
        [lineageEdge(edge("seg", "grid-mask", "grid-far", { valueRelation: "CATEGORIZED" }), [owner("ArrayDataset", "mask")], [owner("ArrayDataset", "far")])],
      ),
    );
    const far = ownerOf(graph, "grid-far")!;
    expect(far.stub).toBe(true);
    expect(far.id).toBe("far");
    expect(graph.spaces.get("grid-far")?.depth).toBeNull();
  });
});

describe("mergeGraphs", () => {
  it("keeps the tree's ordinal and depths, takes the lineage's nodes, and flips depth", () => {
    const tree = graphFromComponent(
      component(
        "world",
        [
          space("world", []),
          space("grid-mask", [
            datasetResident("mask", {
              derivedFrom: [edge("seg", "grid-mask", "grid-far", { valueRelation: "CATEGORIZED" })],
            }),
          ]),
        ],
        [register("reg", "grid-mask", "world")],
      ),
    );
    const deep = graphFromLineage(
      lineage(
        "grid-mask",
        [lineageDataset("far", { name: "dapi.zarr" })],
        [lineageEdge(edge("seg", "grid-mask", "grid-far", { valueRelation: "CATEGORIZED" }), [owner("ArrayDataset", "mask")], [owner("ArrayDataset", "far")])],
      ),
    );
    // The lineage lost the ordinal (the mask node was not among its nodes).
    expect(deep.edges.get("seg")?.ordinal).toBeNull();

    const merged = mergeGraphs(tree, deep);
    expect(merged.depth).toBe("lineage");
    expect(merged.edges.get("seg")?.ordinal).toBe(0);
    expect(merged.nodes.get(datasetKey("far"))?.name).toBe("dapi.zarr");
    expect(merged.nodes.get(datasetKey("far"))?.stub).toBeUndefined();
    expect(merged.spaces.get("grid-mask")?.depth).toBe(1);
    expect(merged.spaces.get("grid-far")?.depth).toBeNull();
    const mask = merged.nodes.get(datasetKey("mask"))!;
    expect(primaryChain(merged, mask)[0].parent?.name).toBe("dapi.zarr");
    // The far grid is off the tree: known to the engine, never a row.
    expect(treeSpaces(merged).map((s) => s.id)).toEqual(["world", "grid-mask"]);
  });

  it("lets a real node replace a stub, never the reverse", () => {
    const stubbed = graphFromLineage(
      lineage("g", [], [lineageEdge(edge("e", "g", "grid-x"), [], [owner("ArrayDataset", "x")])]),
    );
    const real = graphFromSpaces([space("grid-x", [datasetResident("x", { name: "x.zarr" })])]);
    expect(mergeGraphs(stubbed, real).nodes.get(datasetKey("x"))?.name).toBe("x.zarr");
    expect(mergeGraphs(real, stubbed).nodes.get(datasetKey("x"))?.name).toBe("x.zarr");
  });
});

describe("nodeOfCandidate", () => {
  it("maps a lens to its dataset's node and a table to its own", () => {
    const graph = graphFromSpaces([
      space("grid-raw", [lens("l1", "raw")]),
      space("space-t", [table("t")]),
    ]);
    expect(nodeOfCandidate(graph, { __typename: "Lens", id: "l1", dataset: { id: "raw" } })?.key).toBe(datasetKey("raw"));
    expect(nodeOfCandidate(graph, { __typename: "TableDataset", id: "t" })?.kind).toBe("table");
  });
});
