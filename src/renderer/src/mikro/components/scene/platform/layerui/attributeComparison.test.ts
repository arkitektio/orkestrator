import { describe, expect, it } from "vitest";
import type { HopMeta, PlanRowsState } from "@/mikro/lib/attributes/attributeTypes";
import {
  compareHopBlocks,
  profileComparison,
  tableComparison,
  type ComparedPoint,
} from "./attributeComparison";

const meta = (overrides: Partial<HopMeta> = {}): HopMeta => ({
  hopKey: "plan:0",
  planKey: "plan",
  index: 0,
  parentKey: null,
  kind: "TABLE",
  name: "cells",
  sourceId: "table-1",
  attributes: [],
  via: null,
  cardinality: "ONE",
  valueAxes: [],
  ...overrides,
});

const rows = (...values: Record<string, unknown>[]): PlanRowsState => ({
  status: "rows",
  rows: values,
});

const point = (index: number): ComparedPoint => ({ id: `p${index}`, index, color: "#fff" });

describe("compareHopBlocks", () => {
  it("merges points that read the same source, whichever plan led there", () => {
    const merged = compareHopBlocks([
      { point: point(1), blocks: [{ meta: meta(), state: rows({ area: 1 }) }] },
      {
        point: point(2),
        blocks: [{ meta: meta({ hopKey: "other:0", planKey: "other" }), state: rows({ area: 2 }) }],
      },
      {
        point: point(3),
        blocks: [{ meta: meta({ sourceId: "table-2", name: "nuclei" }), state: rows({ area: 3 }) }],
      },
    ]);
    expect(merged.map((hop) => [hop.meta.name, hop.entries.map((entry) => entry.point.index)])).toEqual([
      ["cells", [1, 2]],
      ["nuclei", [3]],
    ]);
  });

  it("drops unreachable hops and keeps a point's second reading of a source apart", () => {
    const merged = compareHopBlocks([
      {
        point: point(1),
        blocks: [
          { meta: meta(), state: rows({ area: 1 }) },
          { meta: meta({ hopKey: "other:0" }), state: rows({ area: 9 }) },
          { meta: meta({ sourceId: "gone" }), state: { status: "unreachable", rows: [] } },
        ],
      },
    ]);
    expect(merged.map((hop) => hop.entries.length)).toEqual([1, 1]);
  });
});

describe("a matrix and its names hop", () => {
  it("labels the matrix rows and is not a block of its own", () => {
    const sparse = meta({ kind: "SPARSE", sourceId: "matrix", valueAxes: ["gene"] });
    const names = meta({
      hopKey: "plan:1",
      parentKey: "plan:0",
      sourceId: "genes",
      cardinality: "MANY",
      attributes: [{ name: "symbol", role: "LABEL", dtype: "VARCHAR" }] as unknown as HopMeta["attributes"],
    });
    const merged = compareHopBlocks([
      {
        point: point(1),
        blocks: [
          { meta: sparse, state: rows({ position: 4, value: 2 }) },
          { meta: names, state: rows({ gene: 4, symbol: "ACTB" }) },
        ],
      },
    ]);
    expect(merged.map((hop) => hop.meta.sourceId)).toEqual(["matrix"]);
    expect(profileComparison(merged[0]).map((row) => row.label)).toEqual(["ACTB"]);
  });
});

describe("tableComparison", () => {
  it("lays columns out as rows, one cell per point", () => {
    const [hop] = compareHopBlocks([
      {
        point: point(1),
        blocks: [
          {
            meta: meta({
              attributes: [{ name: "area", longName: "Area" }] as unknown as HopMeta["attributes"],
            }),
            state: rows({ area: 1, label: "a" }),
          },
        ],
      },
      { point: point(2), blocks: [{ meta: meta(), state: rows({ area: 2, mean: 5 }, { area: 3 }) }] },
      { point: point(3), blocks: [{ meta: meta(), state: rows() }] },
    ]);
    const table = tableComparison(hop);
    expect(table.rows.map((row) => [row.label, row.cells])).toEqual([
      ["Area", [1, 2, undefined]],
      ["label", ["a", undefined, undefined]],
      ["mean", [undefined, 5, undefined]],
    ]);
    expect(table.extraRows).toEqual([0, 1, 0]);
  });
});

describe("profileComparison", () => {
  it("unions positions, strongest first", () => {
    const sparse = meta({ kind: "SPARSE", sourceId: "matrix", valueAxes: ["gene"] });
    const [hop] = compareHopBlocks([
      {
        point: point(1),
        blocks: [{ meta: sparse, state: rows({ position: 4, value: 2 }, { position: 7, value: 1 }) }],
      },
      {
        point: point(2),
        blocks: [{ meta: sparse, state: rows({ position: 7, value: 9 }) }],
      },
    ]);
    expect(profileComparison(hop).map((row) => [row.label, row.cells])).toEqual([
      ["#7", [1, 9]],
      ["#4", [2, undefined]],
    ]);
  });
});
