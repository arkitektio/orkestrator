import { describe, expect, it } from "vitest";
import type { RowPlanQuery } from "@/mikro/api/graphql";
import { RowPlanCache, type QueryClient } from "./planCache";

const landing = {
  index: 0,
  parent: null,
  cardinality: "ONE",
  via: null,
  joinPath: [],
  table: { id: "t1", name: "Clusters", columns: [], keyedBy: [] },
  sparseDataset: null,
  arrayDataset: null,
  lookup: { kind: "TABLE", store: { id: "s1" }, keyColumns: [], attributes: [] },
};

const answer = (hops: unknown[]) =>
  ({
    rowPlan: {
      key: { axis: "cluster", column: { name: "cluster" } },
      table: { id: "t1", name: "Clusters" },
      hops,
    },
  }) as unknown as RowPlanQuery;

const client = (respond: () => Promise<{ data: RowPlanQuery }>) => {
  let calls = 0;
  const query: QueryClient<RowPlanQuery> = {
    query: () => {
      calls += 1;
      return respond();
    },
  };
  return { query, calls: () => calls };
};

describe("RowPlanCache", () => {
  it("fetches a table's plan once and serves every row from it", async () => {
    const c = client(async () => ({ data: answer([landing]) }));
    const cache = new RowPlanCache(c.query);
    expect(cache.peek("t1")).toBeUndefined();
    const plan = await cache.get("t1");
    await cache.get("t1");
    expect(c.calls()).toBe(1);
    expect(plan).toMatchObject({ kind: "row", key: { axis: "cluster" }, table: { id: "t1" } });
    expect(cache.peek("t1")).toBe(plan);
  });

  it("knows a table whose row itself is not executable, as null", async () => {
    const c = client(async () => ({ data: answer([{ ...landing, lookup: { ...landing.lookup, store: null } }]) }));
    const cache = new RowPlanCache(c.query);
    expect(await cache.get("t1")).toBeNull();
    expect(cache.peek("t1")).toBeNull();
  });

  it("does not keep a refusal: the next pick asks again, and hears the server's reason", async () => {
    let refuse = true;
    const c = client(async () => {
      if (refuse) throw new Error("Declare an INDEX column to probe this table by row");
      return { data: answer([landing]) };
    });
    const cache = new RowPlanCache(c.query);
    await expect(cache.get("t1")).rejects.toThrow(/INDEX column/);
    refuse = false;
    expect(await cache.get("t1")).not.toBeNull();
    expect(c.calls()).toBe(2);
  });
});
