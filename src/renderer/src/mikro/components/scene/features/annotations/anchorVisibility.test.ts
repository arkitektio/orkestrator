import { describe, expect, it } from "vitest";
import {
  type AnchorLayer,
  describePins,
  layerCoverage,
  matchAnchor,
} from "./anchorVisibility";

/**
 * A c/t/z/y/x layer: x/y/z rendered, c the intensity axis with two visible
 * channels and one hidden, t the only collapsible dim (extent 10).
 */
const layerWith = (overrides: Partial<AnchorLayer> = {}): AnchorLayer => ({
  intensityAxis: "c",
  phasorAxis: null,
  channels: [
    { intensityIndex: 0, visible: true },
    { intensityIndex: 1, visible: true },
    { intensityIndex: 2, visible: false },
  ],
  phasors: [],
  lens: {
    slices: [],
    renderAxes: { x: "x", y: "y", z: "z" },
    dataset: {
      axisNames: ["c", "t", "z", "y", "x"],
      dataArrays: [
        { level: 1, shape: [3, 10, 8, 256, 256] },
        { level: 0, shape: [3, 10, 8, 512, 512] },
      ],
    },
  },
  ...overrides,
});

const coverageAt = (t: number | undefined, layer = layerWith()) =>
  layerCoverage(layer, t === undefined ? {} : { t });

describe("layerCoverage", () => {
  it("splits axes into whole, intensity and collapsed", () => {
    const coverage = coverageAt(5);
    expect([...coverage.whole].sort()).toEqual(["x", "y", "z"]);
    expect(coverage.fixed).toEqual({ t: 5 });
    expect(coverage.intensityAxis).toBe("c");
    expect([...coverage.intensityIndices].sort()).toEqual([0, 1]);
  });

  it("treats the phasor axis as whole — its reduction consumes every bin", () => {
    const coverage = layerCoverage(
      layerWith({
        phasorAxis: "tau",
        lens: {
          slices: [],
          renderAxes: { x: "x", y: "y", z: "z" },
          dataset: {
            axisNames: ["c", "tau", "z", "y", "x"],
            dataArrays: [{ level: 0, shape: [3, 64, 8, 512, 512] }],
          },
        },
      }),
      {},
    );
    expect(coverage.whole.has("tau")).toBe(true);
    expect(coverage.fixed).toEqual({});
  });

  it("resolves a collapsed dim against the LEVEL-0 shape, not a lower level", () => {
    // No selection and no slice: the collapsed default centres on the extent,
    // which must come from level 0 (10), not level 1's own shape.
    expect(coverageAt(undefined).fixed.t).toBe(0);
    // Out-of-range selections clamp to level 0's extent.
    expect(coverageAt(99).fixed.t).toBe(9);
  });

  it("falls back to the lens slice's collapsed default when nothing is selected", () => {
    const sliced = layerWith();
    sliced.lens.slices = [
      { axis: "t", start: 4, stop: 7, step: 1 },
    ] as AnchorLayer["lens"]["slices"];
    expect(layerCoverage(sliced, {}).fixed.t).toBe(5);
    // An explicit selection still wins over the slice default.
    expect(layerCoverage(sliced, { t: 2 }).fixed.t).toBe(2);
  });
});

describe("matchAnchor", () => {
  it("shows an anchor that pins nothing — it is global along every axis", () => {
    const match = matchAnchor({}, coverageAt(5));
    expect(match.satisfied).toBe(true);
    expect(match.pins).toEqual([]);
  });

  it("matches a t pin only at the current index", () => {
    expect(matchAnchor({ t: 5 }, coverageAt(5)).satisfied).toBe(true);
    expect(matchAnchor({ t: 5 }, coverageAt(3)).satisfied).toBe(false);
  });

  it("reports what the layer shows on an unmet pin", () => {
    const [pin] = matchAnchor({ t: 5 }, coverageAt(3)).pins;
    expect(pin).toEqual({ axis: "t", value: 5, met: false, current: "3" });
  });

  it("follows the VISIBLE channel nodes on the intensity axis", () => {
    const coverage = coverageAt(5);
    expect(matchAnchor({ c: 0 }, coverage).satisfied).toBe(true);
    expect(matchAnchor({ c: 1 }, coverage).satisfied).toBe(true);
    // Channel 2 exists as a render node but is toggled off.
    expect(matchAnchor({ c: 2 }, coverage).satisfied).toBe(false);
    expect(matchAnchor({ c: 7 }, coverage).satisfied).toBe(false);
  });

  it("drops a channel's metadata when that channel is hidden", () => {
    const hidden = layerWith({
      channels: [
        { intensityIndex: 0, visible: true },
        { intensityIndex: 1, visible: false },
      ],
    });
    expect(matchAnchor({ c: 1 }, coverageAt(5, hidden)).satisfied).toBe(false);
    expect(matchAnchor({ c: 1 }, coverageAt(5, hidden)).pins[0].current).toBe("0");
  });

  it("requires EVERY pin — a matching channel with the wrong t is out of view", () => {
    expect(matchAnchor({ c: 0, t: 5 }, coverageAt(5)).satisfied).toBe(true);
    expect(matchAnchor({ c: 0, t: 5 }, coverageAt(4)).satisfied).toBe(false);
  });

  it("satisfies a pin on a rendered spatial axis — every index is on screen", () => {
    expect(matchAnchor({ x: 300 }, coverageAt(5)).satisfied).toBe(true);
    expect(matchAnchor({ z: 2 }, coverageAt(5)).pins[0].current).toBe("all");
  });

  it("leaves a pin on an axis the dataset does not have unmet", () => {
    const [pin] = matchAnchor({ q: 1 }, coverageAt(5)).pins;
    expect(pin).toEqual({
      axis: "q",
      value: 1,
      met: false,
      current: "no such axis",
    });
  });

  it("reads numeric strings, since `coordinates` is the untyped Any scalar", () => {
    expect(matchAnchor({ t: "5" }, coverageAt(5)).satisfied).toBe(true);
  });

  it("counts an unreadable pin as unmet rather than ignoring it", () => {
    const match = matchAnchor({ t: "later" }, coverageAt(5));
    expect(match.satisfied).toBe(false);
    expect(match.pins[0]).toEqual({
      axis: "t",
      value: null,
      met: false,
      current: "unreadable pin",
    });
    // A fractional index is not a pixel index either.
    expect(matchAnchor({ t: 1.5 }, coverageAt(5)).satisfied).toBe(false);
  });

  it("treats a null value as no pin at all", () => {
    expect(matchAnchor({ t: null }, coverageAt(5)).pins).toEqual([]);
  });

  it("degrades non-object coordinates to global rather than throwing", () => {
    for (const junk of [null, undefined, 5, "c=0", [1, 2]]) {
      expect(matchAnchor(junk, coverageAt(5)).satisfied).toBe(true);
    }
  });
});

describe("describePins", () => {
  it("renders the pin list a row header shows", () => {
    expect(describePins(matchAnchor({ c: 0, t: 5 }, coverageAt(5)).pins)).toBe(
      "c=0, t=5",
    );
    expect(describePins([])).toBe("");
  });
});
