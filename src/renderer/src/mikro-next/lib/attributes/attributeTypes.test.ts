import { describe, expect, it } from "vitest";
import type { AttributeFetchKey, AttributePlanLike, ProbedAttributes } from "./attributeTypes";
import {
  applyAttributeRows,
  buildProbedAttributes,
  hopKey,
  hopMetaOf,
  hopMetasOf,
  planIdentity,
} from "./attributeTypes";
import { chainPlan, sparsePlan, tableHop, tablePlan } from "./__fixtures__/plans";

const plan = (over: Partial<AttributePlanLike> = {}): AttributePlanLike =>
  tablePlan({
    edge: { id: "edge-1", version: 3 },
    hops: [tableHop({ table: { id: "table-1", name: "nuclei morphology" } })],
    ...over,
  });

const key = (voxel: [number, number, number] = [1, 2, 0]): AttributeFetchKey => ({
  systemId: "sys-1",
  pointId: `layer-a:${voxel.join(",")}:sig`,
});

describe("planIdentity", () => {
  it("is stable and covers the edge (id, version)", () => {
    expect(planIdentity(plan())).toBe("table-1:edge-1@3");
    expect(planIdentity(plan())).toBe(planIdentity(plan()));
  });

  it("changes when the edge version bumps", () => {
    expect(planIdentity(plan({ edge: { id: "edge-1", version: 4 } }))).not.toBe(
      planIdentity(plan()),
    );
  });

  it("covers every path step's (id, version) and inversion flag", () => {
    const withPath = plan({
      path: [
        {
          transformation: { __typename: "ScaleTransformation", id: "t-9", version: 2 },
          inverted: true,
        },
      ],
    });
    expect(planIdentity(withPath)).toBe("table-1:edge-1@3|~t-9@2");
    const versionBumped = plan({
      path: [
        {
          transformation: { __typename: "ScaleTransformation", id: "t-9", version: 3 },
          inverted: true,
        },
      ],
    });
    expect(planIdentity(versionBumped)).not.toBe(planIdentity(withPath));
  });
});

describe("hopKey / hopMetaOf", () => {
  it("keys the landing by the plan identity and later hops by position and target", () => {
    const chain = chainPlan();
    expect(hopKey(chain, chain.hops[0])).toBe(planIdentity(chain));
    expect(hopKey(chain, chain.hops[1])).toBe(`${planIdentity(chain)}#1:types`);
    expect(hopKey(chain, chain.hops[2])).toBe(`${planIdentity(chain)}#2:sd1`);
  });

  it("keys a sparse landing by the matrix", () => {
    expect(planIdentity(sparsePlan())).toBe("sd1:e-sparse@1");
  });

  it("describes each hop for the HUD: kind, name, parent, via, cardinality", () => {
    const metas = hopMetasOf(chainPlan());
    expect(metas.map((meta) => [meta.kind, meta.name, meta.parentKey === null, meta.via, meta.cardinality])).toEqual([
      ["TABLE", "morphology", true, null, "ONE"],
      ["TABLE", "cell types", false, "via cell_type", "ONE"],
      ["SPARSE", "expression", false, "via i", "ONE"],
    ]);
    expect(metas[1].parentKey).toBe(metas[0].hopKey);
    const names = hopMetaOf(sparsePlan(), sparsePlan().hops[1]);
    expect(names.via).toBe("along gene");
    expect(names.cardinality).toBe("MANY");
    expect(hopMetaOf(sparsePlan(), sparsePlan().hops[0]).valueAxes).toEqual(["gene"]);
  });
});

describe("applyAttributeRows", () => {
  const planKey = planIdentity(plan());
  const current: ProbedAttributes = {
    key: key(),
    byPlan: { [planKey]: { status: "pending", rows: [] } },
    planMeta: {
      [planKey]: hopMetaOf(plan(), plan().hops[0]),
    },
  };

  it("merges a settled plan state for the active key", () => {
    const next = applyAttributeRows(current, key(), planKey, {
      status: "rows",
      rows: [{ area: 12 }],
    });
    expect(next).not.toBeNull();
    expect(next!.byPlan[planKey].status).toBe("rows");
    expect(next!.byPlan[planKey].rows).toEqual([{ area: 12 }]);
  });

  it("returns null (no-op) when the key is stale", () => {
    expect(
      applyAttributeRows(current, key([9, 9, 9]), planKey, {
        status: "rows",
        rows: [],
      }),
    ).toBeNull();
  });

  it("returns null when there is no active entry", () => {
    expect(applyAttributeRows(null, key(), planKey, { status: "rows", rows: [] })).toBeNull();
  });

  it("returns null for a plan the entry never began", () => {
    expect(
      applyAttributeRows(current, key(), "someone-else", { status: "rows", rows: [] }),
    ).toBeNull();
  });
});

describe("buildProbedAttributes", () => {
  const meta = (plans: AttributePlanLike[]): ProbedAttributes["planMeta"] =>
    Object.fromEntries(plans.map((p) => [planIdentity(p), hopMetaOf(p, p.hops[0])]));

  const rows = [{ area: 12 }];

  it("builds the whole slice in one object", () => {
    const p = plan();
    const built = buildProbedAttributes(null, key(), meta([p]), [
      [planIdentity(p), { status: "rows", rows, sampledValue: 7 }],
    ]);

    expect(built).not.toBeNull();
    expect(built!.key).toEqual(key());
    expect(built!.byPlan[planIdentity(p)].rows).toBe(rows);
    expect(built!.planMeta[planIdentity(p)].name).toBe("nuclei morphology");
  });

  it("returns null when the result is value-equal — the caller then skips the set", () => {
    const p = plan();
    const states = [
      [planIdentity(p), { status: "rows", rows, sampledValue: 7 }],
    ] as const;
    const first = buildProbedAttributes(null, key(), meta([p]), states);
    expect(first).not.toBeNull();

    // Re-crossing the same voxel with the same cached rows must cost no render.
    expect(buildProbedAttributes(first, key(), meta([p]), states)).toBeNull();
  });

  it("rebuilds when the probed point moves", () => {
    const p = plan();
    const states = [
      [planIdentity(p), { status: "rows", rows, sampledValue: 7 }],
    ] as const;
    const first = buildProbedAttributes(null, key([1, 2, 0]), meta([p]), states);
    expect(
      buildProbedAttributes(first, key([9, 9, 0]), meta([p]), states),
    ).not.toBeNull();
  });

  it("rebuilds when a plan's rows change at the same point", () => {
    const p = plan();
    const first = buildProbedAttributes(null, key(), meta([p]), [
      [planIdentity(p), { status: "rows", rows, sampledValue: 7 }],
    ]);
    const next = buildProbedAttributes(first, key(), meta([p]), [
      [planIdentity(p), { status: "rows", rows: [{ area: 99 }], sampledValue: 8 }],
    ]);
    expect(next).not.toBeNull();
    expect(next!.byPlan[planIdentity(p)].sampledValue).toBe(8);
  });

  it("rebuilds when the plan SET changes even if the shared plan is unchanged", () => {
    const a = plan();
    const b = plan({ edge: { id: "edge-2", version: 1 }, hops: [tableHop({ table: { id: "t2", name: "b" } })] });
    const stateA = [planIdentity(a), { status: "rows" as const, rows }] as const;
    const first = buildProbedAttributes(null, key(), meta([a]), [stateA]);
    const next = buildProbedAttributes(first, key(), meta([a, b]), [
      stateA,
      [planIdentity(b), { status: "rows", rows }],
    ]);
    expect(next).not.toBeNull();
  });
});
