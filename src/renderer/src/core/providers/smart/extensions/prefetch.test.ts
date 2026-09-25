import { describe, expect, it, vi } from "vitest";
import { parse } from "graphql";
import { createSmartPrefetcher, type PrefetchClient } from "./prefetch";
import type { SmartContextSection } from "./section";

const image = (id: string) => ({ identifier: "@mikro/image", id });
const QUERY = parse("query Q { q }");

/** A section that warms one query per call, keyed on the first object's identifier. */
const section = (id: string, service = "svc"): SmartContextSection<any> =>
  ({
    id,
    prefetch: (target) => [
      {
        service,
        name: "items",
        query: QUERY,
        variables: { identifier: target.objects[0]?.identifier, collection: target.collection },
      },
    ],
  }) as SmartContextSection<any>;

const setup = (
  options: { ttlMs?: number; maxKeys?: number; client?: PrefetchClient | null; sections?: SmartContextSection<any>[] } = {},
) => {
  const query = vi.fn().mockResolvedValue({});
  const client = options.client === undefined ? ({ query } as never) : options.client;
  let time = 0;
  const prefetcher = createSmartPrefetcher({
    getSections: () => options.sections ?? [section("a.one"), section("b.two")],
    getClient: (service) => (service === "svc" && client ? client : undefined),
    now: () => time,
    ttlMs: options.ttlMs,
    maxKeys: options.maxKeys,
  });
  return { query, prefetcher, advance: (ms: number) => (time += ms) };
};

describe("createSmartPrefetcher", () => {
  it("warms what every section asks for, once per variables within the TTL", () => {
    const { query, prefetcher, advance } = setup({ ttlMs: 1000 });
    prefetcher.prefetch({ objects: [image("1")] });
    prefetcher.prefetch({ objects: [image("2")] }); // same variables: identifier only
    expect(query).toHaveBeenCalledTimes(2);
    advance(1000);
    prefetcher.prefetch({ objects: [image("3")] });
    expect(query).toHaveBeenCalledTimes(4);
  });

  it("queries cache-first with the section's exact variables", () => {
    const { query, prefetcher } = setup({ sections: [section("a.one")] });
    prefetcher.prefetch({ objects: [image("1")], collection: "c" });
    expect(query).toHaveBeenCalledWith({
      query: QUERY,
      variables: { identifier: "@mikro/image", collection: "c" },
      fetchPolicy: "cache-first",
      errorPolicy: "ignore",
    });
  });

  it("dedupes on the variables, whatever their key order", () => {
    const flipped = {
      id: "a.flip",
      prefetch: () => [{ service: "svc", name: "x", query: QUERY, variables: { b: 1, a: 2 } }],
    } as unknown as SmartContextSection<any>;
    const ordered = {
      id: "a.flip",
      prefetch: () => [{ service: "svc", name: "x", query: QUERY, variables: { a: 2, b: 1 } }],
    } as unknown as SmartContextSection<any>;
    let current = flipped;
    const query = vi.fn().mockResolvedValue({});
    const prefetcher = createSmartPrefetcher({ getSections: () => [current], getClient: () => ({ query }) as never });
    prefetcher.prefetch({ objects: [image("1")] });
    current = ordered;
    prefetcher.prefetch({ objects: [image("1")] });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("does nothing without objects or for a service that is not ready, and remembers nothing", () => {
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
    const { prefetcher } = setup({ client: { query } as never });
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
