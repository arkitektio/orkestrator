import { describe, expect, it } from "vitest";
import { valueToY } from "../../platform/coords/rowMap";
import {
  drawnChannelOf,
  findValueCollection,
  lensChannelOf,
  rowTargetsFor,
  rowVectors,
  valueCollectionInput,
  worldVertex,
} from "./valueCollections";

const lensSpace = {
  id: "cs-lens",
  axes: [
    { name: "c", type: "CHANNEL", order: 0 },
    { name: "t", type: "TIME", order: 1 },
  ],
};
const lens = { id: "lens-1", coordinateSystem: lensSpace, dataset: { intrinsicSystem: null } };

const valueSystem = {
  id: "cs-marks",
  axes: [
    { name: "t", type: "TIME", order: 0 },
    { name: "c", type: "CHANNEL", order: 1 },
    { name: "value", type: "VALUE", order: 2 },
  ],
};
const valueCollection = {
  id: "col-v",
  coordinateSystem: valueSystem,
  derivedFrom: [{ output: { id: "cs-lens" } }],
};
const timeCollection = { id: "col-t", coordinateSystem: { axes: [{ name: "t", type: "TIME" }] }, derivedFrom: [] };

const rawLayers = {
  tr1: { __typename: "TraceLayer", id: "tr1", lens, channelIndex: null },
  tr2: { __typename: "TraceLayer", id: "tr2", lens, channelIndex: 3 },
  other: {
    __typename: "TraceLayer",
    id: "other",
    lens: { ...lens, id: "lens-2", coordinateSystem: { ...lensSpace, id: "cs-other" } },
  },
  ann: { __typename: "AnnotationLayer", id: "ann", annotationCollection: timeCollection },
  vals: { __typename: "AnnotationLayer", id: "vals", annotationCollection: valueCollection },
};

describe("value collections", () => {
  it("finds the collection drawn over a lens' space, never the time-only one", () => {
    expect(findValueCollection(rawLayers, lens)?.layerId).toBe("vals");
    expect(findValueCollection(rawLayers, rawLayers.other.lens)).toBeNull();
  });

  it("targets every trace over the same lens space", () => {
    expect(rowTargetsFor(valueCollection, rawLayers)).toEqual([
      { traceLayerId: "tr1", channelIndex: null },
      { traceLayerId: "tr2", channelIndex: 3 },
    ]);
    expect(rowTargetsFor(timeCollection, rawLayers)).toEqual([]);
  });

  it("maps drawn channels to lens channels and back", () => {
    expect(lensChannelOf(null, 2)).toBe(2);
    expect(lensChannelOf(3, 0)).toBe(3);
    expect(drawnChannelOf(null, 2)).toBe(2);
    expect(drawnChannelOf(3, 3)).toBe(0);
    expect(drawnChannelOf(3, 2)).toBeNull();
  });

  it("builds a lens-derived collection with a dropped VALUE axis", () => {
    const input = valueCollectionInput({ lens, layerLabel: "TT1", valueUnit: "mV" });
    expect(input?.axes.map((a) => [a.name, a.type])).toEqual([
      ["t", "TIME"],
      ["c", "CHANNEL"],
      ["value", "VALUE"],
    ]);
    expect(input?.derivedFrom[0]).toMatchObject({
      kind: "LENS",
      lens: "lens-1",
      transform: { kind: "BY_DIMENSION", inputAxes: ["t", "c"], outputAxes: ["t", "c"], scale: [1, 1] },
    });
  });

  it("picks a free name for the value axis", () => {
    const taken = { ...lens, coordinateSystem: { ...lensSpace, axes: [...lensSpace.axes, { name: "value", type: "INDEX" }] } };
    expect(valueCollectionInput({ lens: taken, layerLabel: "x" })?.axes.at(-1)?.name).toBe("v");
  });

  it("refuses a lens with no time axis", () => {
    const flat = { ...lens, coordinateSystem: { id: "x", axes: [{ name: "c", type: "CHANNEL" }] } };
    expect(valueCollectionInput({ lens: flat, layerLabel: "x" })).toBeNull();
  });

  it("encodes points in the collection's axis order: lens sample, channel, value", () => {
    const band = { bottom: -2, top: -1 };
    const clim = { lo: -100, hi: 100 };
    const { scale, offset } = valueToY(band, clim);
    const encoded = rowVectors({
      points: [
        { time: 1010, y: scale * -40 + offset },
        { time: 1030, y: scale * 60 + offset },
      ],
      system: valueSystem,
      timeMap: { t0: 1000, period: 0.5, total: true },
      band,
      clim,
      lensChannel: 3,
    });
    expect(encoded?.vectors[0][0]).toBeCloseTo(20);
    expect(encoded?.vectors[0][1]).toBe(3);
    expect(encoded?.vectors[0][2]).toBeCloseTo(-40);
    expect(encoded?.vectors[1][0]).toBeCloseTo(60);
    expect(encoded?.vectors[1][2]).toBeCloseTo(60);
    expect(encoded?.coordinates).toEqual([{ name: "c", value: 3 }]);
  });

  it("writes a world vertex in the world's time slot", () => {
    const world = { axes: [{ name: "x", type: "SPACE" }, { name: "t", type: "TIME" }] };
    expect(worldVertex(world, 7)).toEqual([0, 7]);
  });
});
