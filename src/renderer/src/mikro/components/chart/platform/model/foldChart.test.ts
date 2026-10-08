import { describe, expect, it } from "vitest";
import { foldChart, selectedLayers, type ChartLike } from "./foldChart";

/** `position = 0.5 · index + 10` along the chart's axis `t`. */
const affine = (input: string, step = 0.5, offset = 10) => ({
  matrix: [[step, offset]],
  inputAxes: [input],
  outputAxes: ["t"],
  total: true,
});

const lens = (overrides: Record<string, unknown> = {}) => ({
  id: "lens1",
  axisNames: ["t", "y", "x"],
  shape: [1000, 1, 1],
  slices: [
    { axis: "y", start: 12, stop: 13 },
    { axis: "x", start: 40, stop: 41 },
  ],
  dataset: {
    id: "d1",
    name: "Movie",
    axisNames: ["t", "y", "x"],
    shape: [1000, 512, 512],
    dataArrays: [
      { level: 0, shape: [1000, 512, 512], chunkShape: [1, 512, 512], store: { id: "s0", key: "k0" } },
      // Downsampled in SPACE: position (12, 40) of it is other data.
      { level: 1, shape: [1000, 256, 256], chunkShape: [1, 256, 256], store: { id: "s1", key: "k1" } },
    ],
  },
  ...overrides,
});

const trace = (overrides: Record<string, unknown> = {}) => ({
  __typename: "TraceChartLayer",
  id: "a",
  order: 0,
  visible: true,
  opacity: 1,
  placement: "PLACED",
  alongAxis: "t",
  asAffine: { ...affine("t"), inputAxes: ["t", "y", "x"], matrix: [[0.5, 0, 0, 10]] },
  pathToWorld: [{ inverted: false, transformation: { id: "e1", version: 1 } }],
  lens: lens(),
  mark: "LINE",
  ...overrides,
});

const series = (overrides: Record<string, unknown> = {}) => ({
  __typename: "SeriesChartLayer",
  id: "b",
  order: 1,
  placement: "PLACED",
  alongAxis: "time",
  coordinateColumn: "time",
  valueColumn: "area",
  valueUnit: "µm²",
  asAffine: affine("time", 2, 0),
  pathToWorld: [],
  tableDataset: { id: "t1", name: "Measurements", store: { id: "p1" } },
  mark: "MARKERS",
  ...overrides,
});

const chart = (layers: unknown[]): ChartLike =>
  ({
    id: "c1",
    axis: { name: "t", unit: "second", type: "TIME" },
    worldCoordinateSystem: { id: "w1" },
    layers,
  }) as ChartLike;

const NO_ERRORS = new Map<string, string>();

