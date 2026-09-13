import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AttributePlanLike } from "./attributeTypes";
import { hopKey } from "./attributeTypes";
import { EMPTY_SELECTION, withHopColumns, withHopEnabled } from "./attributeSelection";
import { arraySample, sparsePlan, tablePlan } from "./__fixtures__/plans";
import {
  acquireAttributeService,
  createAttributeService,
  type AttributeServiceClient,
} from "./attributeService";

/**
 * The engine and the exact sampler are mocked at the module seam
 * (`createLookupEngine` / `createExactSampler`) so the service is tested pure:
 * no DuckDB WASM, no zarr worker.
 */
const mocks = vi.hoisted(() => ({
  engine: {
    lookup: vi.fn(async () => [{ area: 12.5 }]),
    peek: vi.fn(() => null as readonly Record<string, unknown>[] | null),
    warm: vi.fn(),
    followReference: vi.fn(async () => [{ duration: 4.2 }]),
    peekReference: vi.fn(() => null),
    dispose: vi.fn(),
  },
  sampler: {
    readExact: vi.fn(async () => 7 as number | bigint | null),
    registerArrayProvider: vi.fn(),
    dispose: vi.fn(),
  },
  sparse: {
    read: vi.fn(async () => ({ status: "rows", rows: [{ position: 4, gene: 4, value: 9 }] })),
    peek: vi.fn(() => null),
    warm: vi.fn(),
    dispose: vi.fn(),
  },
}));

vi.mock("./createLookupEngine", () => ({
  createLookupEngine: () => mocks.engine,
}));
vi.mock("./exactSampleSource", () => ({
  createExactSampler: () => mocks.sampler,
}));
vi.mock("../sparse/sparseProfile", () => ({
  createSparseProfileReader: () => mocks.sparse,
}));
// The generated GraphQL module drags in browser-only app wiring; the plan
// cache only needs the query document's identity.
vi.mock("@/mikro-next/api/graphql", () => ({
  AttributePlansDocument: {},
}));

const planFragment = (edgeId = "e1"): AttributePlanLike =>
  tablePlan({
    edge: { id: edgeId, version: 1 },
    sample: arraySample({
      system: {
        id: "sys-1",
        axes: [
          { name: "t", order: 0 },
          { name: "y", order: 1 },
          { name: "x", order: 2 },
        ],
      },
      store: { id: "z1", bucket: "b", key: "k" },
    }),
  });

