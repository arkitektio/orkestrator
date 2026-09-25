import { describe, expect, it, vi } from "vitest";
import type { PageTableLayout } from "../octree/pageTableLayout";
import {
  PAGE_FLAG_RESIDENT,
} from "../octree/pageTableLayout";
import type { SceneRenderer } from "../../../platform/gpu/sceneRenderer";
import {
  clearPageTable,
  createPageTableTexture,
  flushPageTable,
  setPageEntry,
} from "./pageTableTexture";

/** One level: 4×4×2 brick grid stacked at texel offset [16, 0, 0]. */
const LAYOUT: PageTableLayout = {
  size: [20, 4, 2],
  stackAxis: 0,
  levelOffset: [[16, 0, 0]],
  levelGrid: [[4, 4, 2]],
};

/** Fake renderer whose backend captures every queue.writeTexture call. */
const makeRenderer = () => {
  const writeTexture = vi.fn();
  const renderer = {
    backend: {
      isWebGPUBackend: true,
      device: { queue: { writeTexture } },
      // Pretend the GPUTexture exists so the incremental path is taken.
      get: () => ({ texture: {} }),
    },
  } as unknown as SceneRenderer;
  return { renderer, writeTexture };
};

describe("flushPageTable dirty-box uploads", () => {
  it("uploads only the bounding box of the touched entries, strided from the mirror", () => {
    const { renderer, writeTexture } = makeRenderer();
    const pageTable = createPageTableTexture(LAYOUT);

    setPageEntry(pageTable, 0, [1, 1, 0], [0, 0, 0], PAGE_FLAG_RESIDENT);
    setPageEntry(pageTable, 0, [2, 3, 1], [1, 0, 0], PAGE_FLAG_RESIDENT);

    expect(flushPageTable(renderer, pageTable)).toBe(true);
    // One write each for the page mirror and the RG8 occupancy sidecar; the
    // aggregate sidecar is LAZY and not allocated here, so no third upload.
    expect(writeTexture).toHaveBeenCalledTimes(2);

    const [destination, data, layout, extent] = writeTexture.mock.calls[0];
    // Box spans bricks [1..2, 1..3, 0..1]; texture origin adds the level offset.
    expect(destination.origin).toEqual([16 + 1, 1, 0]);
    expect(extent).toEqual([2, 3, 2]);
    // Source reads strided out of the 4×4×2 level mirror at box.min.
    expect(data).toBe(pageTable.mirrors[0]);
    expect(layout).toEqual({
      offset: ((0 * 4 + 1) * 4 + 1) * 4,
      bytesPerRow: 4 * 4,
      rowsPerImage: 4,
    });

    // The occupancy upload shares the dirty box at 2 bytes/texel.
    const [occDest, occData, occLayout, occExtent] = writeTexture.mock.calls[1];
    expect(occDest.origin).toEqual([16 + 1, 1, 0]);
    expect(occExtent).toEqual([2, 3, 2]);
    expect(occData).toBe(pageTable.occMirrors[0]);
    expect(occLayout).toEqual({
      offset: ((0 * 4 + 1) * 4 + 1) * 2,
      bytesPerRow: 4 * 2,
      rowsPerImage: 4,
    });
  });

  it("is a no-op when nothing is dirty, and re-flushes only new writes", () => {
    const { renderer, writeTexture } = makeRenderer();
    const pageTable = createPageTableTexture(LAYOUT);

    setPageEntry(pageTable, 0, [0, 0, 0], [0, 0, 0], PAGE_FLAG_RESIDENT);
    expect(flushPageTable(renderer, pageTable)).toBe(true);
    expect(flushPageTable(renderer, pageTable)).toBe(false);
    expect(writeTexture).toHaveBeenCalledTimes(2); // page + occupancy (no lazy aggregate)

    // A single new entry dirties only its own 1×1×1 box.
    setPageEntry(pageTable, 0, [3, 2, 1], [0, 1, 0], PAGE_FLAG_RESIDENT);
    expect(flushPageTable(renderer, pageTable)).toBe(true);
    const [destination, , , extent] = writeTexture.mock.calls[2];
    expect(destination.origin).toEqual([16 + 3, 2, 1]);
    expect(extent).toEqual([1, 1, 1]);
  });

  it("clearPageTable dirties the full level grid", () => {
    const { renderer, writeTexture } = makeRenderer();
    const pageTable = createPageTableTexture(LAYOUT);

    clearPageTable(pageTable);
    expect(flushPageTable(renderer, pageTable)).toBe(true);
    const [destination, , layout, extent] = writeTexture.mock.calls[0];
    expect(destination.origin).toEqual([16, 0, 0]);
    expect(extent).toEqual([4, 4, 2]);
    expect(layout.offset).toBe(0);
  });
});

