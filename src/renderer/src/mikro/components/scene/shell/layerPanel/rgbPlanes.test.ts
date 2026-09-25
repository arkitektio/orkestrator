import { describe, expect, it } from "vitest";
import type { LayerCoverage } from "../../features/annotations/anchorVisibility";
import {
  anchorForPlane,
  describePlane,
  intensityAxisCandidates,
  intensityExtent,
  percentileUnion,
  rangeUnion,
  resolvePlanes,
  type PlaneLens,
} from "./rgbPlanes";

/**
 * The RGB card's picker stands on these rules: an index is a NAMED plane with
 * its own distribution, and only the anchor that actually describes that plane
 * may name it. Getting it wrong attributes the wrong acquisition to a colour.
 */

const histogram = (min: number, max: number, p1 = min, p99 = max) => ({
  bins: [min, (min + max) / 2, max],
  histogram: [4, 9, 2],
  min,
  max,
  p1,
  p99,
});

const lens = (anchors: PlaneLens["activeAnchors"], shape = [3, 64, 64]): PlaneLens => ({
  activeAnchors: anchors,
  dataset: {
    axisNames: ["c", "y", "x"],
    // Two levels, deliberately out of order: the extent must come off LEVEL 0,
    // not off whichever array the server listed first.
    dataArrays: [
      { level: 1, shape: shape.map((s, i) => (i === 0 ? s : s / 2)) },
      { level: 0, shape },
    ],
  },
});

const coverage = (overrides: Partial<LayerCoverage> = {}): LayerCoverage => ({
  axisNames: ["c", "y", "x"],
  whole: new Set(["y", "x"]),
  fixed: {},
  intensityAxis: "c",
  intensityIndices: new Set([0, 1, 2]),
  ...overrides,
});

describe("intensityExtent", () => {
  it("reads the level-0 extent of the named axis", () => {
    expect(intensityExtent(lens([], [5, 64, 64]), "c")).toBe(5);
  });

  it("is 0 — 'unknown' — for a missing axis, a null axis or no arrays", () => {
    expect(intensityExtent(lens([]), "t")).toBe(0);
    expect(intensityExtent(lens([]), null)).toBe(0);
    expect(intensityExtent({ dataset: { axisNames: ["c"] } }, "c")).toBe(0);
  });
});

describe("anchorForPlane", () => {
  it("picks the anchor pinned to that index, not the first one carrying data", () => {
    const zero = { coordinates: { c: 0 }, channelLabel: { label: "DAPI" } };
    const two = { coordinates: { c: 2 }, channelLabel: { label: "mCherry" } };
    const l = lens([zero, two]);
    expect(anchorForPlane(l, coverage(), "c", 2)).toBe(two);
    expect(anchorForPlane(l, coverage(), "c", 0)).toBe(zero);
    expect(anchorForPlane(l, coverage(), "c", 1)).toBeNull();
  });

  it("ignores an anchor whose OTHER pins the layer does not satisfy", () => {
    // Scoped to t=7; the layer sits at t=0, so this anchor does not describe
    // what is on screen and must not name the plane.
    const scoped = { coordinates: { c: 1, t: 7 }, channelLabel: { label: "wrong timepoint" } };
    const cov = coverage({ axisNames: ["c", "t", "y", "x"], fixed: { t: 0 } });
    expect(anchorForPlane(lens([scoped]), cov, "c", 1)).toBeNull();

    const atT7 = coverage({ axisNames: ["c", "t", "y", "x"], fixed: { t: 7 } });
    expect(anchorForPlane(lens([scoped]), atT7, "c", 1)).toBe(scoped);
  });

  it("treats an unreadable pin as unmet rather than as global", () => {
    const broken = { coordinates: { c: 1, t: "later" }, channelLabel: { label: "nope" } };
    const cov = coverage({ axisNames: ["c", "t", "y", "x"], fixed: { t: 0 } });
    expect(anchorForPlane(lens([broken]), cov, "c", 1)).toBeNull();
  });

  it("is null for a null axis, unreadable coordinates or no anchors", () => {
    expect(anchorForPlane(lens([{ coordinates: { c: 0 } }]), coverage(), null, 0)).toBeNull();
    expect(anchorForPlane(lens([{ coordinates: "c=0" }]), coverage(), "c", 0)).toBeNull();
    expect(anchorForPlane(lens(null), coverage(), "c", 0)).toBeNull();
  });
});