describe("foldChart", () => {
  it("places a trace from asAffine's one row: step on alongAxis, offset last", () => {
    const { layers, worldSpan, timeOrigin } = foldChart(chart([trace()]), NO_ERRORS, null);
    const source = layers[0].source!;
    expect(source.timeMap.period).toBe(0.5);
    expect(source.timeMap.t0).toBe(10);
    expect(worldSpan).toEqual({ start: 10, end: 510 });
    expect(timeOrigin).toBe(10);
  });

  it("pins every other axis to the lens' position and drops a level downsampled along one", () => {
    const { layers } = foldChart(chart([trace()]), NO_ERRORS, null);
    const source = layers[0].source!;
    expect(source.fixedRanges).toEqual([null, { start: 12, stop: 13, step: 1 }, { start: 40, stop: 41, step: 1 }]);
    expect(source.levels.map((l) => l.storeId)).toEqual(["s0"]);
    // One time point of this stack is a whole 512 × 512 plane to decode.
    expect(source.bytesPerSample).toBe(4 * 512 * 512);
    expect(source.levels[0].tileSamples).toBeLessThanOrEqual(16);
  });

  it("draws one line per position along the series axis", () => {
    const layer = trace({
      seriesAxis: "c",
      alongAxis: "t",
      asAffine: { matrix: [[1, 0, 0]], inputAxes: ["t", "c"], outputAxes: ["t"], total: true },
      lens: lens({
        axisNames: ["t", "c"],
        shape: [1000, 3],
        slices: [],
        dataset: {
          id: "d2",
          name: "Spectra",
          axisNames: ["t", "c"],
          shape: [1000, 3],
          dataArrays: [{ level: 0, shape: [1000, 3], store: { id: "s", key: "k" } }],
        },
      }),
    });
    const { layers } = foldChart(chart([layer]), NO_ERRORS, null);
    expect(layers[0].channelCount).toBe(3);
    expect(layers[0].source?.channelAxisIndex).toBe(1);
  });

  const spectra = (lensOverrides: Record<string, unknown> = {}) =>
    trace({
      seriesAxis: "c",
      alongAxis: "t",
      asAffine: { matrix: [[1, 0, 0]], inputAxes: ["t", "c"], outputAxes: ["t"], total: true },
      lens: lens({
        axisNames: ["t", "c"],
        shape: [1000, 4],
        slices: [],
        dataset: {
          id: "d2",
          name: "Spectra",
          axisNames: ["t", "c"],
          shape: [1000, 4],
          dataArrays: [{ level: 0, shape: [1000, 4], store: { id: "s", key: "k" } }],
        },
        ...lensOverrides,
      }),
    });

  it("names each line by its anchor, else by its position", () => {
    const layer = spectra({
      activeAnchors: [
        { coordinates: { c: 0 }, channelLabel: { label: "GFP" } },
        { coordinates: { c: 3 }, channelLabel: { label: "DAPI" } },
      ],
    });
    const { layers } = foldChart(chart([layer]), NO_ERRORS, null);
    expect(layers[0].channelLabels).toEqual(["GFP", "c 1", "c 2", "DAPI"]);
  });

  it("reads a line's anchor by its DATASET index when the lens slices the series axis", () => {
    const layer = spectra({
      shape: [1000, 2],
      slices: [{ axis: "c", start: 1, stop: 4, step: 2 }],
      activeAnchors: [{ coordinates: { c: 3 }, channelLabel: { label: "DAPI" } }],
    });
    const { layers } = foldChart(chart([layer]), NO_ERRORS, null);
    expect(layers[0].source?.channelIndices).toEqual([1, 3]);
    expect(layers[0].channelLabels).toEqual(["c 1", "DAPI"]);
  });

  it("names nothing for a single line, and renames a line without rebuilding its source", () => {
    expect(foldChart(chart([trace()]), NO_ERRORS, null).layers[0].channelLabels).toEqual([]);
    const first = foldChart(chart([spectra()]), NO_ERRORS, null);
    const second = foldChart(
      chart([spectra({ activeAnchors: [{ coordinates: { c: 1 }, channelLabel: { label: "RFP" } }] })]),
      NO_ERRORS,
      first.memo,
    );
    expect(second.layers[0].source).toBe(first.layers[0].source);
    expect(second.layers[0].channelLabels[1]).toBe("RFP");
  });

  it("does not draw a layer without a placement, and says why", () => {
    const { layers } = foldChart(
      chart([
        trace({ id: "u", placement: "UNREGISTERED", asAffine: null, alongAxis: null }),
        trace({ id: "n", alongAxis: null }),
      ]),
      NO_ERRORS,
      null,
    );
    const unregistered = layers.find((l) => l.id === "u")!;
    const unnamed = layers.find((l) => l.id === "n")!;
    expect(unregistered.placeability.drawable).toBe(false);
    expect(unregistered.source).toBeNull();
    // Placed, but nothing says which of its axes runs along the chart.
    expect(unnamed.source).toBeNull();
    expect(unnamed.sourceFailure).toMatch(/no axis/);
  });

  it("reads an asAffine error as placed by a map with no closed form: not drawn", () => {
    const layer = trace({ asAffine: null });
    const { layers } = foldChart(chart([layer]), new Map([["a", "FIELD step"]]), null);
    expect(layers[0].placeability).toMatchObject({ drawable: true, timeSource: "LOOKUP" });
    expect(layers[0].source).toBeNull();
  });

  it("places a series by its coordinate column and groups it by unit", () => {
    const { layers } = foldChart(chart([series()]), NO_ERRORS, null);
    expect(layers[0].series).toMatchObject({
      coordinateColumn: "time",
      valueColumn: "area",
      axisMap: { period: 2, t0: 0 },
    });
    expect(layers[0].rowGroup).toBe("unit:µm²");
    expect(layers[0].mark).toBe("MARKERS");
  });

  it("keeps a layer's source by identity across a content-only fold", () => {
    const first = foldChart(chart([trace(), series()]), NO_ERRORS, null);
    const second = foldChart(
      chart([trace({ name: "Renamed", opacity: 0.5 }), series({ mark: "STEPS" })]),
      NO_ERRORS,
      first.memo,
    );
    expect(second.layers[0].source).toBe(first.layers[0].source);
    expect(second.layers[1].series).toBe(first.layers[1].series);
    expect(second.layers[0].label).toBe("Renamed");
    expect(second.layers[1].lineShape).toBe("steps");
  });

  it("rebuilds a layer's source when its registration is refined", () => {
    const first = foldChart(chart([trace()]), NO_ERRORS, null);
    const second = foldChart(
      chart([trace({ pathToWorld: [{ inverted: false, transformation: { id: "e1", version: 2 } }] })]),
      NO_ERRORS,
      first.memo,
    );
    expect(second.layers[0].source).not.toBe(first.layers[0].source);
  });

  it("orders by (order, id), whatever order the server answers in", () => {
    const { layers } = foldChart(chart([series({ order: 1 }), trace({ order: 0 })]), NO_ERRORS, null);
    expect(layers.map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("folds the opacity into the colour, against the black canvas", () => {
    const { layers } = foldChart(chart([trace({ color: [1, 0.5, 0, 1], opacity: 0.5 })]), NO_ERRORS, null);
    expect(layers[0].color).toBe("rgb(128, 64, 0)");
  });
});

describe("selectedLayers", () => {
  it("drops a layer kind the query does not select", () => {
    const served = { ...chart([trace()]), layers: [trace(), { __typename: "HeatmapChartLayer" }] };
    expect(selectedLayers(served as never).layers).toHaveLength(1);
  });
});
