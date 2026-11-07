import { describe, expect, it } from "vitest";
import type { ArrayHopLike, AttributeHopLike, RowPlanLike, TableHopLike } from "./attributeTypes";
import { hopKey, hopMetaOf, objectsOf, planIdentity } from "./attributeTypes";
import { ARRAY_LINES_CAP, executeRowPlan, type SparseProfileReaderLike } from "./executePlan";
import { createArrayLineReader, type ArrayLineReaderLike } from "./arrayLine";
import type { AttributeLookupEngine } from "./lookupEngine";
import type { HeldMap } from "./planExec";

/**
 * A row's plan, written from the schema's own words (`rowPlan`, `HopVia`,
 * `LookupStep.keyMap`): a cluster row, its members (REVERSE: the cluster's id
 * bound into the members' referencing column), and each member's row in a PCA
 * table derived from it (SAME_ROWS, `cell_id = object + 1`).
 */

const column = (name: string, extra: Record<string, unknown> = {}) => ({ name, dtype: "INTEGER", ...extra });
const INDEX = { role: "COORDINATE", axisType: "INDEX" };

const clusters: TableHopLike = {
  index: 0,
  parent: null,
  cardinality: "ONE",
  table: { id: "t-clusters", name: "Clusters", columns: [column("cluster", INDEX), column("size")] },
  lookup: {
    kind: "TABLE",
    store: { id: "s1" } as never,
    keyColumns: [{ axis: "cluster", column: column("cluster", INDEX) }],
    attributes: [column("size")],
  },
};

const members: TableHopLike = {
  index: 1,
  parent: 0,
  cardinality: "MANY",
  via: { column: { name: "cluster_id" }, direction: "REVERSE" },
  table: {
    id: "t-meshes",
    name: "Mesh features",
    columns: [column("object", INDEX), column("cluster_id")],
    keyedBy: [
      {
        produces: ["object"],
        structure: "@mikro/meshobject",
        source: { __typename: "MeshCollection", id: "mc1", label: "Organelles" },
      },
    ],
  },
  lookup: {
    kind: "TABLE",
    store: { id: "s2" } as never,
    keyColumns: [{ axis: "cluster", column: column("cluster_id") }],
    attributes: [column("object", INDEX), column("volume")],
  },
};

const pca = (keyMap: { scale: number; offset: number } | null): TableHopLike => ({
  index: 2,
  parent: 1,
  cardinality: "ONE",
  via: { direction: "SAME_ROWS" },
  table: { id: "t-pca", name: "PCA", columns: [column("cell_id", INDEX), column("pc1")] },
  lookup: {
    kind: "TABLE",
    store: { id: "s3" } as never,
    keyColumns: [{ axis: "object", column: column("cell_id", INDEX) }],
    attributes: [column("pc1")],
    keyMap,
  },
});

const planOf = (...hops: AttributeHopLike[]): RowPlanLike => ({
  kind: "row",
  table: { id: "t-clusters", name: "Clusters" },
  key: { axis: "cluster", column: column("cluster", INDEX) },
  hops,
});

type Lookup = { table: string; held: HeldMap };

/** Rows per table, answered from what was bound. */
const deps = (
  rowsFor: Record<string, (held: HeldMap) => readonly Record<string, unknown>[]>,
  arrays: ArrayLineReaderLike = {} as ArrayLineReaderLike,
) => {
  const lookups: Lookup[] = [];
  const engine = {
    lookup: async (_plan: unknown, hop: TableHopLike, held: HeldMap) => {
      lookups.push({ table: hop.table.id, held });
      return rowsFor[hop.table.id]?.(held) ?? [];
    },
    peek: () => null,
  } as unknown as AttributeLookupEngine;
  return {
    lookups,
    deps: {
      engine,
      sparse: {} as SparseProfileReaderLike,
      arrays,
    },
  };
};

const MEMBERS = [{ object: 7, volume: 1.5 }, { object: 8, volume: 2.5 }, { object: 9, volume: 0.5 }];

