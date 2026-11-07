import { describe, expect, it } from "vitest";
import { withPersisted } from "./chartLayerModel";
import { chartLayoutOf } from "./chartStructure";
import { foldChart, type ChartLike } from "./foldChart";
import { valuesPanels } from "./valuesPanels";

const IDENTITY = { matrix: [[1, 0]], inputAxes: ["object"], outputAxes: ["object"], total: true };
const table = { id: "t1", name: "Organelles", store: { id: "p1" } };

const points = (id: string, overrides: Record<string, unknown> = {}) => ({
  __typename: "PointsChartLayer",
  id,
  order: Number(id.replace(/\D/g, "")) || 0,
  placement: "PLACED",
  asAffine: IDENTITY,
  tableDataset: table,
  xColumn: "centroid_y_um",
  yColumn: "arclength_um",
  xUnit: "µm",
  yUnit: "µm",
  mark: "MARKERS",
  ...overrides,
});

const distribution = (id: string, overrides: Record<string, unknown> = {}) => ({
  __typename: "DistributionChartLayer",
  id,
  order: Number(id.replace(/\D/g, "")) || 0,
  placement: "PLACED",
  asAffine: IDENTITY,
  tableDataset: table,
  valueColumn: "area",
  valueUnit: "µm²",
  groupColumn: null,
  mark: "HISTOGRAM",
  ...overrides,
});

const fold = (layers: ChartLike["layers"]) =>
  foldChart({ id: "c", axis: null, layers }, new Map(), null).layers;

const ids = (panels: ReturnType<typeof valuesPanels>) => panels.map((p) => p.layers.map((l) => l.id));

describe("the panels of a chart of values", () => {
  it("STACKED: one panel per layer, in draw order", () => {
    const layers = fold([points("p1"), points("p2"), distribution("d3")]);
    expect(ids(valuesPanels(layers, "STACKED"))).toEqual([["p1"], ["p2"], ["d3"]]);
  });

  it("SHARED: scatters in the same units on both axes share, whatever their columns", () => {
    const layers = fold([
      points("p1"),
      points("p2", { xColumn: "centroid_x_um", yColumn: "length_um" }),
      points("p3", { yColumn: "area_um2", yUnit: "µm²" }),
    ]);
    const panels = valuesPanels(layers, "SHARED");
    expect(ids(panels)).toEqual([["p1", "p2"], ["p3"]]);
    expect(panels[0].axes).toEqual({ x: "centroid_y_um, centroid_x_um (µm)", y: "arclength_um, length_um (µm)", categorical: false });
  });

  it("a column with no unit shares only with itself", () => {
    const layers = fold([
      points("p1", { xColumn: "cluster_id", xUnit: null }),
      points("p2", { xColumn: "count", xUnit: null }),
      points("p3", { xColumn: "cluster_id", xUnit: null }),
    ]);
    expect(ids(valuesPanels(layers, "SHARED"))).toEqual([["p1", "p3"], ["p2"]]);
  });

  it("never puts points, a histogram and a box of one column together", () => {
    const layers = fold([points("p1"), distribution("d2"), distribution("d3", { mark: "BOX", groupColumn: "condition" })]);
    expect(ids(valuesPanels(layers, "SHARED"))).toEqual([["p1"], ["d2"], ["d3"]]);
  });

  it("boxes share only when they group by the same column; histograms by their value and how they count", () => {
    const layers = fold([
      distribution("d1", { mark: "BOX", groupColumn: "condition" }),
      distribution("d2", { mark: "BOX", groupColumn: "condition", valueColumn: "area_corrected" }),
      distribution("d3", { mark: "BOX", groupColumn: "cluster" }),
      distribution("d4", { groupColumn: "condition" }),
      distribution("d5", { groupColumn: "cluster" }),
    ]);
    const panels = valuesPanels(layers, "SHARED");
    expect(ids(panels)).toEqual([["d1", "d2"], ["d3"], ["d4", "d5"]]);
    expect(panels[0].axes).toEqual({ x: "condition", y: "area, area_corrected (µm²)", categorical: true });
    expect(panels[2].axes).toEqual({ x: "area (µm²)", y: "fraction of the group's rows", categorical: false });
  });

  it("a grouped and an ungrouped histogram count differently: apart", () => {
    const layers = fold([distribution("d1"), distribution("d2", { groupColumn: "condition" })]);
    expect(ids(valuesPanels(layers, "SHARED"))).toEqual([["d1"], ["d2"]]);
  });

  it("keeps the chart's OVERLAY, which value panels lay out as SHARED", () => {
    expect(chartLayoutOf({ layout: "OVERLAY" })).toBe("OVERLAY");
    expect(chartLayoutOf({ layout: null })).toBe("SHARED");
    const layers = fold([points("p1"), points("p2", { xColumn: "centroid_x_um" })]);
    expect(ids(valuesPanels(layers, "OVERLAY"))).toEqual(ids(valuesPanels(layers, "SHARED")));
  });
});

describe("a value layer's group", () => {
  it("survives a colour restyle, and moves with a mark switch or a re-pointed column", () => {
    const first = foldChart({ id: "c", layers: [distribution("d1")] }, new Map(), null);
    const layer = first.layers[0];
    expect(withPersisted(layer, { opacity: 0.5 }).valuesGroup).toBe(layer.valuesGroup);
    expect(withPersisted(layer, { mark: "BOX" }).valuesGroup).not.toBe(layer.valuesGroup);

    const repointed = foldChart(
      { id: "c", layers: [distribution("d1", { valueColumn: "volume", valueUnit: "µm³" })] },
      new Map(),
      first.memo,
    );
    expect(repointed.layers[0].valuesGroup).not.toBe(layer.valuesGroup);
  });

  it("is null for a layer that is not drawn", () => {
    const [layer] = fold([points("p1", { placement: "UNMAPPABLE", asAffine: null })]);
    expect(layer.valuesGroup).toBeNull();
  });
});
