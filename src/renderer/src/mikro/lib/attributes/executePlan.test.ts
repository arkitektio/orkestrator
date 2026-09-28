import { describe, expect, it } from "vitest";
import type { AttributePlanLike, PlanRowsState, SparseHopLike, TableHopLike } from "./attributeTypes";
import { hopKey } from "./attributeTypes";
import {
  executePlanAt,
  executePlanWithValue,
  peekPlanWithValue,
  type ExecutePlanDeps,
  type SparseProfileReaderLike,
} from "./executePlan";
import type { AttributeLookupEngine } from "./lookupEngine";
import type { HeldMap, HeldValue } from "./planExec";
import { arraySample, chainPlan, sparsePlan, tablePlan } from "./__fixtures__/plans";

const plan = tablePlan;

type Lookup = { hop: TableHopLike; held: HeldMap; columns: readonly string[] | null };
type FakeEngine = { lookups: Lookup[]; engine: AttributeLookupEngine };

/** Rows per table id; a function answers from the bound values. */
const fakeEngine = (
  rowsFor: Record<string, readonly Record<string, unknown>[] | ((held: HeldMap) => readonly Record<string, unknown>[])> = {
    t1: [{ area: 1 }],
  },
  peekable = false,
): FakeEngine => {
  const lookups: Lookup[] = [];
  const answer = (hop: TableHopLike, held: HeldMap) => {
    const rows = rowsFor[hop.table.id];
    return typeof rows === "function" ? rows(held) : (rows ?? []);
  };
  const engine = {
    lookup: async (
      _plan: AttributePlanLike,
      hop: TableHopLike,
      held: HeldMap,
      isStale: () => boolean,
      options: { columns?: readonly string[] | null } = {},
    ) => {
      lookups.push({ hop, held, columns: options.columns ?? null });
      return isStale() ? null : answer(hop, held);
    },
    peek: (_plan: AttributePlanLike, hop: TableHopLike, held: HeldMap) =>
      peekable ? answer(hop, held) : null,
  } as unknown as AttributeLookupEngine;
  return { lookups, engine };
};

type SparseRead = { hop: SparseHopLike; id: HeldValue; limit: number };
const fakeSparse = (
  profile: readonly { position: number; value: number }[] = [
    { position: 4, value: 9 },
    { position: 2, value: 3 },
  ],
  peekable = false,
): { reads: SparseRead[]; sparse: SparseProfileReaderLike } => {
  const reads: SparseRead[] = [];
  const state = (hop: SparseHopLike, limit: number): PlanRowsState => {
    const rows = profile.slice(0, limit).map((entry) => ({ ...entry, [hop.lookup.valueAxes[0]]: entry.position }));
    return {
      status: "rows",
      rows,
      ...(profile.length > rows.length ? { truncated: { shown: rows.length, total: profile.length } } : {}),
    };
  };
  const sparse: SparseProfileReaderLike = {
    read: async (_plan, hop, id, options) => {
      reads.push({ hop, id, limit: options.limit });
      return options.isStale?.() ? null : state(hop, options.limit);
    },
    peek: (_plan, hop, _id, limit) => (peekable ? state(hop, limit) : null),
    warm: () => {},
    dispose: () => {},
  };
  return { reads, sparse };
};

const deps = (
  engine: AttributeLookupEngine,
  exact: (index: readonly number[]) => Promise<HeldValue | null>,
  sparse: SparseProfileReaderLike = fakeSparse().sparse,
): ExecutePlanDeps => ({
  engine,
  sparse,
  sampleExact: (_plan, index) => exact(index),
});

const landing = (p: AttributePlanLike) => hopKey(p, p.hops[0]);