describe("occupancy sidecar", () => {
  it("writes the occupancy bytes with RESIDENT entries and resets them otherwise", async () => {
    const { PAGE_FLAG_UNMAPPED } = await import("../octree/pageTableLayout");
    const pageTable = createPageTableTexture(LAYOUT);

    setPageEntry(pageTable, 0, [1, 0, 0], [0, 0, 0], PAGE_FLAG_RESIDENT, [12, 200]);
    // Entry index of brick [1,0,0] in the 4×4×2 grid is 1.
    expect(pageTable.occMirrors[0][2]).toBe(12);
    expect(pageTable.occMirrors[0][3]).toBe(200);
    // Full-texture restore mirror at level offset [16,0,0] + brick [1,0,0].
    const texel = (0 * 4 + 0) * 20 + 17;
    expect(pageTable.occBacking[texel * 2]).toBe(12);
    expect(pageTable.occBacking[texel * 2 + 1]).toBe(200);

    // Unmapping (or writing without occupancy) resets to the conservative
    // all-zero texel — "unknown, never skip".
    setPageEntry(pageTable, 0, [1, 0, 0], null, PAGE_FLAG_UNMAPPED);
    expect(pageTable.occMirrors[0][2]).toBe(0);
    expect(pageTable.occMirrors[0][3]).toBe(0);
  });

  it("clearPageTable zeroes the occupancy mirrors too", () => {
    const pageTable = createPageTableTexture(LAYOUT);
    setPageEntry(pageTable, 0, [2, 1, 1], [0, 0, 0], PAGE_FLAG_RESIDENT, [7, 9]);
    clearPageTable(pageTable);
    expect(pageTable.occMirrors[0].every((byte) => byte === 0)).toBe(true);
    expect(pageTable.occBacking.every((byte) => byte === 0)).toBe(true);
  });
});

describe("hierarchical-occupancy aggregate sidecar (lazy)", () => {
  it("is unallocated until first use, then writes/resets/clears with the shared dirty box", async () => {
    const { setAggregateEntry, ensureAggregate } = await import("./pageTableTexture");
    const pageTable = createPageTableTexture(LAYOUT);
    expect(pageTable.aggregate).toBeNull(); // lazy: flag-off pools pay nothing

    setAggregateEntry(pageTable, 0, [1, 0, 0], [42, 99]); // allocates on demand
    expect(pageTable.aggregate).not.toBeNull();
    expect(ensureAggregate(pageTable)).toBe(pageTable.aggregate); // idempotent
    expect(pageTable.aggMirrors![0][2]).toBe(42);
    expect(pageTable.aggMirrors![0][3]).toBe(99);
    const texel = (0 * 4 + 0) * 20 + 17; // level offset [16,0,0] + cell [1,0,0]
    expect(pageTable.aggBacking![texel * 2]).toBe(42);
    expect(pageTable.aggBacking![texel * 2 + 1]).toBe(99);
    // The write dirtied the level (shared box) so a flush picks it up.
    expect(pageTable.dirty[0]).not.toBeNull();

    // null = back to the all-zero "unknown, never hop" sentinel.
    setAggregateEntry(pageTable, 0, [1, 0, 0], null);
    expect(pageTable.aggMirrors![0][2]).toBe(0);
    expect(pageTable.aggMirrors![0][3]).toBe(0);

    setAggregateEntry(pageTable, 0, [2, 1, 1], [7, 9]);
    clearPageTable(pageTable);
    expect(pageTable.aggMirrors![0].every((byte) => byte === 0)).toBe(true);
    expect(pageTable.aggBacking!.every((byte) => byte === 0)).toBe(true);
  });

  it("an allocated aggregate rides the flush as a third upload", async () => {
    const { setAggregateEntry } = await import("./pageTableTexture");
    const { renderer, writeTexture } = makeRenderer();
    const pageTable = createPageTableTexture(LAYOUT);
    setAggregateEntry(pageTable, 0, [1, 0, 0], [42, 99]);
    setPageEntry(pageTable, 0, [1, 0, 0], [0, 0, 0], PAGE_FLAG_RESIDENT);
    expect(flushPageTable(renderer, pageTable)).toBe(true);
    expect(writeTexture).toHaveBeenCalledTimes(3); // page + occupancy + aggregate
  });
});

