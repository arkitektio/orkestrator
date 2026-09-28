import { describe, expect, it, vi } from "vitest";

import {
  columnValueAt,
  readColumnValues,
  readPointPositions,
  readTrackPositions,
} from "./columnarReads";
import type { AttributeLookupEngine } from "./lookupEngine";

const store = { id: "parquet-a", bucket: "b", key: "k" } as never;

/** An engine whose columnar read answers from typed arrays, as Arrow does. */
const engineWith = (
  columns: Record<string, ArrayLike<number> | ArrayLike<string>> | null,
  spy = vi.fn(),
): AttributeLookupEngine =>
  ({
    readColumnsTyped: (
      stores: unknown,
      buildSql: (urlOf: (id: string) => string) => string,
      wanted: readonly string[],
    ) => {
      spy(buildSql(() => "s3://bucket/key"), wanted);
      return Promise.resolve(columns);
    },
  }) as never;

describe("readPointPositions", () => {
  it("reads id and coordinates in ONE scan, as typed arrays", () => {
    // The property this exists for. The row path is single-column by signature,
    // so x and y through it are two full passes over the parquet AND ~7 JS
    // allocations per row per column. Here it is one projection and one typed
    // array per column — a view over Arrow's own buffer.
    const spy = vi.fn();
    const engine = engineWith(
      {
        object_id: new Float64Array([1, 2, 3]),
        px: new Float64Array([10, 20, 30]),
        py: new Float64Array([40, 50, 60]),
      },
      spy,
    );

    return readPointPositions(engine, store, { key: "bin_id", x: "x", y: "y" }).then((got) => {
      expect(got).not.toBeNull();
      expect(got!.count).toBe(3);
      expect(ArrayBuffer.isView(got!.x)).toBe(true);
      expect([...got!.x]).toEqual([10, 20, 30]);
      expect([...got!.y]).toEqual([40, 50, 60]);
      expect(got!.z).toBeNull();

      const [sql, wanted] = spy.mock.calls[0];
      expect(sql).toMatch(/SELECT .*AS object_id.*AS px.*AS py.*FROM read_parquet/s);
      // One statement, not one per column.
      expect(sql.match(/read_parquet/g)).toHaveLength(1);
      expect(wanted).toEqual(["object_id", "px", "py"]);
    });
  });

  it("carries a third dimension only when the table declares one", async () => {
    const spy = vi.fn();
    const engine = engineWith(
      {
        object_id: new Float64Array([1]),
        px: new Float64Array([1]),
        py: new Float64Array([2]),
        pz: new Float64Array([3]),
      },
      spy,
    );
    const got = await readPointPositions(engine, store, { key: "id", x: "x", y: "y", z: "z" });
    expect([...got!.z!]).toEqual([3]);
    expect(spy.mock.calls[0][1]).toEqual(["object_id", "px", "py", "pz"]);
  });

  it("returns null rather than falling back to the row path", async () => {
    // A result that cannot answer columnwise. Falling back would reintroduce
    // exactly the per-row cost this avoids, so the caller refuses instead.
    const got = await readPointPositions(engineWith(null), store, { key: "id", x: "x", y: "y" });
    expect(got).toBeNull();
  });

  it("quotes identifiers, so a column named like SQL cannot escape", async () => {
    const spy = vi.fn();
    const engine = engineWith(
      { object_id: new Float64Array(0), px: new Float64Array(0), py: new Float64Array(0) },
      spy,
    );
    await readPointPositions(engine, store, { key: 'id" FROM x --', x: "x", y: "y" });
    expect(spy.mock.calls[0][0]).toContain('"id"" FROM x --"');
  });
});

describe("readColumnValues", () => {
  const access = { store, keyColumn: "bin_id" };

  it("reads a measure column as ids and values side by side", () => {
    const spy = vi.fn();
    const engine = engineWith(
      { object_id: new Float64Array([1, 2, 3]), value: new Float64Array([10, 20, 30]) },
      spy,
    );

    return readColumnValues(engine, access, "area").then((got) => {
      expect(got).not.toBeNull();
      expect(Array.from(got!.ids)).toEqual([1, 2, 3]);
      expect(Array.from(got!.numeric!)).toEqual([10, 20, 30]);
      expect(got!.text).toBeNull();
      expect(got!.count).toBe(3);
      expect(columnValueAt(got!, 1)).toBe(20);
    });
  });

  it("ORDERS BY the id, so two columns of one table line up by row", () => {
    // Without it the row order is DuckDB's business, and a colouring and a rule
    // over the same table could not be compared by index.
    const spy = vi.fn();
    const engine = engineWith(
      { object_id: new Float64Array([1]), value: new Float64Array([1]) },
      spy,
    );

    return readColumnValues(engine, access, "area").then(() => {
      const [sql] = spy.mock.calls[0];
      expect(sql).toContain('"bin_id" AS object_id');
      expect(sql).toContain('"area" AS value');
      expect(sql).toContain("ORDER BY object_id");
    });
  });

  it("keeps a categorical column as text rather than coercing it to NaN", () => {
    const engine = engineWith({
      object_id: new Float64Array([1, 2]),
      value: ["good", "bad"],
    });

    return readColumnValues(engine, access, "kind").then((got) => {
      expect(got!.numeric).toBeNull();
      expect(Array.from(got!.text!)).toEqual(["good", "bad"]);
      expect(columnValueAt(got!, 0)).toBe("good");
    });
  });

  it("refuses a result that cannot answer columnwise", () =>
    readColumnValues(engineWith(null), access, "area").then((got) => {
      expect(got).toBeNull();
    }));

  it("refuses a key column that did not come back as numbers", () =>
    // A string key is not an object id, and painting it would index slot NaN.
    readColumnValues(
      engineWith({ object_id: ["a", "b"], value: new Float64Array([1, 2]) }),
      access,
      "area",
    ).then((got) => {
      expect(got).toBeNull();
    }));
});

