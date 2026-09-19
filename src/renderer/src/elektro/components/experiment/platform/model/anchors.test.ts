import { describe, expect, it } from "vitest";
import {
  anchorInView,
  anchorsForChannel,
  channelLabelsOf,
  channelSitesOf,
  climSeedOf,
  histogramClimOf,
  mergeChannelAnchors,
  partitionAnchors,
  pinOf,
  sampleWindowOf,
  siteLabelOf,
  type AnchorCoverage,
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

describe("sampleWindowOf", () => {
  it("maps a world window onto dataset samples off the finest level's law", () => {
    expect(sampleWindowOf({ t0: 10, period: 0.5 }, { start: 11, end: 12 })).toEqual({ start: 2, end: 4 });
  });
  it("orders the run when time runs backwards, and refuses a zero period", () => {
    expect(sampleWindowOf({ t0: 0, period: -1 }, { start: 1, end: 3 })).toEqual({ start: -3, end: -1 });
    expect(sampleWindowOf({ t0: 0, period: 0 }, { start: 1, end: 3 })).toBeNull();
    expect(sampleWindowOf(null, { start: 1, end: 3 })).toBeNull();
  });
});

describe("anchorInView", () => {
  const coverage: AnchorCoverage = {
    channelAxis: "c",
    channelIndices: [2],
    timeAxis: "t",
    timeSamples: { start: 100, end: 200 },
  };

  it("keeps global anchors and the drawn channel, drops other channels", () => {
    expect(anchorInView({}, coverage)).toBe(true);
    expect(anchorInView({ c: 2 }, coverage)).toBe(true);
    expect(anchorInView({ c: 3 }, coverage)).toBe(false);
  });

  it("keeps a time pin only while its sample overlaps the window", () => {
    expect(anchorInView({ t: 150 }, coverage)).toBe(true);
    // Sample 99 spans [99, 100): it ends where the window starts.
    expect(anchorInView({ t: 99 }, coverage)).toBe(false);
    expect(anchorInView({ t: 199 }, coverage)).toBe(true);
    expect(anchorInView({ t: 200 }, coverage)).toBe(false);
    // A window that starts mid-sample still shows that sample.
    expect(anchorInView({ t: 99 }, { ...coverage, timeSamples: { start: 99.5, end: 120 } })).toBe(true);
  });

  it("counts everything along an axis the coverage does not know", () => {
    const open: AnchorCoverage = { channelAxis: null, channelIndices: [], timeAxis: "t", timeSamples: null };
    expect(anchorInView({ c: 7, t: 1e9 }, open)).toBe(true);
  });
});

describe("partitionAnchors", () => {
  it("splits in order", () => {
    const coverage: AnchorCoverage = { channelAxis: "c", channelIndices: [0], timeAxis: null, timeSamples: null };
    const a = anchor({ c: 0 }, { id: "a" });
    const b = anchor({ c: 1 }, { id: "b" });
    const g = anchor({}, { id: "g" });
    expect(partitionAnchors([a, b, g], coverage)).toEqual({ inView: [a, g], outOfView: [b] });
  });
});

describe("channelSitesOf", () => {
  it("gives each drawn channel its own site, a recording site before a stimulus site", () => {
    const anchors = [
      anchor({ c: 0 }, { recordingSite: { id: "r0", label: "soma_v" } }),
      anchor({ c: 1 }, { stimulusSite: { id: "s1", label: "iclamp" } }),
      anchor({ c: 1 }, { recordingSite: { id: "r1", label: "dend_v" } }),
    ];
    expect(channelSitesOf(anchors, "c", [0, 1, 2])).toEqual([
      { id: "r0", label: "soma_v", role: "recording" },
      { id: "r1", label: "dend_v", role: "recording" },
      null,
    ]);
  });

  it("gives a trace without a channel axis one entry", () => {
    const anchors = [anchor({}, { stimulusSite: { id: "s", label: "iclamp" } })];
    expect(channelSitesOf(anchors, null, [])).toEqual([{ id: "s", label: "iclamp", role: "stimulus" }]);
  });
});

describe("mergeChannelAnchors", () => {
  it("takes each field from the most specific anchor that states it", () => {
    const pinned = {
      channelLabel: { label: "Vm" },
      acquisitionMetadata: { metadata: { gain: 10, amp: "" } },
    };
    const global = {
      channelLabel: { label: "all" },
      valueUnit: { unit: "mV" },
      rig: { id: "r" },
      acquisitionMetadata: { metadata: { gain: 1, amp: "Axopatch", nested: { a: 1 } } },
    };
    expect(mergeChannelAnchors([pinned, global])).toEqual({
      label: "Vm",
      unit: "mV",
      histogram: null,
      rig: { id: "r" },
      acquisition: [
        ["gain", 10],
        ["amp", "Axopatch"],
        ["nested", { a: 1 }],
      ],
    });
  });
});