describe("per-slab occupancy planes (orkestrator.occPerSlab)", () => {
  it("stacks one RG8 plane per slab and uploads each plane with the shared dirty box", () => {
    const { renderer, writeTexture } = makeRenderer();
    const pageTable = createPageTableTexture(LAYOUT, 3);
    expect(pageTable.occSlabs).toBe(3);
    expect(pageTable.occupancy.image.depth).toBe(LAYOUT.size[2] * 3);
    expect(pageTable.occMirrors[0].byteLength).toBe(4 * 4 * 2 * 3 * 2);

    setPageEntry(pageTable, 0, [1, 0, 0], [0, 0, 0], PAGE_FLAG_RESIDENT, [1, 2], [
      [10, 20],
      [30, 40],
      [50, 60],
    ]);
    // Entry index of brick [1,0,0] is 1; plane stride is 32 entries.
    const plane = 4 * 4 * 2;
    expect([pageTable.occMirrors[0][2], pageTable.occMirrors[0][3]]).toEqual([10, 20]);
    expect([pageTable.occMirrors[0][(plane + 1) * 2], pageTable.occMirrors[0][(plane + 1) * 2 + 1]]).toEqual([
      30, 40,
    ]);
    expect([pageTable.occMirrors[0][(2 * plane + 1) * 2], pageTable.occMirrors[0][(2 * plane + 1) * 2 + 1]]).toEqual([
      50, 60,
    ]);
    // Full-texture backing: plane s lives at z + s·d.
    const texel = 17; // level offset [16,0,0] + brick [1,0,0], z 0
    const planeTexels = 20 * 4 * 2;
    expect(pageTable.occBacking[(planeTexels * 2 + texel) * 2]).toBe(50);

    expect(flushPageTable(renderer, pageTable)).toBe(true);
    // page + 3 occupancy planes (no lazy aggregate).
    expect(writeTexture).toHaveBeenCalledTimes(4);
    const [dest1, data1, layout1] = writeTexture.mock.calls[2];
    expect(dest1.origin).toEqual([17, 0, 0 + LAYOUT.size[2]]);
    expect(data1).toBe(pageTable.occMirrors[0]);
    expect(layout1.offset).toBe(plane * 2 + ((0 * 4 + 0) * 4 + 1) * 2);
  });

  it("a missing per-slab texel falls back to the union texel, and a reset zeroes every plane", async () => {
    const { PAGE_FLAG_UNMAPPED } = await import("../octree/pageTableLayout");
    const pageTable = createPageTableTexture(LAYOUT, 2);
    const plane = 4 * 4 * 2;
    setPageEntry(pageTable, 0, [1, 0, 0], [0, 0, 0], PAGE_FLAG_RESIDENT, [5, 6]);
    expect([pageTable.occMirrors[0][2], pageTable.occMirrors[0][(plane + 1) * 2]]).toEqual([5, 5]);
    setPageEntry(pageTable, 0, [1, 0, 0], null, PAGE_FLAG_UNMAPPED);
    expect([pageTable.occMirrors[0][2], pageTable.occMirrors[0][(plane + 1) * 2]]).toEqual([0, 0]);
  });

  it("the aggregate sidecar carries the same planes", async () => {
    const { setAggregateEntry } = await import("./pageTableTexture");
    const pageTable = createPageTableTexture(LAYOUT, 2);
    setAggregateEntry(pageTable, 0, [1, 0, 0], [1, 1], [
      [2, 3],
      [4, 5],
    ]);
    expect(pageTable.aggregate!.image.depth).toBe(LAYOUT.size[2] * 2);
    const plane = 4 * 4 * 2;
    expect([pageTable.aggMirrors![0][2], pageTable.aggMirrors![0][3]]).toEqual([2, 3]);
    expect([pageTable.aggMirrors![0][(plane + 1) * 2], pageTable.aggMirrors![0][(plane + 1) * 2 + 1]]).toEqual([
      4, 5,
    ]);
  });

  it("a single-plane page table is byte-identical to the pre-flag layout", () => {
    const { renderer, writeTexture } = makeRenderer();
    const pageTable = createPageTableTexture(LAYOUT);
    expect(pageTable.occSlabs).toBe(1);
    setPageEntry(pageTable, 0, [1, 0, 0], [0, 0, 0], PAGE_FLAG_RESIDENT, [12, 200], [[1, 2]]);
    expect([pageTable.occMirrors[0][2], pageTable.occMirrors[0][3]]).toEqual([1, 2]);
    flushPageTable(renderer, pageTable);
    expect(writeTexture).toHaveBeenCalledTimes(2);
  });
});