describe("a row's plan", () => {
  it("is the table's: one identity for every row", () => {
    const plan = planOf(clusters, members);
    expect(planIdentity(plan)).toBe("row:t-clusters");
    expect(hopKey(plan, members)).toBe("row:t-clusters#1:t-meshes");
    expect(hopMetaOf(plan, members)).toMatchObject({ via: "members via cluster_id", direction: "REVERSE" });
    expect(hopMetaOf(plan, pca(null))).toMatchObject({ via: "same rows", direction: "SAME_ROWS" });
  });

  it("lands on the picked row — row 0 included — holding its id under the key", async () => {
    const { deps: d, lookups } = deps({ "t-clusters": () => [{ size: 3 }] });
    const states = await executeRowPlan(d, planOf(clusters), 0);
    const landing = states?.[planIdentity(planOf(clusters))];
    expect(landing?.status).toBe("rows");
    expect(landing?.ids).toEqual([0]);
    expect(lookups[0].held).toEqual({ cluster: 0 });
  });

  it("REVERSE binds the parent row's id as a list, and the members say which rows they are", async () => {
    const plan = planOf(clusters, members);
    const { deps: d, lookups } = deps({ "t-clusters": () => [{ size: 3 }], "t-meshes": () => MEMBERS });
    const states = await executeRowPlan(d, plan, 4);
    expect(lookups[1]).toEqual({ table: "t-meshes", held: { cluster: [4] } });
    const reached = states?.[hopKey(plan, members)];
    expect(reached?.ids).toEqual([7, 8, 9]);
    expect(objectsOf(members, reached?.ids ?? []).map((o) => o.id)).toEqual(["mc1:7", "mc1:8", "mc1:9"]);
    expect(objectsOf(members, [7])[0]).toMatchObject({ identifier: "@mikro/meshobject", source: { label: "Organelles" } });
  });

  it("SAME_ROWS maps each id through keyMap, and those ids are its rows", async () => {
    const hop = pca({ scale: 1, offset: 1 });
    const plan = planOf(clusters, members, hop);
    const { deps: d, lookups } = deps({
      "t-clusters": () => [{ size: 3 }],
      "t-meshes": () => MEMBERS,
      "t-pca": () => [{ pc1: 0.1 }, { pc1: 0.2 }, { pc1: 0.3 }],
    });
    const states = await executeRowPlan(d, plan, 4);
    expect(lookups[2].held.object).toEqual([8, 9, 10]);
    expect(states?.[hopKey(plan, hop)]?.ids).toEqual([8, 9, 10]);
  });

  it("drops an id the keyMap puts between two rows: it has no counterpart there", async () => {
    const hop = pca({ scale: 0.5, offset: 0 });
    const plan = planOf(clusters, members, hop);
    const { deps: d, lookups } = deps({ "t-clusters": () => [{}], "t-meshes": () => MEMBERS, "t-pca": () => [] });
    await executeRowPlan(d, plan, 4);
    // 7 → 3.5 and 9 → 4.5 land between rows; 8 → 4 is one.
    expect(lookups[2].held.object).toBe(4);
  });

  it("caps a MANY hop at manyLimit, and its children bind only what was kept", async () => {
    const hop = pca(null);
    const plan = planOf(clusters, members, hop);
    const { deps: d, lookups } = deps({ "t-clusters": () => [{}], "t-meshes": () => MEMBERS, "t-pca": () => [] });
    const states = await executeRowPlan(d, plan, 4, { manyLimit: 2 });
    const reached = states?.[hopKey(plan, members)];
    expect(reached?.rows).toHaveLength(2);
    expect(reached?.truncated).toEqual({ shown: 2, total: 3 });
    expect(lookups[2].held.object).toEqual([7, 8]);
  });

  it("does not run a hop in a direction it does not know as a forward one", async () => {
    const odd: TableHopLike = { ...members, via: { column: { name: "cluster_id" }, direction: "SIDEWAYS" } };
    const plan = planOf(clusters, odd);
    const { deps: d, lookups } = deps({ "t-clusters": () => [{}], "t-meshes": () => MEMBERS });
    const states = await executeRowPlan(d, plan, 4);
    expect(states?.[hopKey(plan, odd)]?.status).toBe("unreachable");
    expect(lookups).toHaveLength(1);
  });

  it("cannot cross REVERSE from rows that do not say which rows they are", async () => {
    const anonymous: TableHopLike = { ...members, index: 2, parent: 1, table: { ...members.table, columns: [] } };
    const deeper: TableHopLike = { ...members, index: 1, parent: 0, lookup: { ...members.lookup, attributes: [column("volume")] }, table: { ...members.table, columns: [] } };
    const plan = planOf(clusters, deeper, anonymous);
    const { deps: d } = deps({ "t-clusters": () => [{}], "t-meshes": () => [{ volume: 1 }] });
    const states = await executeRowPlan(d, plan, 4);
    expect(states?.[hopKey(plan, anonymous)]?.status).toBe("unreachable");
  });
});