describe("describePlane / resolvePlanes", () => {
  it("names a plane from its anchor and falls back to 'plane N'", () => {
    const l = lens([
      { coordinates: { c: 0 }, channelLabel: { label: "DAPI" }, valueHistogram: histogram(0, 500) },
      { coordinates: { c: 2 }, channelLabel: { label: "  " } },
    ]);
    const planes = resolvePlanes(l, coverage(), "c");
    expect(planes.map((p) => p.display)).toEqual(["DAPI", "plane 1", "plane 2"]);
    // A blank label is not a name.
    expect(planes[2].label).toBeNull();
    expect(planes[0].histogram?.max).toBe(500);
    expect(planes[1].histogram).toBeNull();
  });

  it("offers exactly the planes that exist — an unknown extent offers none", () => {
    expect(resolvePlanes(lens([], [4, 64, 64]), coverage(), "c")).toHaveLength(4);
    expect(resolvePlanes(lens([]), coverage(), "t")).toEqual([]);
  });

  it("describes an index outside the extent rather than dropping it", () => {
    // A stored mapping the dataset has since outgrown still renders as itself.
    const plane = describePlane(lens([], [2, 64, 64]), coverage(), "c", 9);
    expect(plane).toMatchObject({ index: 9, display: "plane 9", histogram: null });
  });

  it("drops a histogram with no counts", () => {
    const empty = { coordinates: { c: 0 }, valueHistogram: { bins: [], histogram: [] } };
    expect(describePlane(lens([empty]), coverage(), "c", 0).histogram).toBeNull();
  });
});

describe("percentileUnion / rangeUnion", () => {
  it("spans every plane, so Auto does not clip the brighter ones", () => {
    const planes = [
      { index: 0, label: null, display: "0", histogram: histogram(0, 500, 5, 400) },
      { index: 1, label: null, display: "1", histogram: histogram(0, 30000, 12, 28000) },
    ];
    expect(percentileUnion(planes)).toEqual([5, 28000]);
    expect(rangeUnion(planes)).toEqual([0, 30000]);
  });

  it("is null when nothing usable is present", () => {
    const bare = [{ index: 0, label: null, display: "0", histogram: null }];
    expect(percentileUnion(bare)).toBeNull();
    expect(rangeUnion(bare)).toBeNull();
    // A degenerate range (max === min) is not usable either.
    const flat = [{ index: 0, label: null, display: "0", histogram: histogram(7, 7) }];
    expect(rangeUnion(flat)).toBeNull();
  });
});

describe("intensityAxisCandidates", () => {
  const layer = {
    phasorAxis: null,
    lens: { renderAxes: { x: "x", y: "y", z: null } },
  };

  it("excludes axes already spent on geometry and any axis of extent 1", () => {
    const l: PlaneLens = {
      dataset: {
        axisNames: ["c", "t", "z", "y", "x"],
        dataArrays: [{ level: 0, shape: [3, 10, 1, 64, 64] }],
      },
    };
    expect(intensityAxisCandidates(l, layer)).toEqual(["c", "t"]);
  });

  it("returns one candidate when there is no choice to offer", () => {
    const l: PlaneLens = {
      dataset: { axisNames: ["c", "y", "x"], dataArrays: [{ level: 0, shape: [3, 64, 64] }] },
    };
    expect(intensityAxisCandidates(l, layer)).toEqual(["c"]);
  });
});