describe("readTrackPositions", () => {
  const trackColumns = { trackId: "track", x: "x", y: "y", t: "frame" };

  it("orders by (track, t) — the difference between a path and a scribble", () => {
    // readPointPositions deliberately has no ORDER BY: a point cloud does not
    // care. A polyline is nothing BUT the order, and an unsorted scan draws a
    // scribble through the very same points with nothing downstream able to
    // tell. This assertion is the guard on that.
    const spy = vi.fn();
    const engine = engineWith(
      {
        track_id: new Float64Array([1, 1]),
        px: new Float64Array([0, 1]),
        py: new Float64Array([0, 1]),
        pt: new Float64Array([0, 1]),
      },
      spy,
    );

    return readTrackPositions(engine, store, trackColumns).then(() => {
      const [sql, wanted] = spy.mock.calls[0];
      expect(sql).toMatch(/ORDER BY track_id, pt\s*$/);
      expect(sql.match(/read_parquet/g)).toHaveLength(1);
      expect(wanted).toEqual(["track_id", "px", "py", "pt"]);
    });
  });

  it("groups consecutive rows into runs, not a last-row-wins map", () => {
    // The trap `readPointPositions` sets: `slots.set(id, index)` keeps the LAST
    // row per id, which is right when one row is one object and collapses every
    // trajectory to a single point here.
    const engine = engineWith({
      track_id: new Float64Array([7, 7, 7, 9, 9]),
      px: new Float64Array([0, 1, 2, 10, 11]),
      py: new Float64Array([0, 0, 0, 5, 5]),
      pt: new Float64Array([0, 1, 2, 0, 1]),
    });

    return readTrackPositions(engine, store, trackColumns).then((got) => {
      expect(got).not.toBeNull();
      expect(got!.count).toBe(5);
      expect(got!.runs).toEqual([
        { id: 7, start: 0, length: 3 },
        { id: 9, start: 3, length: 2 },
      ]);
      // Three points plus two points is two segments plus one: never four.
      expect(got!.segmentCount).toBe(3);
    });
  });

  it("groups a STRING track id the same way", () => {
    // A track name is a perfectly good identity, and only adjacent equality is
    // ever asked of it.
    const engine = engineWith({
      track_id: ["cell-a", "cell-a", "cell-b"],
      px: new Float64Array([0, 1, 2]),
      py: new Float64Array([0, 1, 2]),
      pt: new Float64Array([0, 1, 0]),
    });

    return readTrackPositions(engine, store, trackColumns).then((got) => {
      expect(got!.runs.map((run) => run.id)).toEqual(["cell-a", "cell-b"]);
      expect(got!.segmentCount).toBe(1);
    });
  });

  it("re-opens a run when an id recurs after another — adjacency, not identity", () => {
    // If the scan ever hands back interleaved ids, two runs is the honest
    // answer: joining them would draw a segment across the gap.
    const engine = engineWith({
      track_id: new Float64Array([1, 2, 1]),
      px: new Float64Array([0, 5, 10]),
      py: new Float64Array([0, 5, 10]),
      pt: new Float64Array([0, 0, 1]),
    });

    return readTrackPositions(engine, store, trackColumns).then((got) => {
      expect(got!.runs).toHaveLength(3);
      expect(got!.segmentCount).toBe(0);
    });
  });

  it("drops t from the projection and the ordering when there is no t column", () => {
    const spy = vi.fn();
    const engine = engineWith(
      {
        track_id: new Float64Array([1, 1]),
        px: new Float64Array([0, 1]),
        py: new Float64Array([0, 1]),
      },
      spy,
    );

    return readTrackPositions(engine, store, { trackId: "track", x: "x", y: "y" }).then((got) => {
      expect(got!.t).toBeNull();
      const [sql, wanted] = spy.mock.calls[0];
      expect(sql).toMatch(/ORDER BY track_id\s*$/);
      expect(sql).not.toContain("pt");
      expect(wanted).toEqual(["track_id", "px", "py"]);
    });
  });

  it("refuses a non-numeric coordinate rather than yielding NaNs", () => {
    const engine = engineWith({
      track_id: new Float64Array([1, 1]),
      px: ["left", "right"],
      py: new Float64Array([0, 1]),
      pt: new Float64Array([0, 1]),
    });
    return readTrackPositions(engine, store, trackColumns).then((got) => {
      expect(got).toBeNull();
    });
  });

  it("refuses when the result cannot answer columnwise", () => {
    return readTrackPositions(engineWith(null), store, trackColumns).then((got) => {
      expect(got).toBeNull();
    });
  });
});
