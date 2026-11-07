import { describe, expect, it } from "vitest";
import { chartCanvasOf } from "./chartCanvas";
import { isValuesKind, kindOfTypename, type ChartLayerKind } from "./chartLayerModel";
import { chartScopeSignature } from "./chartStructure";
import { foldChart } from "./foldChart";

describe("what a chart's viewport is made of", () => {
  it("is the axis plot, the value panels, or both — never a kind", () => {
    expect(chartCanvasOf({ hasAxis: true, hasValueLayers: false })).toBe("axis");
    expect(chartCanvasOf({ hasAxis: true, hasValueLayers: true })).toBe("both");
    expect(chartCanvasOf({ hasAxis: false, hasValueLayers: true })).toBe("values");
    // No axis and nothing yet: the panels' empty notice, not an axis to nowhere.
    expect(chartCanvasOf({ hasAxis: false, hasValueLayers: false })).toBe("values");
  });

  it("rebuilds on the chart, its world and its axis — the axis says whether there is a plot", () => {
    const base = { id: "c", worldCoordinateSystem: { id: "w" }, axis: { name: "t" } };
    expect(chartScopeSignature(base)).not.toBe(chartScopeSignature({ ...base, axis: null }));
    expect(chartScopeSignature(base)).toBe(chartScopeSignature({ ...base }));
  });

  it("reads where a layer's positions come from off its kind", () => {
    const IDENTITY = { matrix: [[1, 0]], inputAxes: ["object"], outputAxes: ["object"], total: true };
    const table = { id: "t1", name: "T", store: { id: "s" } };
    const points = {
      __typename: "PointsChartLayer",
      id: "p",
      placement: "PLACED",
      asAffine: IDENTITY,
      tableDataset: table,
      xColumn: "a",
      yColumn: "b",
    };
    const [layer] = foldChart({ id: "c", layers: [points] }, new Map(), null).layers;
    expect(layer.kind).toBe("points");
    expect(isValuesKind(layer.kind)).toBe(true);
    const byValues = (typename: string) => isValuesKind(kindOfTypename(typename) as ChartLayerKind);
    expect(byValues("DistributionChartLayer")).toBe(true);
    expect(byValues("TraceChartLayer")).toBe(false);
    expect(byValues("SeriesChartLayer")).toBe(false);
    expect(byValues("AnnotationChartLayer")).toBe(false);
  });
});
