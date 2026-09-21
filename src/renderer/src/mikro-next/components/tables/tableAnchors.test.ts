import { describe, expect, it } from "vitest";

import {
  anchorCaption,
  describeTablePins,
  partitionTableAnchors,
  readTablePins,
  sameValue,
} from "./tableAnchors";

const keyOf = (row: Record<string, unknown>) => String(row.id);

const ROWS = [
  { id: "r1", t: 5, c: 0, label: "a" },
  { id: "r2", t: 5, c: 1, label: "b" },
  { id: "r3", t: 6, c: 0, label: "c" },
];

describe("readTablePins", () => {
  it("reads one pin per named column, skipping null values", () => {
    expect(readTablePins({ t: 5, c: null })).toEqual([{ column: "t", value: 5 }]);
  });

  it("pins nothing for anything that is not a plain object", () => {
    expect(readTablePins(null)).toEqual([]);
    expect(readTablePins("t=5")).toEqual([]);
    expect(readTablePins([5])).toEqual([]);
  });
});

describe("sameValue", () => {
  it("compares numbers across the ways they arrive", () => {
    expect(sameValue(1, "1.0")).toBe(true);
    expect(sameValue(1n, 1)).toBe(true);
    expect(sameValue("5", 5)).toBe(true);
    expect(sameValue(1, 1.0000001)).toBe(false);
  });

  it("never reads the empty string or null as zero", () => {
    expect(sameValue("", 0)).toBe(false);
    expect(sameValue(null, 0)).toBe(false);
    expect(sameValue(undefined, undefined)).toBe(true);
  });

  it("compares booleans and dates as text", () => {
    expect(sameValue(true, "true")).toBe(true);
    expect(sameValue(true, 1)).toBe(false);
    expect(sameValue("2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z")).toBe(true);
  });

  it("compares objects structurally", () => {
    expect(sameValue({ a: 1 }, { a: 1 })).toBe(true);
    expect(sameValue({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe("partitionTableAnchors", () => {
  it("puts an anchor in view with the rows that carry every value it pins", () => {
    const { inView, outOfView } = partitionTableAnchors(
      [{ id: "a", coordinates: { t: 5 } }, { id: "b", coordinates: { t: "5", c: 0 } }],
      ROWS,
      keyOf,
    );
    expect(outOfView).toEqual([]);
    expect(inView.map((entry) => [entry.anchor.id, entry.rowKeys])).toEqual([
      ["a", ["r1", "r2"]],
      ["b", ["r1"]],
    ]);
  });

  it("puts an anchor out of view when no row on the page carries its pins", () => {
    const { inView, outOfView } = partitionTableAnchors(
      [{ id: "a", coordinates: { t: 7 } }],
      ROWS,
      keyOf,
    );
    expect(inView).toEqual([]);
    expect(outOfView.map((entry) => entry.anchor.id)).toEqual(["a"]);
  });

  it("treats a column no row has as unmet", () => {
    const { outOfView } = partitionTableAnchors(
      [{ id: "a", coordinates: { z: 0 } }],
      ROWS,
      keyOf,
    );
    expect(outOfView).toHaveLength(1);
  });

  it("keeps a whole-table anchor in view without marking any row", () => {
    const { inView } = partitionTableAnchors(
      [{ id: "a", coordinates: {} }, { id: "b", coordinates: null }],
      [],
      keyOf,
    );
    expect(inView.map((entry) => entry.rowKeys)).toEqual([[], []]);
  });
});

describe("captions", () => {
  it("describes pins in declaration order, or the whole table", () => {
    expect(describeTablePins([{ column: "t", value: 5 }, { column: "c", value: "0" }])).toBe(
      "t=5, c=0",
    );
    expect(describeTablePins([])).toBe("whole table");
  });

  it("prefers the channel label for a marker", () => {
    const pins = [{ column: "c", value: 0 }];
    expect(anchorCaption({ id: "a", coordinates: {}, channelLabel: { label: "DAPI" } }, pins)).toBe(
      "DAPI",
    );
    expect(anchorCaption({ id: "a", coordinates: {} }, pins)).toBe("c=0");
  });
});
