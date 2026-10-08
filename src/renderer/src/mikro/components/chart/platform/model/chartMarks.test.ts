import { describe, expect, it } from "vitest";
import { chartMarkOf, chartMarksOf, isDrawingSurface, markSpaceOf, vectorOf } from "./chartMarks";

/** position = 10 + 2 · t */
const axisMap = { period: 2, t0: 10, total: true };
const surface = markSpaceOf(
  [
    { name: "t", type: "TIME" },
    { name: "value", type: "VALUE" },
  ],
  "t",
  axisMap,
)!;
const axisOnly = markSpaceOf([{ name: "t", type: "TIME" }], "t", axisMap)!;

describe("markSpaceOf", () => {
  it("finds the components by name and type, not by position", () => {
    const flipped = markSpaceOf(
      [
        { name: "value", type: "VALUE" },
        { name: "t", type: "TIME" },
      ],
      "t",
      axisMap,
    )!;
    expect(flipped.alongIndex).toBe(1);
    expect(flipped.valueIndex).toBe(0);
  });

  it("reads the declared order over the given one", () => {
    const space = markSpaceOf(
      [
        { name: "value", type: "VALUE", order: 1 },
        { name: "t", type: "TIME", order: 0 },
      ],
      "t",
      axisMap,
    )!;
    expect(space.alongIndex).toBe(0);
  });

  it("has nothing to draw for a space with no component along the chart", () => {
    expect(markSpaceOf([{ name: "x", type: "SPACE" }], "t", axisMap)).toBeNull();
    expect(markSpaceOf([{ name: "t" }], null, axisMap)).toBeNull();
    expect(markSpaceOf([{ name: "t" }], "t", null)).toBeNull();
  });

  it("is a drawing surface only with a VALUE axis", () => {
    expect(isDrawingSurface(surface)).toBe(true);
    expect(isDrawingSurface(axisOnly)).toBe(false);
  });
});

describe("chartMarkOf", () => {
  it("places points through the layer's map, at their height", () => {
    const mark = chartMarkOf({ id: "a", kind: "POINT", vectors: [[5, 0.3]] }, surface);
    expect(mark).toEqual({ shape: "dots", id: "a", points: [{ at: 20, value: 0.3 }] });
  });

  it("draws a rectangle from its two corners and an ellipse in its box", () => {
    const corners = [
      [0, 1],
      [5, 3],
    ];
    const rect = chartMarkOf({ id: "r", kind: "RECTANGLE", vectors: corners }, surface);
    expect(rect).toMatchObject({
      shape: "polygon",
      points: [
        { at: 10, value: 1 },
        { at: 20, value: 1 },
        { at: 20, value: 3 },
        { at: 10, value: 3 },
      ],
    });
    expect(chartMarkOf({ id: "e", kind: "ELLIPSE", vectors: corners }, surface)).toMatchObject({
      shape: "ellipse",
      from: { at: 10, value: 1 },
      to: { at: 20, value: 3 },
    });
  });

  it("reduces a mark with no height to its extent along the axis", () => {
    expect(chartMarkOf({ id: "i", kind: "POINT", vectors: [[5]] }, axisOnly)).toEqual({
      shape: "instant",
      id: "i",
      at: 20,
    });
    expect(chartMarkOf({ id: "s", kind: "LINE", vectors: [[5], [1]] }, axisOnly)).toEqual({
      shape: "span",
      id: "s",
      from: 12,
      to: 20,
    });
  });

  it("has nowhere to draw a volume", () => {
    expect(chartMarkOf({ id: "c", kind: "CUBE", vectors: [[0, 0], [1, 1]] }, surface)).toBeNull();
  });
});

describe("chartMarksOf", () => {
  it("draws a heightless click set as its instants", () => {
    const marks = chartMarksOf([{ id: "m", kind: "MULTI_POINT", vectors: [[1], [2]] }], axisOnly);
    expect(marks).toEqual([
      { shape: "instant", id: "m:0", at: 12 },
      { shape: "instant", id: "m:1", at: 14 },
    ]);
  });
});

describe("vectorOf", () => {
  it("is the inverse of the read: a drawn point round-trips", () => {
    const vector = vectorOf({ at: 20, value: 0.3 }, surface as never, 2);
    expect(vector).toEqual([5, 0.3]);
    expect(chartMarkOf({ id: "a", kind: "POINT", vectors: [vector] }, surface)).toMatchObject({
      points: [{ at: 20, value: 0.3 }],
    });
  });
});
