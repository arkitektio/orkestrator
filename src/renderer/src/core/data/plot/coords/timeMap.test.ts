import { describe, expect, it } from "vitest";
import {
  edgeToTimeMap,
  placementToTimeMap,
  sampleToTime,
  spanOf,
  timeToSample,
} from "./timeMap";

/** `t_world = sample * period + start`, as a 1x2 placement. */
const sampling = (period: number, start: number) => ({
  matrix: [[period, start]],
  inputAxes: ["sample"],
  outputAxes: ["t"],
  total: true,
});

describe("placementToTimeMap", () => {
  it("reads the sampling law off a 1-D placement", () => {
    expect(placementToTimeMap(sampling(0.1, 500), "sample", "t")).toEqual({
      period: 0.1,
      t0: 500,
      total: true,
    });
  });

  it("keeps an identity map as a real placement rather than null", () => {
    // This is the whole reason for not reusing `placementToSpatialAffine`:
    // {period: 1, t0: 0} is ordinary and drawable, not "unplaced".
    expect(placementToTimeMap(sampling(1, 0), "sample", "t")).toEqual({
      period: 1,
      t0: 0,
      total: true,
    });
  });

  it("finds the time ROW by name, not by position", () => {
    // A world ordered (value, t): the time row is row 1. Reading row 0 would
    // return the value row's coefficients as a sampling period.
    const placement = {
      matrix: [
        [0, 7], // value row — nothing to do with time
        [0.1, 500], // t row
      ],
      inputAxes: ["sample"],
      outputAxes: ["value", "t"],
      total: true,
    };
    expect(placementToTimeMap(placement, "sample", "t")).toMatchObject({
      period: 0.1,
      t0: 500,
    });
  });

  it("finds the sample COLUMN by name, not by position", () => {
    // Input ordered (channel, sample): the sample column is column 1, and the
    // translation is at column inputAxes.length === 2.
    const placement = {
      matrix: [[0, 0.1, 500]],
      inputAxes: ["channel", "sample"],
      outputAxes: ["t"],
      total: true,
    };
    expect(placementToTimeMap(placement, "sample", "t")).toMatchObject({
      period: 0.1,
      t0: 500,
    });
  });

  it("refuses a placement that says nothing about the world's time axis", () => {
    // `total: false` with no time row: the path constrains other axes only.
    const placement = {
      matrix: [[1, 0]],
      inputAxes: ["sample"],
      outputAxes: ["value"],
      total: false,
    };
    expect(placementToTimeMap(placement, "sample", "t")).toBeNull();
  });

  it("accepts total:false when the time row IS present", () => {
    const placement = {
      matrix: [[0.1, 500]],
      inputAxes: ["sample"],
      outputAxes: ["t"],
      total: false,
    };
    expect(placementToTimeMap(placement, "sample", "t")).toEqual({
      period: 0.1,
      t0: 500,
      total: false,
    });
  });

  it("refuses when the input axis is not named, instead of assuming identity", () => {
    // Neither end matches; the shared reducer would hand back an identity here,
    // which would read as a confident 1-unit-per-sample placement.
    const placement = {
      matrix: [[0.1, 500]],
      inputAxes: ["other"],
      outputAxes: ["t"],
      total: true,
    };
    expect(placementToTimeMap(placement, "sample", "t")).toBeNull();
  });

  it("is null for an absent or empty placement", () => {
    expect(placementToTimeMap(null, "sample", "t")).toBeNull();
    expect(placementToTimeMap(undefined, "sample", "t")).toBeNull();
    expect(placementToTimeMap({ matrix: [] }, "sample", "t")).toBeNull();
  });

  it("is null when either axis name is unknown", () => {
    expect(placementToTimeMap(sampling(0.1, 0), null, "t")).toBeNull();
    expect(placementToTimeMap(sampling(0.1, 0), "sample", null)).toBeNull();
  });

  it("refuses a zero period, which would collapse every sample onto one instant", () => {
    expect(placementToTimeMap(sampling(0, 100), "sample", "t")).toBeNull();
  });
});

describe("sampleToTime / timeToSample", () => {
  const map = { period: 0.1, t0: 500, total: true };

  it("round-trips", () => {
    for (const sample of [0, 1, 999, 123456]) {
      expect(timeToSample(map, sampleToTime(map, sample))).toBeCloseTo(sample, 9);
    }
  });

  it("puts sample 0 at t0", () => {
    expect(sampleToTime(map, 0)).toBe(500);
  });
});

describe("spanOf", () => {
  it("covers the lens' samples", () => {
    expect(spanOf({ period: 0.1, t0: 500, total: true }, 1001)).toEqual({
      start: 500,
      end: 600,
    });
  });

  it("orders low→high even when time runs backwards against the index", () => {
    // A negative period is legal; an inverted span would break every caller.
    const span = spanOf({ period: -0.1, t0: 500, total: true }, 1001);
    expect(span).toEqual({ start: 400, end: 500 });
    expect(span.start).toBeLessThan(span.end);
  });

  it("gives a zero-width span for a single sample", () => {
    expect(spanOf({ period: 0.1, t0: 500, total: true }, 1)).toEqual({
      start: 500,
      end: 500,
    });
  });

  it("does not run backwards past t0 for an empty lens", () => {
    expect(spanOf({ period: 0.1, t0: 500, total: true }, 0)).toEqual({
      start: 500,
      end: 500,
    });
  });
});


describe("edgeToTimeMap", () => {
  it("composes a canonical Sequence[Scale, Translation] sampling law", () => {
    // sample → clock: scale by 0.1 ms, then shift by 5 ms.
    const edge = {
      __typename: "SequenceTransformation",
      inputAxes: ["sample"],
      outputAxes: ["t"],
      transformations: [
        { __typename: "ScaleTransformation", inputAxes: ["sample"], outputAxes: ["sample"], scale: [0.1] },
        { __typename: "TranslationTransformation", inputAxes: ["sample"], outputAxes: ["t"], translation: [5] },
      ],
    };
    const map = edgeToTimeMap(edge as never, "sample", "t");
    expect(map?.period).toBeCloseTo(0.1, 12);
    expect(map?.t0).toBeCloseTo(5, 12);
  });

  it("refuses an edge that does not name both time axes", () => {
    const edge = {
      __typename: "ScaleTransformation",
      inputAxes: ["x"],
      outputAxes: ["t"],
      scale: [2],
    };
    expect(edgeToTimeMap(edge as never, "sample", "t")).toBeNull();
    expect(edgeToTimeMap(null, "sample", "t")).toBeNull();
  });
});