describe("executePlanAt", () => {
  it("samples exactly and looks up rows for a plain coordinate ask", async () => {
    const { engine, lookups } = fakeEngine({ t1: [{ area: 42 }] });
    const exactIndices: (readonly number[])[] = [];
    const states = await executePlanAt(
      deps(engine, async (index) => {
        exactIndices.push(index);
        return 7;
      }),
      plan(),
      { t: 1, y: 3, x: 5 },
    );
    expect(states).toEqual({
      [landing(plan())]: {
        status: "rows",
        rows: [{ area: 42 }],
        sampledValue: 7,
        sampleSource: "exact",
      },
    });
    // Full array index in the sample system's axis order (t, y, x).
    expect(exactIndices).toEqual([[1, 3, 5]]);
    // Held = passthrough axes + the produced value under the plan's name.
    expect(lookups[0].held).toEqual({ t: 1, i: 7 });
  });

  it("prefers the resident sync sample and tags provenance", async () => {
    const { engine } = fakeEngine();
    let exactCalls = 0;
    const states = await executePlanAt(
      deps(engine, async () => {
        exactCalls++;
        return 9;
      }),
      plan(),
      { t: 0, y: 0, x: 1 },
      { sampleSync: () => 5 },
    );
    expect(states?.[landing(plan())]).toMatchObject({ sampleSource: "resident", sampledValue: 5 });
    expect(exactCalls).toBe(0);
  });

  it("returns background for a zero sample without looking up", async () => {
    const { engine, lookups } = fakeEngine();
    const states = await executePlanAt(deps(engine, async () => 0), plan(), { t: 0, y: 0, x: 0 });
    expect(states?.[landing(plan())].status).toBe("background");
    expect(lookups).toHaveLength(0);
  });

  it("is unreachable (with the reason surfaced) when the point exits the array", async () => {
    const { engine } = fakeEngine();
    const reasons: string[] = [];
    const states = await executePlanAt(
      deps(engine, async () => 1),
      plan(),
      { t: 99, y: 0, x: 0 }, // t exceeds shape[0]=4
      { onUnreachable: (_hopKey, reason) => reasons.push(reason) },
    );
    expect(states?.[landing(plan())].status).toBe("unreachable");
    expect(reasons).toEqual(["mapped point does not index the field array"]);
  });

  it("resolves null when the request goes stale after the exact read", async () => {
    const { engine } = fakeEngine();
    let stale = false;
    const states = await executePlanAt(
      deps(engine, async () => {
        stale = true; // superseded while the chunk read was in flight
        return 3;
      }),
      plan(),
      { t: 0, y: 0, x: 0 },
      { isStale: () => stale },
    );
    expect(states).toBeNull();
  });

  it("errors when sampling fails outright", async () => {
    const { engine } = fakeEngine();
    const states = await executePlanAt(deps(engine, async () => null), plan(), { t: 0, y: 0, x: 0 });
    expect(states?.[landing(plan())].status).toBe("error");
  });

  it("passes the projection through to the engine", async () => {
    const { engine, lookups } = fakeEngine();
    await executePlanAt(deps(engine, async () => 1), plan(), { t: 0, y: 0, x: 0 }, {
      columnsFor: () => ["area"],
    });
    expect(lookups[0].columns).toEqual(["area"]);
  });
});

