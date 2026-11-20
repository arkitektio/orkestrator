import { describe, expect, it } from "vitest";
import {
  NULL_VALUE,
  cellFilterActions,
  clearFilter,
  describeFilter,
  filterPredicate,
  filterPredicates,
  hasActiveFilters,
  setFilter,
} from "./tableFilters";

describe("filterPredicate", () => {
  it("compiles a range to inclusive numeric bounds, either end open", () => {
    expect(filterPredicate({ kind: "range", column: "area", min: 10, max: 200 })).toBe(
      '(TRY_CAST("area" AS DOUBLE) >= 10 AND TRY_CAST("area" AS DOUBLE) <= 200)',
    );
    expect(filterPredicate({ kind: "range", column: "area", min: 10 })).toBe('(TRY_CAST("area" AS DOUBLE) >= 10)');
    expect(filterPredicate({ kind: "range", column: "area" })).toBeNull();
  });

  it("never writes a non-finite number", () => {
    expect(filterPredicate({ kind: "range", column: "a", min: Number.NaN, max: Infinity })).toBeNull();
  });

  it("compiles values to an escaped text set, empty cells named", () => {
    expect(filterPredicate({ kind: "values", column: 'we"ird', values: ["it's", NULL_VALUE] })).toBe(
      `COALESCE(TRY_CAST("we""ird" AS VARCHAR), '(null)') IN ('it''s', '(null)')`,
    );
    expect(filterPredicate({ kind: "values", column: "label", values: ["a"], exclude: true })).toContain("NOT IN ('a')");
    expect(filterPredicate({ kind: "values", column: "label", values: [] })).toBeNull();
  });

  it("compares numeric values as numbers, keeping empty cells when excluding", () => {
    expect(filterPredicate({ kind: "values", column: "n", values: ["2"], numeric: true, exclude: true })).toBe(
      'COALESCE(TRY_CAST("n" AS DOUBLE) NOT IN (2), TRUE)',
    );
    expect(filterPredicate({ kind: "values", column: "n", values: ["x"], numeric: true })).toBeNull();
  });
});

describe("the filter set", () => {
  it("keeps one filter per column and drops one that narrows nothing", () => {
    let filters = setFilter({}, { kind: "range", column: "area", min: 1 });
    filters = setFilter(filters, { kind: "range", column: "area", max: 5 });
    expect(filters).toEqual({ area: { kind: "range", column: "area", max: 5 } });
    expect(setFilter(filters, { kind: "range", column: "area" })).toEqual({});
    expect(clearFilter(filters, "area")).toEqual({});
    expect(hasActiveFilters(filters)).toBe(true);
    expect(filterPredicates({})).toEqual([]);
  });
});

describe("describeFilter", () => {
  it("reads like the chip", () => {
    expect(describeFilter({ kind: "range", column: "area", min: 10, max: 200 })).toBe("area 10 – 200");
    expect(describeFilter({ kind: "range", column: "area", min: 3, max: 3 })).toBe("area = 3");
    expect(describeFilter({ kind: "range", column: "area", max: 5 })).toBe("area ≤ 5");
    expect(describeFilter({ kind: "values", column: "label", values: ["a", "b", "c"] })).toBe("label = a, b +1");
    expect(describeFilter({ kind: "values", column: "label", values: [NULL_VALUE], exclude: true })).toBe("label ≠ empty");
  });
});

describe("cellFilterActions", () => {
  it("offers the range family for a number, keeping the other bound", () => {
    const actions = cellFilterActions("area", 50, { kind: "range", column: "area", min: 10, max: 200 });
    expect(actions.map((action) => action.key)).toEqual(["same", "similar", "atLeast", "atMost", "exclude"]);
    expect(actions.find((a) => a.key === "similar")!.filter).toEqual({ kind: "range", column: "area", min: 45, max: 55 });
    expect(actions.find((a) => a.key === "atLeast")!.filter).toEqual({ kind: "range", column: "area", min: 50, max: 200 });
    expect(actions.find((a) => a.key === "atMost")!.filter).toEqual({ kind: "range", column: "area", min: 10, max: 50 });
    expect(actions.find((a) => a.key === "exclude")!.filter).toMatchObject({ numeric: true, exclude: true, values: ["50"] });
  });

  it("offers same and exclude for text and empty cells", () => {
    expect(cellFilterActions("label", "a", undefined).map((action) => action.filter)).toEqual([
      { kind: "values", column: "label", values: ["a"] },
      { kind: "values", column: "label", values: ["a"], exclude: true },
    ]);
    expect(cellFilterActions("label", null, undefined)[0].label).toBe("Only label = empty");
  });
});
