import { describe, expect, it } from "vitest";
import { DEFAULT_LINE_WIDTH, DEFAULT_MARKER_SIZE, withPersisted } from "./chartLayerModel";
import { foldChart, type ChartLike } from "./foldChart";

/** A VALUES chart: no axis; its world is whose rows. */
const valuesChart = (layers: ChartLike["layers"]): ChartLike => ({ id: "c1", axis: null, layers });

const IDENTITY = { matrix: [[1, 0]], inputAxes: ["object"], outputAxes: ["object"], total: true };
const table = { id: "t1", name: "Nuclei", store: { id: "p1" } };

const points = (overrides: Record<string, unknown> = {}) => ({
  __typename: "PointsChartLayer",
  id: "p",
  order: 0,
  placement: "PLACED",
  asAffine: IDENTITY,
  tableDataset: table,
  windowFilters: [
    { column: "area", min: 50, max: null },
    { column: "track", min: 1, joinPath: [{ table: "2", column: "id" }] },
  ],
  xColumn: "area",
  yColumn: "volume",
  xUnit: "µm²",
  mark: "MARKERS",
  ...overrides,
});

const distribution = (overrides: Record<string, unknown> = {}) => ({
  __typename: "DistributionChartLayer",
  id: "d",
  order: 1,
  placement: "PLACED",
  asAffine: IDENTITY,
  tableDataset: table,
  valueColumn: "area",
  groupColumn: "condition",
  bins: 20,
  mark: "BOX",
  ...overrides,
});

const NO_ERRORS = new Map<string, string>();

describe("a chart of values", () => {
  it("folds points into a values source with the lens' row filters, and names the one it cannot apply", () => {
    const [layer] = foldChart(valuesChart([points()]), NO_ERRORS, null).layers;
    expect(layer.kind).toBe("points");
    expect(layer.values).toMatchObject({ kind: "points", x: "area", y: "volume", z: null, units: { x: "µm²" } });
    expect(layer.values?.filters).toEqual([{ column: "area", min: 50, max: null }]);
    expect(layer.sourceFailure).toMatch(/1 filter through another table/);
    expect(layer.label).toBe("Nuclei · volume vs area");
  });

  it("knows which column is the table's INDEX — what a picked point's id is", () => {
    const keyed = { ...table, columns: [{ name: "object", role: "COORDINATE", axisType: "INDEX" }, { name: "area" }] };
    const [layer] = foldChart(valuesChart([points({ tableDataset: keyed })]), NO_ERRORS, null).layers;
    expect(layer.values).toMatchObject({ kind: "points", indexColumn: "object" });
    const [plain] = foldChart(valuesChart([points()]), NO_ERRORS, null).layers;
    expect(plain.values).toMatchObject({ indexColumn: null });
  });

  it("folds a distribution, keeping its mark and grouping", () => {
    const [layer] = foldChart(valuesChart([distribution()]), NO_ERRORS, null).layers;
    expect(layer.mark).toBe("BOX");
    expect(layer.values).toMatchObject({ kind: "distribution", value: "area", group: "condition", bins: 20 });
    expect(layer.label).toBe("Nuclei · area by condition");
  });

  it("draws nothing for a layer not placed in the chart's world", () => {
    const [layer] = foldChart(valuesChart([points({ placement: "UNMAPPABLE", asAffine: null })]), NO_ERRORS, null).layers;
    expect(layer.placeability.drawable).toBe(false);
    expect(layer.values).toBeNull();
  });

  it("keeps a layer's source across a restyle, so nothing is read again", () => {
    const first = foldChart(valuesChart([points()]), NO_ERRORS, null);
    const second = foldChart(valuesChart([points({ opacity: 0.5 })]), NO_ERRORS, first.memo);
    expect(second.layers[0].values).toBe(first.layers[0].values);
    const third = foldChart(valuesChart([points({ yColumn: "perimeter" })]), NO_ERRORS, second.memo);
    expect(third.layers[0].values).not.toBe(first.layers[0].values);
  });
});

describe("how big a layer is drawn", () => {
  it("reads widths and sizes as multiples of the chart's default, never pixels", () => {
    const [plain] = foldChart(valuesChart([points()]), NO_ERRORS, null).layers;
    expect(plain.lineWidth).toBe(DEFAULT_LINE_WIDTH);
    expect(plain.markerSize).toBe(DEFAULT_MARKER_SIZE);
    const [doubled] = foldChart(valuesChart([points({ lineWidth: 2, markerSize: 0.5 })]), NO_ERRORS, null).layers;
    expect(doubled.lineWidth).toBe(2 * DEFAULT_LINE_WIDTH);
    expect(doubled.markerSize).toBe(0.5 * DEFAULT_MARKER_SIZE);
  });

  it("draws a circle unless the layer names another shape it knows", () => {
    const [plain] = foldChart(valuesChart([points()]), NO_ERRORS, null).layers;
    expect(plain.markerShape).toBe("CIRCLE");
    const [diamond] = foldChart(valuesChart([points({ markerShape: "DIAMOND" })]), NO_ERRORS, null).layers;
    expect(diamond.markerShape).toBe("DIAMOND");
    const [unknown] = foldChart(valuesChart([points({ markerShape: "STAR" })]), NO_ERRORS, null).layers;
    expect(unknown.markerShape).toBe("CIRCLE");
    expect(withPersisted(plain, { markerShape: "CROSS", markerSize: 2 })).toMatchObject({
      markerShape: "CROSS",
      markerSize: 2 * DEFAULT_MARKER_SIZE,
    });
  });
});