describe("the chain", () => {
  it("runs a sparse landing, then binds its positions as a MANY names hop", async () => {
    const sparse = sparsePlan();
    const { reads, sparse: reader } = fakeSparse([
      { position: 4, value: 9 },
      { position: 2, value: 3 },
      { position: 7, value: 1 },
    ]);
    const { engine, lookups } = fakeEngine({
      genes: (held) => (held.gene as number[]).map((gene) => ({ gene, symbol: `G${gene}` })),
    });
    const delivered: string[] = [];
    const states = await executePlanAt(
      deps(engine, async () => 11, reader),
      sparse,
      { t: 0, y: 0, x: 0 },
      { sparseLimit: 2, onHop: (id) => delivered.push(id) },
    );
    const [landingKey, namesKey] = sparse.hops.map((hop) => hopKey(sparse, hop));
    expect(reads).toEqual([{ hop: sparse.hops[0], id: 11, limit: 2 }]);
    expect(states?.[landingKey]).toMatchObject({
      status: "rows",
      sampledValue: 11,
      truncated: { shown: 2, total: 3 },
    });
    expect(states?.[landingKey].rows.map((row) => row.position)).toEqual([4, 2]);
    // The names hop binds every position the (capped) profile returned.
    expect(lookups[0].hop.table.id).toBe("genes");
    expect(lookups[0].held).toEqual({ i: 11, gene: [4, 2] });
    expect(states?.[namesKey]).toEqual({
      status: "rows",
      rows: [
        { gene: 4, symbol: "G4" },
        { gene: 2, symbol: "G2" },
      ],
    });
    expect(delivered).toEqual([landingKey, namesKey]);
  });

  it("crosses a reference as ONE and enters a matrix from the landing's INDEX column", async () => {
    const chain = chainPlan();
    const { reads, sparse: reader } = fakeSparse();
    const { engine, lookups } = fakeEngine({
      t1: [{ area: 5, cell_type: 3 }],
      types: (held) => [{ label: `type-${String(held.cell_type)}` }],
    });
    const states = await executePlanAt(deps(engine, async () => 11, reader), chain, { t: 0, y: 0, x: 0 });
    const keys = chain.hops.map((hop) => hopKey(chain, hop));
    expect(lookups.map((entry) => [entry.hop.table.id, entry.held])).toEqual([
      ["t1", { i: 11 }],
      ["types", { i: 11, cell_type: 3 }],
    ]);
    expect(states?.[keys[1]]).toEqual({ status: "rows", rows: [{ label: "type-3" }] });
    // The matrix hop binds the parent row's `i` (its `keyHeld`).
    expect(reads).toEqual([{ hop: chain.hops[2], id: 11, limit: 25 }]);
    expect(states?.[keys[2]].status).toBe("rows");
    // Later hops carry no sample provenance; the landing does.
    expect(states?.[keys[0]].sampledValue).toBe(11);
    expect(states?.[keys[1]].sampledValue).toBeUndefined();
  });

  it("runs only the selected hops, and a child whose parent is off is unreachable", async () => {
    const chain = chainPlan();
    const { engine, lookups } = fakeEngine({ t1: [{ area: 5, cell_type: 3 }] });
    const reasons: string[] = [];
    const states = await executePlanAt(deps(engine, async () => 11), chain, { t: 0, y: 0, x: 0 }, {
      hops: [chain.hops[1]],
      onUnreachable: (_key, reason) => reasons.push(reason),
    });
    expect(lookups).toHaveLength(0);
    expect(Object.keys(states ?? {})).toEqual([hopKey(chain, chain.hops[1])]);
    expect(reasons).toEqual(["the hop's parent did not run"]);
  });

  it("gives a child nothing to bind when the parent returned no rows", async () => {
    const chain = chainPlan();
    const { engine, lookups } = fakeEngine({ t1: [] });
    const states = await executePlanAt(deps(engine, async () => 11), chain, { t: 0, y: 0, x: 0 }, {
      hops: [chain.hops[0], chain.hops[1]],
    });
    expect(lookups).toHaveLength(1);
    expect(states?.[hopKey(chain, chain.hops[1])]).toEqual({ status: "rows", rows: [] });
  });

  it("binds several parent rows as a list, and refuses several into a matrix", async () => {
    const chain = chainPlan();
    const { engine, lookups } = fakeEngine({
      t1: [
        { area: 5, cell_type: 3 },
        { area: 6, cell_type: 4 },
      ],
      types: () => [],
    });
    const reasons: string[] = [];
    await executePlanAt(deps(engine, async () => 11), chain, { t: 0, y: 0, x: 0 }, {
      onUnreachable: (_key, reason) => reasons.push(reason),
    });
    expect(lookups[1].held).toEqual({ i: 11, cell_type: [3, 4] });
    // Both rows hold the same `i`, so the matrix hop still binds one id.
    expect(reasons).toEqual([]);
  });

  it("reports one hop's failure on that hop and lets its parent stand", async () => {
    const chain = chainPlan();
    const { engine } = fakeEngine({
      t1: [{ area: 5, cell_type: 3 }],
      types: () => {
        throw new Error("parquet unreadable");
      },
    });
    const states = await executePlanAt(deps(engine, async () => 11), chain, { t: 0, y: 0, x: 0 });
    expect(states?.[hopKey(chain, chain.hops[0])].status).toBe("rows");
    expect(states?.[hopKey(chain, chain.hops[1])]).toEqual({
      status: "error",
      rows: [],
      error: "parquet unreadable",
    });
  });
});