/** Each member's trace: a `(cell, t)` array derived from the members' table, entered by its INDEX. */
const traces: ArrayHopLike = {
  index: 2,
  parent: 1,
  cardinality: "ONE",
  via: { column: { name: "object" }, axis: null },
  arrayDataset: {
    id: "ad1",
    name: "Traces",
    axisNames: ["cell", "t"],
    shape: [200, 50],
    dataArrays: [{ shape: [200, 50], store: { id: "z-traces", key: "traces.zarr" } }],
  },
  lookup: { kind: "ARRAY", keyAxis: "cell", keyHeld: "object", valueAxes: ["t"] },
};

/** A real line reader over a fake window read: row `k` holds `k, k+1, …`; `fail` rows throw. */
const fakeArrays = (fail: (row: number) => boolean = () => false) => {
  const rows: number[] = [];
  const arrays = createArrayLineReader({
    read: async (_store, ranges) => {
      const row = (ranges[0] as { start: number }).start;
      rows.push(row);
      if (fail(row)) throw new Error(`row ${row} is unreadable`);
      return { shape: [1, 50], strides: [50, 1], data: Float32Array.from({ length: 50 }, (_, i) => row + i) };
    },
  });
  return { rows, arrays };
};

describe("an array reached through a cluster's members", () => {
  const plan = planOf(clusters, members, traces);
  const linesOf = (states: Awaited<ReturnType<typeof executeRowPlan>>) => states?.[hopKey(plan, traces)];

  it("reads one line per member, named by the member's id, in row order", async () => {
    const reader = fakeArrays();
    const { deps: d } = deps({ "t-clusters": () => [{}], "t-meshes": () => MEMBERS }, reader.arrays);
    const state = linesOf(await executeRowPlan(d, plan, 4));
    expect(state?.status).toBe("rows");
    expect(state?.series).toBeUndefined();
    expect(state?.lines?.map((line) => [line.id, line.index, line.values[0]])).toEqual([
      [7, 7, 7],
      [8, 8, 8],
      [9, 9, 9],
    ]);
    expect(reader.rows.sort()).toEqual([7, 8, 9]);
  });

  it("reads only the members kept under manyLimit", async () => {
    const reader = fakeArrays();
    const { deps: d } = deps({ "t-clusters": () => [{}], "t-meshes": () => MEMBERS }, reader.arrays);
    const state = linesOf(await executeRowPlan(d, plan, 4, { manyLimit: 2 }));
    expect(state?.lines?.map((line) => line.id)).toEqual([7, 8]);
  });

  it("caps the lines it reads at once, and says how many there were", async () => {
    const many = Array.from({ length: ARRAY_LINES_CAP + 2 }, (_, i) => ({ object: i }));
    const reader = fakeArrays();
    const { deps: d } = deps({ "t-clusters": () => [{}], "t-meshes": () => many }, reader.arrays);
    const state = linesOf(await executeRowPlan(d, plan, 4));
    expect(state?.lines).toHaveLength(ARRAY_LINES_CAP);
    expect(state?.truncated).toEqual({ shown: ARRAY_LINES_CAP, total: ARRAY_LINES_CAP + 2 });
  });

  it("drops a member past the array's extent, and keeps the others when one read fails", async () => {
    const reader = fakeArrays((row) => row === 8);
    const rows = [{ object: 7 }, { object: 8 }, { object: 500 }];
    const { deps: d } = deps({ "t-clusters": () => [{}], "t-meshes": () => rows }, reader.arrays);
    const state = linesOf(await executeRowPlan(d, plan, 4));
    expect(state?.status).toBe("rows");
    expect(state?.lines?.map((line) => line.id)).toEqual([7]);
  });

  it("is an error only when every member's read failed", async () => {
    const reader = fakeArrays(() => true);
    const { deps: d } = deps({ "t-clusters": () => [{}], "t-meshes": () => MEMBERS }, reader.arrays);
    const state = linesOf(await executeRowPlan(d, plan, 4));
    expect(state?.status).toBe("error");
    expect(state?.error).toMatch(/unreadable/);
  });

  it("reads one member's line as a series, as a scene does", async () => {
    const reader = fakeArrays();
    const { deps: d } = deps({ "t-clusters": () => [{}], "t-meshes": () => [{ object: 7 }] }, reader.arrays);
    const state = linesOf(await executeRowPlan(d, plan, 4));
    expect(state?.series?.index).toBe(7);
    expect(state?.lines).toBeUndefined();
  });
});
