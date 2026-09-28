import { describe, expect, it } from "vitest";
import { createExactValueResolver } from "./exactValueResolver";
import type { ProbeFetchKey } from "./probeTypes";

const key = (voxel: [number, number, number], sig = "sig"): ProbeFetchKey => ({
  layerId: "layer-a",
  voxelIndex: voxel,
  sliceSignature: sig,
});

/** fetch stub whose promises are resolved manually, in order of launch. */
const makeFetches = () => {
  const launched: { key: ProbeFetchKey; resolve: (v: number[] | null) => void; reject: (e: unknown) => void }[] = [];
  const fetch = (k: ProbeFetchKey) =>
    new Promise<number[] | null>((resolve, reject) => {
      launched.push({ key: k, resolve, reject });
    });
  return { launched, fetch };
};

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("createExactValueResolver", () => {
  it("fetches and delivers a fresh key", async () => {
    const { launched, fetch } = makeFetches();
    const delivered: [ProbeFetchKey, number[]][] = [];
    const resolver = createExactValueResolver({
      fetch,
      deliver: (k, v) => delivered.push([k, v]),
    });

    resolver.request(key([1, 2, 3]));
    expect(launched).toHaveLength(1);
    launched[0].resolve([7, 8]);
    await tick();
    expect(delivered).toEqual([[key([1, 2, 3]), [7, 8]]]);
  });

  it("dedupes repeated requests for the newest key", () => {
    const { launched, fetch } = makeFetches();
    const resolver = createExactValueResolver({ fetch, deliver: () => {} });
    resolver.request(key([1, 2, 3]));
    resolver.request(key([1, 2, 3]));
    resolver.request(key([1, 2, 3]));
    expect(launched).toHaveLength(1);
  });

  it("latest-wins: a storm collapses to first + newest, dropping the middle", async () => {
    const { launched, fetch } = makeFetches();
    const delivered: number[][] = [];
    const resolver = createExactValueResolver({ fetch, deliver: (_k, v) => delivered.push(v) });

    resolver.request(key([1, 0, 0]));
    resolver.request(key([2, 0, 0])); // pending, then replaced…
    resolver.request(key([3, 0, 0])); // …by this one
    expect(launched).toHaveLength(1);

    launched[0].resolve([1]);
    await tick();
    // The stale first settlement is not delivered; the newest launches next.
    expect(delivered).toEqual([]);
    expect(launched).toHaveLength(2);
    expect(launched[1].key.voxelIndex).toEqual([3, 0, 0]);

    launched[1].resolve([3]);
    await tick();
    expect(delivered).toEqual([[3]]);
  });

  it("serves a delivered key again from the LRU without refetching", async () => {
    const { launched, fetch } = makeFetches();
    const delivered: number[][] = [];
    const resolver = createExactValueResolver({ fetch, deliver: (_k, v) => delivered.push(v) });

    resolver.request(key([1, 0, 0]));
    launched[0].resolve([11]);
    await tick();

    resolver.request(key([2, 0, 0]));
    launched[1].resolve([22]);
    await tick();

    // Jitter back to the first voxel: no third fetch, immediate delivery.
    resolver.request(key([1, 0, 0]));
    expect(launched).toHaveLength(2);
    expect(delivered).toEqual([[11], [22], [11]]);
  });

  it("does not deliver null results and does not cache them", async () => {
    const { launched, fetch } = makeFetches();
    const delivered: number[][] = [];
    const resolver = createExactValueResolver({ fetch, deliver: (_k, v) => delivered.push(v) });

    resolver.request(key([1, 0, 0]));
    launched[0].resolve(null);
    await tick();
    expect(delivered).toEqual([]);
  });

  it("survives fetch rejections and continues with the pending key", async () => {
    const { launched, fetch } = makeFetches();
    const delivered: number[][] = [];
    const resolver = createExactValueResolver({ fetch, deliver: (_k, v) => delivered.push(v) });

    resolver.request(key([1, 0, 0]));
    resolver.request(key([2, 0, 0]));
    launched[0].reject(new Error("network"));
    await tick();
    expect(launched).toHaveLength(2);
    launched[1].resolve([2]);
    await tick();
    expect(delivered).toEqual([[2]]);
  });

  it("dispose drops pending work and in-flight delivery", async () => {
    const { launched, fetch } = makeFetches();
    const delivered: number[][] = [];
    const resolver = createExactValueResolver({ fetch, deliver: (_k, v) => delivered.push(v) });

    resolver.request(key([1, 0, 0]));
    resolver.request(key([2, 0, 0]));
    resolver.dispose();
    launched[0].resolve([1]);
    await tick();
    expect(delivered).toEqual([]);
    expect(launched).toHaveLength(1);
  });
});
