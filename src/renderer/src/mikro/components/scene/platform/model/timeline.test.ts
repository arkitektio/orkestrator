import { describe, expect, it } from "vitest";
import { distinctAscending, indexRows, resolveTimeline } from "./timeline";

describe("distinctAscending", () => {
  it("is the observed timeline: distinct, sorted, however the rows were ordered", () => {
    expect(Array.from(distinctAscending([30, 10, 20, 10, 30]))).toEqual([10, 20, 30]);
  });

  it("drops non-finite entries rather than sorting NaN into the timeline", () => {
    expect(Array.from(distinctAscending([1, NaN, 2, Infinity]))).toEqual([1, 2]);
  });

  it("sorts NUMERICALLY — the default sort would order 10 before 9", () => {
    expect(Array.from(distinctAscending([9, 10, 100]))).toEqual([9, 10, 100]);
  });
});

describe("indexRows", () => {
  /**
   * The property the whole scheme rests on: a scrubber counts OBSERVATIONS, not
   * the column's own units. An unevenly sampled table still scrubs one frame per
   * step, which is what lets it share a slider with an image's t axis.
   */
  it("maps a row to its position in the timeline, not to its raw t", () => {
    const timeline = distinctAscending([0, 5, 100]);
    expect(Array.from(indexRows([100, 0, 5], timeline))).toEqual([2, 0, 1]);
  });

  it("puts a row with no place in the timeline at the start, not at NaN", () => {
    // Drawn at the beginning rather than never — the same choice the coordinate
    // reads make when they refuse rather than silently drop rows.
    expect(Array.from(indexRows([NaN], distinctAscending([1, 2])))).toEqual([0]);
  });
});

describe("resolveTimeline", () => {
  it("returns both halves from one pass", () => {
    const resolved = resolveTimeline([2, 1, 2]);
    expect(Array.from(resolved!.timeline)).toEqual([1, 2]);
    expect(Array.from(resolved!.rowIndices)).toEqual([1, 0, 1]);
  });

  it("is null for an absent column: an untimed layer publishes no extent", () => {
    expect(resolveTimeline(null)).toBeNull();
    expect(resolveTimeline(undefined)).toBeNull();
  });

  it("is null when a column exists but holds no finite time", () => {
    expect(resolveTimeline([NaN, NaN])).toBeNull();
  });
});
