import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AttributePlanFragment, AttributePlanHopFragment } from "@/mikro-next/api/graphql";
import { AttributePlanCache, PLAN_JOIN_DEPTH, toStructuralPlans } from "./planCache";
import { hopSource, isSparseHop, isTableHop } from "./attributeTypes";

// The generated GraphQL module drags in browser-only app wiring; the plan
// cache only needs the query document's identity.
vi.mock("@/mikro-next/api/graphql", () => ({
  AttributePlansDocument: { kind: "Document" },
}));

const column = (name: string) =>
  ({ id: `c-${name}`, name, dtype: "DOUBLE", role: "ATTRIBUTE", references: null }) as never;

const tableHop = (over: Partial<AttributePlanHopFragment> = {}): AttributePlanHopFragment =>
  ({
    index: 0,
    parent: null,
    cardinality: "ONE",
    via: null,
    table: { id: "t1", name: "morphology" },
    sparseDataset: null,
    joinPath: [],
    lookup: {
      kind: "TABLE",
      store: { id: "pq1", key: "k", bucket: "b", path: "p" },
      keyColumns: [{ axis: "i", column: column("i") }],
      attributes: [column("area")],
      sparseArray: null,
      keyAxis: null,
      keyHeld: null,
      valueAxes: [],
    },
    ...over,
  }) as AttributePlanHopFragment;

const sparseHop = (over: Partial<AttributePlanHopFragment> = {}): AttributePlanHopFragment =>
  ({
    index: 0,
    parent: null,
    cardinality: "ONE",
    via: null,
    table: null,
    sparseDataset: { id: "sd1", name: "expression", axisNames: ["cell", "gene"], shape: [10, 5], axisReferences: [] },
    joinPath: [],
    lookup: {
      kind: "SPARSE",
      store: null,
      keyColumns: [],
      attributes: [],
      sparseArray: {
        id: "sa",
        indexedAxis: 0,
        indexedAxisName: "cell",
        path: "layouts/axis0",
        store: { id: "ss", key: "k", bucket: "zarr", path: "p", shape: [10, 5], spec: null, layouts: [] },
      },
      keyAxis: "cell",
      keyHeld: "i",
      valueAxes: ["gene"],
    },
    ...over,
  }) as AttributePlanHopFragment;

const fragment = (hops: AttributePlanHopFragment[], edgeId = "e1"): AttributePlanFragment =>
  ({
    edge: { id: edgeId, version: 1 },
    path: [],
    sample: {
      __typename: "ArraySample",
      system: { id: "sys", name: "sys", axes: [] },
      consumes: ["y", "x"],
      produces: ["i"],
      passthrough: [],
      store: { id: "z", key: "k", bucket: "b", path: "p", shape: [8, 8], chunks: [8, 8] },
    },
    hops,
  }) as unknown as AttributePlanFragment;

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "debug").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("toStructuralPlans", () => {
  it("keeps table and sparse hops, in chain order", () => {
    const plans = toStructuralPlans([
      fragment([
        sparseHop(),
        tableHop({ index: 1, parent: 0, cardinality: "MANY", via: { column: null, axis: "gene" } }),
      ]),
      fragment([tableHop()], "e2"),
    ]);
    expect(plans).toHaveLength(2);
    expect(plans[0].hops.map((hop) => hopSource(hop).kind)).toEqual(["SPARSE", "TABLE"]);
    expect(isSparseHop(plans[0].hops[0])).toBe(true);
    expect(isTableHop(plans[1].hops[0])).toBe(true);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("drops a malformed hop with its descendants, out loud, and keeps the rest", () => {
    const plans = toStructuralPlans([
      fragment([
        tableHop(),
        tableHop({ index: 1, parent: 0, lookup: { ...tableHop().lookup, store: null } }),
        tableHop({ index: 2, parent: 1, table: { id: "t3", name: "grandchild" } }),
        tableHop({ index: 3, parent: 0, table: { id: "t4", name: "sibling" } }),
      ]),
    ]);
    expect(plans[0].hops.map((hop) => hop.index)).toEqual([0, 3]);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(String((console.warn as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0])).toContain("1, 2");
  });

  it("drops a plan whose landing is not executable", () => {
    expect(toStructuralPlans([fragment([sparseHop({ lookup: { ...sparseHop().lookup, sparseArray: null } })])])).toEqual([]);
    expect(toStructuralPlans([fragment([tableHop({ lookup: { ...tableHop().lookup, kind: "OTHER" } })])])).toEqual([]);
  });
});

describe("AttributePlanCache", () => {
  const client = (plans: AttributePlanFragment[]) => {
    const query = vi.fn(async () => ({ data: { attributePlans: plans } }));
    return { client: { query }, query };
  };

  it("asks with the join depth, caches per system, and answers peek after settling", async () => {
    const { client: c, query } = client([fragment([tableHop()])]);
    const cache = new AttributePlanCache(c as never);
    expect(cache.peek("sys")).toBeNull();
    const plans = await cache.get("sys");
    expect(plans).toHaveLength(1);
    expect(query.mock.calls[0][0]).toMatchObject({ variables: { system: "sys", maxJoinDepth: PLAN_JOIN_DEPTH } });
    await cache.get("sys");
    expect(query).toHaveBeenCalledTimes(1);
    expect(cache.peek("sys")).toBe(plans);
  });

  it("negative-caches an empty answer and does not cache a failure", async () => {
    const { client: c, query } = client([]);
    const cache = new AttributePlanCache(c as never);
    await cache.get("sys");
    await cache.get("sys");
    expect(query).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);

    const failing = { query: vi.fn(async () => { throw new Error("offline"); }) };
    const retrying = new AttributePlanCache(failing as never);
    await expect(retrying.get("sys")).rejects.toThrow("offline");
    await expect(retrying.get("sys")).rejects.toThrow("offline");
    expect(failing.query).toHaveBeenCalledTimes(2);
  });
});
