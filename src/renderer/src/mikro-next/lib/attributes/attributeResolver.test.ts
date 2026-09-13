import { describe, expect, it } from "vitest";
import type {
  AttributeFetchKey,
  AttributePlanLike,
  PlanRowsState,
} from "./attributeTypes";
import { planIdentity } from "./attributeTypes";
import { createAttributeResolver } from "./attributeResolver";
import { tableHop, tablePlan } from "./__fixtures__/plans";

const key = (voxel: [number, number, number]): AttributeFetchKey => ({
  systemId: "sys-1",
  pointId: `layer-a:${voxel.join(",")}:sig`,
});

const makePlan = (edgeId: string): AttributePlanLike =>
  tablePlan({
    edge: { id: edgeId, version: 1 },
    hops: [tableHop({ table: { id: `table-${edgeId}`, name: edgeId } })],
  });

type Deliver = (hopKey: string, state: PlanRowsState) => void;

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("createAttributeResolver", () => {
  it("begins with the discovered plans and delivers per hop as each settles", async () => {
    const plans = [makePlan("a"), makePlan("b")];
    const settles: { plan: AttributePlanLike; deliver: Deliver; done: () => void }[] = [];
    const delivered: [string, PlanRowsState][] = [];
    let began: readonly AttributePlanLike[] = [];

    const resolver = createAttributeResolver({
      resolvePlans: async () => plans,
      executePlan: (_k, plan, _stale, deliver) =>
        new Promise<void>((done) => settles.push({ plan, deliver, done })),
      begin: (_k, p) => {
        began = p;
      },
      deliver: (_k, hopKey, state) => delivered.push([hopKey, state]),
    });

    resolver.request(key([1, 1, 0]));
    await tick();
    expect(began).toEqual(plans);
    expect(settles).toHaveLength(2);

    settles[1].deliver(planIdentity(plans[1]), { status: "rows", rows: [{ n: 2 }] });
    expect(delivered).toEqual([[planIdentity(plans[1]), { status: "rows", rows: [{ n: 2 }] }]]);

    settles[0].deliver(planIdentity(plans[0]), { status: "background", rows: [] });
    settles.forEach((entry) => entry.done());
    await tick();
    expect(delivered).toHaveLength(2);
  });

  it("drops stale settlements: only the newest request delivers", async () => {
    const plans = [makePlan("a")];
    const settles: Deliver[] = [];
    const delivered: [AttributeFetchKey, PlanRowsState][] = [];

    const resolver = createAttributeResolver({
      resolvePlans: async () => plans,
      executePlan: (_k, _p, _stale, deliver) => {
        settles.push(deliver);
        return new Promise(() => {});
      },
      begin: () => {},
      deliver: (k, _p, state) => delivered.push([k, state]),
    });

    resolver.request(key([1, 0, 0]));
    await tick();
    resolver.request(key([2, 0, 0]));
    await tick();
    expect(settles).toHaveLength(2);

    // The first (stale) settlement must not deliver.
    settles[0]("hop", { status: "rows", rows: [{ old: true }] });
    expect(delivered).toHaveLength(0);

    settles[1]("hop", { status: "rows", rows: [{ fresh: true }] });
    expect(delivered).toHaveLength(1);
    expect(delivered[0][0].pointId).toBe(key([2, 0, 0]).pointId);
  });

  it("never starts execution for a request superseded during discovery", async () => {
    const plans = [makePlan("a")];
    const executedFor: string[] = [];

    const resolver = createAttributeResolver({
      resolvePlans: async () => plans,
      executePlan: async (k, _p, isStale) => {
        executedFor.push(k.pointId);
        expect(isStale()).toBe(false);
      },
      begin: () => {},
      deliver: () => {},
    });

    resolver.request(key([1, 0, 0]));
    resolver.request(key([2, 0, 0])); // supersedes before discovery settles
    await tick();
    await tick();
    // Only the newest request reaches execution at all.
    expect(executedFor).toEqual([key([2, 0, 0]).pointId]);
  });

  it("begins with an empty plan set so stale attributes clear", async () => {
    const began: (readonly AttributePlanLike[])[] = [];
    const resolver = createAttributeResolver({
      resolvePlans: async () => [],
      executePlan: async () => {},
      begin: (_k, plans) => began.push(plans),
      deliver: () => {},
    });
    resolver.request(key([1, 0, 0]));
    await tick();
    expect(began).toEqual([[]]);
  });

  it("dedupes repeated requests for the same point", async () => {
    let discoveries = 0;
    const resolver = createAttributeResolver({
      resolvePlans: async () => {
        discoveries++;
        return [];
      },
      executePlan: async () => {},
      begin: () => {},
      deliver: () => {},
    });
    resolver.request(key([1, 0, 0]));
    resolver.request(key([1, 0, 0]));
    await tick();
    expect(discoveries).toBe(1);
  });

  it("logs, and delivers nothing, when a plan execution rejects outright", async () => {
    const plans = [makePlan("a")];
    const delivered: PlanRowsState[] = [];
    const warned: unknown[] = [];
    const warn = console.warn;
    console.warn = (...args: unknown[]) => warned.push(args);
    try {
      const resolver = createAttributeResolver({
        resolvePlans: async () => plans,
        executePlan: async () => {
          throw new Error("boom");
        },
        begin: () => {},
        deliver: (_k, _p, state) => delivered.push(state),
      });
      resolver.request(key([1, 0, 0]));
      await tick();
      await tick();
    } finally {
      console.warn = warn;
    }
    expect(delivered).toEqual([]);
    expect(warned).toHaveLength(1);
  });

  it("delivers nothing after dispose", async () => {
    const plans = [makePlan("a")];
    let settle: Deliver | null = null;
    const delivered: PlanRowsState[] = [];
    const resolver = createAttributeResolver({
      resolvePlans: async () => plans,
      executePlan: (_k, _p, _stale, deliver) => {
        settle = deliver;
        return new Promise(() => {});
      },
      begin: () => {},
      deliver: (_k, _p, state) => delivered.push(state),
    });
    resolver.request(key([1, 0, 0]));
    await tick();
    resolver.dispose();
    settle!("hop", { status: "rows", rows: [] });
    await tick();
    expect(delivered).toHaveLength(0);
  });
});
