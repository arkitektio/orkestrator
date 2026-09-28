import { describe, expect, it, vi } from "vitest";

import {
  POINT_MAX_COUNT,
  flatValues,
  loadPointGeometry,
  scatterPointValues,
  type PointGeometry,
} from "./pointsSource";

const store = { id: "parquet-a", bucket: "b", key: "k" } as never;
const columns = { key: "id", x: "x", y: "y" };

const engineWith = (read: Record<string, ArrayLike<number>> | null) =>
  ({ readColumnsTyped: () => Promise.resolve(read) }) as never;

describe("loadPointGeometry", () => {
  it("interleaves positions and indexes ids to instances", async () => {
    const got = (await loadPointGeometry(
      engineWith({
        object_id: new Float64Array([7, 9]),
        px: new Float64Array([1, 3]),
        py: new Float64Array([2, 4]),
      }),
      store,
      columns,
    )) as PointGeometry;

    expect(got.stride).toBe(2);
    expect([...got.positions]).toEqual([1, 2, 3, 4]);
    // The mapping a colouring scatters through — built once, because positions are.
    expect(got.slotOf(7)).toBe(0);
    expect(got.slotOf(9)).toBe(1);
    expect(got.slotOf(1234)).toBe(-1);
  });

  it("carries z only when the table declares one", async () => {
    const got = (await loadPointGeometry(
      engineWith({
        object_id: new Float64Array([1]),
        px: new Float64Array([1]),
        py: new Float64Array([2]),
        pz: new Float64Array([3]),
      }),
      store,
      { ...columns, z: "z" },
    )) as PointGeometry;
    expect(got.stride).toBe(3);
    expect([...got.positions]).toEqual([1, 2, 3]);
  });

  /**
   * Time is read in the SAME scan as the coordinates, and resolved to timeline
   * INDICES on the way out — so this layer's `t` scrubber is the scrubber an
   * image's t axis drives, whatever units the table used.
   */
  it("resolves a time column to per-point timeline indices", async () => {
    const got = (await loadPointGeometry(
      engineWith({
        object_id: new Float64Array([1, 2, 3]),
        px: new Float64Array([1, 1, 1]),
        py: new Float64Array([2, 2, 2]),
        // Unevenly sampled on purpose: indices count OBSERVATIONS, not seconds.
        pt: new Float64Array([100, 0, 100]),
      }),
      store,
      { ...columns, t: "t" },
    )) as PointGeometry;

    expect([...got.timeline!]).toEqual([0, 100]);
    expect([...got.times!]).toEqual([1, 0, 1]);
  });

  it("leaves an untimed table exactly as it was: no timeline, no per-point times", async () => {
    const got = (await loadPointGeometry(
      engineWith({
        object_id: new Float64Array([1]),
        px: new Float64Array([1]),
        py: new Float64Array([2]),
      }),
      store,
      columns,
    )) as PointGeometry;
    expect(got.timeline).toBeNull();
    expect(got.times).toBeNull();
  });

  it("refuses past the budget rather than drawing a subset", async () => {
    // Subsampling would misrepresent density, which is usually the thing being looked at, so
    // the cap is loud like the label LUT's rather than silent like the mesh one's was.
    const over = POINT_MAX_COUNT + 1;
    const got = await loadPointGeometry(
      engineWith({
        object_id: new Float64Array(over),
        px: new Float64Array(over),
        py: new Float64Array(over),
      }),
      store,
      columns,
    );
    expect(got).toHaveProperty("error");
    expect((got as { error: string }).error).toContain("no points are drawn");
  });

  it("returns null rather than falling back to the row path", async () => {
    expect(await loadPointGeometry(engineWith(null), store, columns)).toBeNull();
  });
});

describe("scatterPointValues", () => {
  const geometry: PointGeometry = {
    positions: new Float32Array([0, 0, 1, 1, 2, 2]),
    stride: 2,
    count: 3,
    slotOf: (objectId: number) => ({ 10: 0, 20: 1, 30: 2 })[objectId] ?? -1,
  };

  it("scatters by object id, whatever the colouring read from", () => {
    // A column and a sparse slice both arrive as `objectId -> value`, which is why the sparse
    // work needed no second painter.
    const got = scatterPointValues(
      geometry,
      new Map<number, unknown>([
        [10, 5],
        [30, 15],
      ]),
      { table: "t", column: "area" },
    );
    expect(got.valueMin).toBe(5);
    expect(got.valueMax).toBe(15);
    expect([...got.values]).toEqual([5, 5, 15]); // 20 was unmentioned -> the floor
  });

  it("includes zero in a sparse range, because an absent point IS zero", () => {
    // A slice is the complete truth for its feature. Without this an all-positive gene would
    // start its ramp at its own minimum and every silent point would read as expressed.
    const got = scatterPointValues(
      geometry,
      new Map<number, unknown>([[20, 8]]),
      { dataset: "d1", at: [{ axis: "gene", value: 3 }] },
    );
    expect(got.valueMin).toBe(0);
    expect(got.valueMax).toBe(8);
    expect([...got.values]).toEqual([0, 8, 0]);
  });

  it("puts a constant colouring mid-range instead of dividing by zero", () => {
    const got = scatterPointValues(geometry, new Map<number, unknown>([[10, 7]]), {
      table: "t",
      column: "area",
    });
    expect(got.valueMax).toBeGreaterThan(got.valueMin);
  });

  it("draws flat when nothing is picked", () => {
    expect(scatterPointValues(geometry, new Map(), null)).toEqual(flatValues(3));
  });
});