describe("executePlanWithValue", () => {
  it("yields the SAME states and held values as sampling that value at a voxel", async () => {
    // The mesh-probe contract: a pick that already knows its instance id must
    // be indistinguishable, lookup-wise, from sampling the mask there.
    const sampled = fakeEngine({ t1: [{ area: 42 }] });
    const known = fakeEngine({ t1: [{ area: 42 }] });
    const viaSample = await executePlanAt(deps(sampled.engine, async () => 7), plan(), { t: 1, y: 3, x: 5 });
    const viaValue = await executePlanWithValue(
      { engine: known.engine, sparse: fakeSparse().sparse },
      plan(),
      { t: 1, y: 3, x: 5 },
      7,
    );
    expect(viaValue).toEqual(viaSample);
    expect(known.lookups[0].held).toEqual(sampled.lookups[0].held); // {t:1, i:7}
  });

  it("short-circuits a background value without a lookup", async () => {
    const { engine, lookups } = fakeEngine();
    const states = await executePlanWithValue(
      { engine, sparse: fakeSparse().sparse },
      plan(),
      { t: 0, y: 0, x: 0 },
      0,
    );
    expect(states?.[landing(plan())].status).toBe("background");
    expect(lookups).toHaveLength(0);
  });

  it("never touches the field array — no sampler is even provided", async () => {
    const { engine, lookups } = fakeEngine({ t1: [{ area: 1 }] });
    // Out-of-bounds coordinates for the ARRAY are irrelevant here: the value
    // is known, only path mapping and held-building matter.
    const states = await executePlanWithValue(
      { engine, sparse: fakeSparse().sparse },
      plan(),
      { t: 99, y: 0, x: 0 },
      3,
    );
    expect(states?.[landing(plan())].status).toBe("rows");
    expect(lookups[0].held).toEqual({ t: 99, i: 3 });
  });
});

describe("peekPlanWithValue", () => {
  it("answers the whole chain from caches, and misses on the first uncached hop", () => {
    const sparse = sparsePlan();
    const hit = peekPlanWithValue(
      { engine: fakeEngine({ genes: [{ gene: 4, symbol: "G4" }] }, true).engine, sparse: fakeSparse(undefined, true).sparse },
      sparse,
      { t: 0, y: 0, x: 0 },
      11,
      "resident",
    );
    expect(hit && Object.keys(hit)).toEqual(sparse.hops.map((hop) => hopKey(sparse, hop)));
    expect(hit?.[hopKey(sparse, sparse.hops[0])]).toMatchObject({ sampledValue: 11, sampleSource: "resident" });
    const miss = peekPlanWithValue(
      { engine: fakeEngine({}, false).engine, sparse: fakeSparse(undefined, true).sparse },
      sparse,
      { t: 0, y: 0, x: 0 },
      11,
      "resident",
    );
    expect(miss).toBeNull();
  });

  it("needs no cache for background", () => {
    const states = peekPlanWithValue(
      { engine: fakeEngine({}, false).engine, sparse: fakeSparse(undefined, false).sparse },
      plan(),
      { t: 0, y: 0, x: 0 },
      0,
      "resident",
    );
    expect(states?.[landing(plan())].status).toBe("background");
  });
});

describe("mesh-sampled plans", () => {
  const meshPlan = () =>
    plan({
      sample: arraySample({
        __typename: "MeshSample",
        store: { id: "fab1" }, // a FabriksStore — no shape, nothing to index
      } as never),
    });

  it("cannot be executed by a coordinate ask — only a pick holds the id", async () => {
    const { engine, lookups } = fakeEngine();
    const reasons: string[] = [];
    const states = await executePlanAt(deps(engine, async () => 1), meshPlan(), { t: 0, y: 0, x: 0 }, {
      onUnreachable: (_hopKey, reason) => reasons.push(reason),
    });
    expect(states?.[landing(meshPlan())].status).toBe("unreachable");
    expect(reasons).toEqual(["a geometry-sampled plan needs a picked instance id"]);
    expect(lookups).toHaveLength(0);
  });

  it("executes through the value-known path — the DESIGNED route for picks", async () => {
    const { engine, lookups } = fakeEngine({ t1: [{ area: 42 }] });
    const states = await executePlanWithValue(
      { engine, sparse: fakeSparse().sparse },
      meshPlan(),
      { t: 1, y: 0, x: 0 },
      7,
    );
    expect(states?.[landing(meshPlan())].status).toBe("rows");
    expect(lookups[0].held).toEqual({ t: 1, i: 7 });
  });
});
