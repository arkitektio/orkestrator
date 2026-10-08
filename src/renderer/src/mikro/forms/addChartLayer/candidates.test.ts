import { describe, expect, it } from "vitest";
import { chartCandidates, traceShapeReason, type ResidentLike } from "./candidates";

const axes = [
  { name: "t", type: "TIME" },
  { name: "c", type: "CHANNEL" },
  { name: "y", type: "SPACE" },
  { name: "x", type: "SPACE" },
];

const lens = (id: string, shape: number[]): ResidentLike => ({
  __typename: "Lens",
  id,
  shape,
  axisNames: ["t", "c", "y", "x"],
  coordinateSystem: { axes },
  dataset: { id: "d1", name: "Movie" },
});

describe("traceShapeReason", () => {
  it("accepts one free metric axis, with or without a line axis beside it", () => {
    expect(traceShapeReason(lens("a", [100, 1, 1, 1]) as never)).toBeNull();
    expect(traceShapeReason(lens("a", [100, 3, 1, 1]) as never)).toBeNull();
  });

  it("refuses a lens that leaves a plane free", () => {
    expect(traceShapeReason(lens("a", [100, 1, 512, 512]) as never)).toMatch(/slice it to one/);
  });

  it("refuses a lens with nothing metric left to lay along the chart", () => {
    expect(traceShapeReason(lens("a", [1, 3, 1, 1]) as never)).toMatch(/no metric axis/);
  });

  it("does not guess when the lens declares no axis types", () => {
    const untyped = { shape: [100, 3], axisNames: ["t", "c"], coordinateSystem: null };
    expect(traceShapeReason(untyped)).toBeNull();
  });
});

describe("chartCandidates", () => {
  const table: ResidentLike = {
    __typename: "TableDataset",
    id: "t1",
    name: "Measurements",
    columns: [
      { name: "time", role: "COORDINATE", dtype: "float64" },
      { name: "area", role: "ATTRIBUTE", dtype: "float64", unit: "µm²" },
      { name: "label", role: "ATTRIBUTE", dtype: "string" },
    ],
  };

  it("sorts residents by what a chart layer reads, across the world and what is placed in it", () => {
    const out = chartCandidates({
      worldCoordinateSystem: {
        residents: [lens("l1", [100, 1, 1, 1])],
        placedSystems: [
          { residents: [table, { __typename: "AnnotationCollection", id: "c1", name: "Marks" }] },
          { residents: [{ __typename: "MeshCollection" }] },
        ],
      },
    });
    expect(out.lenses.map((l) => l.id)).toEqual(["l1"]);
    expect(out.tables[0].valueColumns).toEqual([{ name: "area", unit: "µm²" }]);
    expect(out.collections).toEqual([{ id: "c1", name: "Marks", drawn: false }]);
  });

  it("lists a resident reached twice once", () => {
    const out = chartCandidates({
      worldCoordinateSystem: {
        residents: [lens("l1", [100, 1, 1, 1])],
        placedSystems: [{ residents: [lens("l1", [100, 1, 1, 1])] }],
      },
    });
    expect(out.lenses).toHaveLength(1);
  });

  it("marks what is already drawn, and puts what cannot be a trace last", () => {
    const out = chartCandidates({
      layers: [
        { lens: { id: "l2" } },
        { tableDataset: { id: "t1" }, valueColumn: "area" },
        { annotationCollection: { id: "c1" } },
      ],
      worldCoordinateSystem: {
        residents: [
          lens("plane", [100, 1, 512, 512]),
          lens("l2", [100, 1, 1, 1]),
          lens("l3", [100, 1, 1, 1]),
          table,
          { __typename: "AnnotationCollection", id: "c1", name: "Marks" },
        ],
      },
    });
    expect(out.lenses.map((l) => l.id)).toEqual(["l3", "l2", "plane"]);
    expect(out.lenses.find((l) => l.id === "l2")?.drawn).toBe(true);
    expect(out.tables[0].drawnColumns).toEqual(["area"]);
    expect(out.collections[0].drawn).toBe(true);
  });
});
