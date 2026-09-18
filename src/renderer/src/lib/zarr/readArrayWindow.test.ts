import { describe, expect, it, vi } from "vitest";

const getChunkGroupWorker = vi.hoisted(() => vi.fn());
vi.mock("./runner", () => ({
  getChunkGroupWorker,
  effectiveChunkShapeOf: () => [4],
  getStoreId: () => "store_1",
}));

const { readArrayWindow, inFlightChunkReads } = await import("./readArrayWindow");

/** A 1-D array of 8 in two chunks of 4, whose chunk c holds c*10 + i. */
const array = { shape: [8], path: "/a", store: {} } as never;
const chunk = (c: number) => ({ data: Float32Array.from([0, 1, 2, 3], (i) => c * 10 + i), shape: [4], stride: [1] });

const deferredGroupRead = () => {
  const resolvers: (() => void)[] = [];
  getChunkGroupWorker.mockImplementation((_arr: unknown, coords: number[][]) =>
    coords.map(
      ([c]) =>
        new Promise((resolve) => {
          resolvers.push(() => resolve(chunk(c)));
        }),
    ),
  );
  return () => resolvers.forEach((r) => r());
};

describe("readArrayWindow single flight", () => {
  it("reads a chunk once for concurrent callers", async () => {
    getChunkGroupWorker.mockReset();
    const cache = new Map();
    const land = deferredGroupRead();
    const a = readArrayWindow(array, [{ start: 0, stop: 2 }], { pool: {} as never, cache });
    const b = readArrayWindow(array, [{ start: 1, stop: 3 }], { pool: {} as never, cache });
    await Promise.resolve();
    await Promise.resolve();
    expect(getChunkGroupWorker).toHaveBeenCalledTimes(1);
    land();
    expect(Array.from((await a).data)).toEqual([0, 1]);
    expect(Array.from((await b).data)).toEqual([1, 2]);
    expect(inFlightChunkReads(cache)).toBe(0);
  });

  it("rejects an aborted caller without failing the others", async () => {
    getChunkGroupWorker.mockReset();
    const cache = new Map();
    const land = deferredGroupRead();
    const controller = new AbortController();
    const aborted = readArrayWindow(array, [{ start: 4, stop: 6 }], { pool: {} as never, cache, signal: controller.signal });
    const kept = readArrayWindow(array, [{ start: 4, stop: 8 }], { pool: {} as never, cache });
    await Promise.resolve();
    await Promise.resolve();
    controller.abort();
    await expect(aborted).rejects.toBeDefined();
    land();
    expect(Array.from((await kept).data)).toEqual([10, 11, 12, 13]);
    expect(getChunkGroupWorker).toHaveBeenCalledTimes(1);
  });
});

describe("readArrayWindow zero copy", () => {
  it("returns the chunk's own data when one chunk is exactly the window", async () => {
    getChunkGroupWorker.mockReset();
    const land = deferredGroupRead();
    const pending = readArrayWindow(array, [{ start: 4, stop: 8 }], { pool: {} as never, cache: new Map() });
    await Promise.resolve();
    await Promise.resolve();
    land();
    const window = await pending;
    expect(Array.from(window.data)).toEqual([10, 11, 12, 13]);
    // Not a copy: the decoded chunk itself.
    const chunkData = (await getChunkGroupWorker.mock.results[0].value[0]).data;
    expect(window.data).toBe(chunkData);
  });
});