const fakeClient = (plans: readonly AttributePlanLike[] = [planFragment()]) => {
  const query = vi.fn(async () => ({ data: { attributePlans: plans } }));
  const mutate = vi.fn(async () => ({ data: {} }));
  return {
    client: { query, mutate } as unknown as AttributeServiceClient,
    query,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("createAttributeService", () => {
  it("answers attributesAt from coordinates alone and caches the point", async () => {
    const { client, query } = fakeClient();
    const service = createAttributeService({ client, datalayer: "http://dl" });

    const results = await service.attributesAt({
      systemId: "sys-1",
      coords: { t: 1, y: 3, x: 5 },
    });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("morphology");
    expect(results[0].kind).toBe("TABLE");
    expect(results[0].state).toMatchObject({
      status: "rows",
      rows: [{ area: 12.5 }],
      sampledValue: 7,
      sampleSource: "exact",
    });

    // Second ask for the same point: no discovery, no sampling, no lookup.
    await service.attributesAt({ systemId: "sys-1", coords: { t: 1, y: 3, x: 5 } });
    expect(query).toHaveBeenCalledTimes(1);
    expect(mocks.sampler.readExact).toHaveBeenCalledTimes(1);
    expect(mocks.engine.lookup).toHaveBeenCalledTimes(1);

    expect(
      service.peekAttributesAt({ systemId: "sys-1", coords: { t: 1, y: 3, x: 5 } }),
    ).toEqual(results);
    expect(
      service.peekAttributesAt({ systemId: "sys-1", coords: { t: 2, y: 3, x: 5 } }),
    ).toBeNull();
  });

  it("does not cache a point whose execution was aborted", async () => {
    const { client } = fakeClient();
    const service = createAttributeService({ client, datalayer: "http://dl" });
    const controller = new AbortController();
    controller.abort();
    const aborted = await service.attributesAt({
      systemId: "sys-1",
      coords: { t: 0, y: 0, x: 0 },
      signal: controller.signal,
    });
    expect(aborted).toEqual([]);
    expect(
      service.peekAttributesAt({ systemId: "sys-1", coords: { t: 0, y: 0, x: 0 } }),
    ).toBeNull();
    // A fresh, unaborted ask runs the full pipeline.
    const results = await service.attributesAt({
      systemId: "sys-1",
      coords: { t: 0, y: 0, x: 0 },
    });
    expect(results).toHaveLength(1);
  });

  it("warm discovers plans once and warms the engine per selected hop", async () => {
    const { client, query } = fakeClient([planFragment("e1"), planFragment("e2"), sparsePlan()]);
    const service = createAttributeService({ client, datalayer: "http://dl" });
    await service.warm("sys-1");
    expect(query).toHaveBeenCalledTimes(1);
    // Two table landings; the sparse plan is off by default, so neither its
    // profile nor its names hop warms.
    expect(mocks.engine.warm).toHaveBeenCalledTimes(2);
    expect(mocks.sparse.warm).not.toHaveBeenCalled();
    const sparse = sparsePlan();
    await service.warm("sys-1", withHopEnabled(EMPTY_SELECTION, hopKey(sparse, sparse.hops[0]), true));
    expect(mocks.sparse.warm).toHaveBeenCalledTimes(1);
    expect(mocks.engine.warm).toHaveBeenCalledTimes(5); // + the names hop
  });

  it("runs only what the selection asks, and keys the point cache by it", async () => {
    const table = planFragment("e1");
    const { client } = fakeClient([table, sparsePlan()]);
    const service = createAttributeService({ client, datalayer: "http://dl" });
    const coords = { t: 1, y: 3, x: 5 };

    const defaults = await service.attributesAt({ systemId: "sys-1", coords });
    expect(defaults.map((result) => result.name)).toEqual(["morphology"]);
    expect(mocks.sparse.read).not.toHaveBeenCalled();

    const sparse = sparsePlan();
    const withMatrix = withHopEnabled(EMPTY_SELECTION, hopKey(sparse, sparse.hops[0]), true);
    const more = await service.attributesAt({ systemId: "sys-1", coords, selection: withMatrix });
    expect(more.map((result) => [result.name, result.kind])).toEqual([
      ["morphology", "TABLE"],
      ["expression", "SPARSE"],
      ["genes", "TABLE"],
    ]);
    expect(mocks.sparse.read).toHaveBeenCalledTimes(1);
    // Both answers are cached under their own selection.
    expect(service.peekAttributesAt({ systemId: "sys-1", coords })).toEqual(defaults);
    expect(service.peekAttributesAt({ systemId: "sys-1", coords, selection: withMatrix })).toEqual(more);

    // A projection reaches the engine.
    const narrowed = withHopColumns(EMPTY_SELECTION, hopKey(table, table.hops[0]), ["area"]);
    await service.attributesAt({ systemId: "sys-1", coords, selection: narrowed });
    const lastCall = mocks.engine.lookup.mock.calls.at(-1) as unknown[];
    expect(lastCall[4]).toEqual({ columns: ["area"] });
  });

  it("invalidate drops cached discovery so the next ask re-discovers", async () => {
    const { client, query } = fakeClient();
    const service = createAttributeService({ client, datalayer: "http://dl" });
    await service.plansFor("sys-1");
    service.invalidate("sys-1");
    await service.plansFor("sys-1");
    expect(query).toHaveBeenCalledTimes(2);
  });
});

describe("acquireAttributeService", () => {
  it("shares one service per (client, datalayer) and ref-counts disposal", async () => {
    vi.useFakeTimers();
    const { client } = fakeClient();
    const a = acquireAttributeService({ client, datalayer: "http://dl" });
    const b = acquireAttributeService({ client, datalayer: "http://dl" });
    expect(a.service).toBe(b.service);

    a.release();
    a.release(); // double-release must not steal b's ref
    vi.advanceTimersByTime(60_000);
    expect(mocks.engine.dispose).not.toHaveBeenCalled();

    b.release();
    // Re-acquire within the linger window cancels disposal.
    const c = acquireAttributeService({ client, datalayer: "http://dl" });
    vi.advanceTimersByTime(60_000);
    expect(mocks.engine.dispose).not.toHaveBeenCalled();
    expect(c.service).toBe(a.service);

    c.release();
    vi.advanceTimersByTime(60_000);
    expect(mocks.engine.dispose).toHaveBeenCalledTimes(1);

    // After disposal a new acquire builds a fresh service.
    const d = acquireAttributeService({ client, datalayer: "http://dl" });
    expect(d.service).not.toBe(a.service);
    d.release();
    vi.advanceTimersByTime(60_000);
  });

  it("keeps services separate per datalayer", () => {
    vi.useFakeTimers();
    const { client } = fakeClient();
    const a = acquireAttributeService({ client, datalayer: "http://dl-1" });
    const b = acquireAttributeService({ client, datalayer: "http://dl-2" });
    expect(a.service).not.toBe(b.service);
    a.release();
    b.release();
    vi.advanceTimersByTime(60_000);
  });
});
