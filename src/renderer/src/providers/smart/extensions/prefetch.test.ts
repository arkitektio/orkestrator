// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { AllPrimaryActionsDocument, ShortcutsDocument } from "@/rekuest/api/graphql";
import { buildDemands } from "./demands";
import { createSmartPrefetcher, type PrefetchClient } from "./prefetch";
import { actionsVariables, shortcutsVariables } from "@/rekuest/smart/queries";

const image = (id: string) => ({ identifier: "@mikro/image", id });

const setup = (options: { ttlMs?: number; maxKeys?: number; client?: PrefetchClient | null } = {}) => {
  const query = vi.fn().mockResolvedValue({});
  const client: PrefetchClient = options.client === undefined ? { query } as never : (options.client as never);
  let time = 0;
  const prefetcher = createSmartPrefetcher({
    getClients: () => (client ? { rekuest: client } : {}),
    now: () => time,
    ttlMs: options.ttlMs,
    maxKeys: options.maxKeys,
  });
  return { query, prefetcher, advance: (ms: number) => { time += ms; } };
};

describe("createSmartPrefetcher", () => {
  it("warms actions and shortcuts once per target within the TTL", () => {
    const { query, prefetcher, advance } = setup({ ttlMs: 1000 });
    prefetcher.prefetch({ objects: [image("1")] });
    prefetcher.prefetch({ objects: [image("2")] });
    expect(query).toHaveBeenCalledTimes(2);
    advance(1000);
    prefetcher.prefetch({ objects: [image("3")] });
    expect(query).toHaveBeenCalledTimes(4);
  });

  it("passes cache-first and the section builders' exact variables", () => {
    const { query, prefetcher } = setup();
    prefetcher.prefetch({ objects: [image("1")], collection: "c" });
    const demands = buildDemands({ objects: [image("1")] });
    expect(query).toHaveBeenCalledWith({
      query: AllPrimaryActionsDocument,
      variables: actionsVariables(demands.single, { collection: "c" }),
      fetchPolicy: "cache-first",
      errorPolicy: "ignore",
    });
    expect(query).toHaveBeenCalledWith({
      query: ShortcutsDocument,
      variables: shortcutsVariables(demands.single),
      fetchPolicy: "cache-first",
      errorPolicy: "ignore",
    });
  });

  it("keys on the collection and on the partners", () => {
    const { query, prefetcher } = setup();
    prefetcher.prefetch({ objects: [image("1")] });
    prefetcher.prefetch({ objects: [image("1")], collection: "c" });
    prefetcher.prefetch({ objects: [image("1")], partners: [image("2")] });
    // 2 for the bare target, 1 more for the collection (shortcuts take none), 2 for the pair.
    expect(query).toHaveBeenCalledTimes(5);
  });

  it("does nothing without objects or without a ready client, and remembers nothing", () => {
    const { query, prefetcher } = setup({ client: null });
    prefetcher.prefetch({ objects: [image("1")] });
    expect(query).not.toHaveBeenCalled();
    expect(prefetcher.keys()).toEqual([]);
    const ready = setup();
    ready.prefetcher.prefetch({ objects: [] });
    expect(ready.query).not.toHaveBeenCalled();
  });

  it("forgets a key whose query failed so it is retried", async () => {
    const query = vi.fn().mockRejectedValue(new Error("down"));
    const prefetcher = createSmartPrefetcher({ getClients: () => ({ rekuest: { query } as never }), now: () => 0 });
    prefetcher.prefetch({ objects: [image("1")] });
    await Promise.resolve();
    await Promise.resolve();
    expect(prefetcher.keys()).toEqual([]);
    prefetcher.prefetch({ objects: [image("1")] });
    expect(query).toHaveBeenCalledTimes(4);
  });

  it("evicts the oldest keys past maxKeys", () => {
    const { prefetcher } = setup({ maxKeys: 2 });
    prefetcher.prefetch({ objects: [image("1")] });
    prefetcher.prefetch({ objects: [{ identifier: "@mikro/dataset", id: "1" }] });
    expect(prefetcher.keys()).toHaveLength(2);
    expect(prefetcher.keys().every((key) => key.includes("@mikro/dataset"))).toBe(true);
  });
});
