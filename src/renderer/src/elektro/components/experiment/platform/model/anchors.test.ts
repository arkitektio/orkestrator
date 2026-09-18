import { describe, expect, it } from "vitest";
import {
  anchorsForChannel,
  channelLabelsOf,
  climSeedOf,
  histogramClimOf,
  pinOf,
  siteLabelOf,
} from "./anchors";

const anchor = (coordinates: unknown, over: Record<string, unknown> = {}) => ({ coordinates, ...over });

describe("pinOf", () => {
  it("reads an integer pin and treats absence as global", () => {
    expect(pinOf({ c: 2 }, "c")).toBe(2);
    expect(pinOf({ c: "3" }, "c")).toBe(3);
    expect(pinOf({}, "c")).toBeNull();
    expect(pinOf(null, "c")).toBeNull();
  });
});

describe("anchorsForChannel", () => {
  it("puts the pinned anchor before the global one and drops other channels", () => {
    const global = anchor({}, { id: "g" });
    const two = anchor({ c: 2 }, { id: "2" });
    const three = anchor({ c: 3 }, { id: "3" });
    expect(anchorsForChannel([global, two, three], "c", 2)).toEqual([two, global]);
  });
});

describe("channelLabelsOf", () => {
  it("labels each drawn channel by its dataset index", () => {
    const anchors = [
      anchor({ c: 2 }, { channelLabel: { label: "Vm" } }),
      anchor({ c: 3 }, { channelLabel: { label: "Im" } }),
    ];
    expect(channelLabelsOf(anchors, "c", [2, 3, 4])).toEqual(["Vm", "Im", null]);
  });
});

describe("siteLabelOf", () => {
  it("prefers a recording site over a stimulus site", () => {
    expect(
      siteLabelOf([anchor({}, { stimulusSite: { label: "iclamp" } }), anchor({}, { recordingSite: { label: "soma_v" } })]),
    ).toBe("soma_v");
    expect(siteLabelOf([])).toBeNull();
  });
});

describe("clim seeding", () => {
  const anchors = [
    anchor({ c: 0 }, { valueHistogram: { min: -80, max: 20 } }),
    anchor({ c: 1 }, { valueHistogram: { min: null, max: null, p1: -5, p99: 40 } }),
  ];

  it("unions the drawn channels' histograms", () => {
    expect(histogramClimOf(anchors, "c", [0, 1])).toEqual({ lo: -80, hi: 40 });
    expect(histogramClimOf(anchors, "c", [1])).toEqual({ lo: -5, hi: 40 });
  });

  it("orders persisted, then histogram, then nothing", () => {
    const histogram = { lo: -80, hi: 20 };
    expect(climSeedOf({ climMin: -1, climMax: 1 }, histogram)).toEqual({ lo: -1, hi: 1 });
    expect(climSeedOf({ climMin: -1 }, histogram)).toEqual({ lo: -1, hi: 20 });
    expect(climSeedOf({}, histogram)).toEqual(histogram);
    expect(climSeedOf({}, null)).toBeNull();
  });
});
