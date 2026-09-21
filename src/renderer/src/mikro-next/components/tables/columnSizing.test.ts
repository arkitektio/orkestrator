import { describe, expect, it } from "vitest";

import {
  MIN_COLUMN_WIDTH,
  mergeMeasuredWidths,
  unsizedColumns,
} from "./columnSizing";

describe("mergeMeasuredWidths", () => {
  it("records a width only for columns that had none", () => {
    const next = mergeMeasuredWidths(
      { a: 120 },
      [
        { id: "a", width: 300 },
        { id: "b", width: 80.2 },
      ],
    );
    expect(next).toEqual({ a: 120, b: 81 });
  });

  it("returns null when nothing was learned, so the state stays put", () => {
    expect(mergeMeasuredWidths({ a: 120 }, [{ id: "a", width: 300 }])).toBeNull();
    expect(mergeMeasuredWidths({}, [])).toBeNull();
    expect(mergeMeasuredWidths({}, [{ id: "a", width: 0 }])).toBeNull();
  });

  it("never fits a column narrower than the minimum", () => {
    expect(mergeMeasuredWidths({}, [{ id: "a", width: 3 }])).toEqual({
      a: MIN_COLUMN_WIDTH,
    });
  });
});

describe("unsizedColumns", () => {
  it("lists the visible columns without a width, in order", () => {
    expect(unsizedColumns(["select", "a", "b"], { a: 100 })).toEqual([
      "select",
      "b",
    ]);
  });
});
