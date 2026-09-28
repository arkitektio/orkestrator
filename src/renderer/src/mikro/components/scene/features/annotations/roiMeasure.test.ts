import { describe, expect, it } from "vitest";
import {
  formatAnnotationMeasure,
  formatDrawMeasure,
  formatSceneLength,
  measureAnnotation,
  measureDraw,
  polygonArea,
} from "./roiMeasure";
import { unitLabel, UNIT_LABELS } from "../../platform/coords/sceneUnits";

/**
 * The readout is rewritten on every pointer move, so its formatting has to be
 * stable: a number that flips between 2 and 3 decimals as you drag reads as
 * flicker. The ladder below is pinned by example for that reason.
 */

describe("measureDraw", () => {
  it("reports width and height for box-like tools, however the drag ran", () => {
    const forward = measureDraw("RECTANGLE", [{ x: 0, y: 0 }, { x: 10, y: 4 }]);
    const backward = measureDraw("RECTANGLE", [{ x: 10, y: 4 }, { x: 0, y: 0 }]);

    expect(forward).toEqual({ kind: "box", width: 10, height: 4 });
    expect(backward).toEqual(forward);
  });

  it("measures an ellipse by its bounding box", () => {
    expect(measureDraw("ELLIPSE", [{ x: 0, y: 0 }, { x: 6, y: 8 }])).toEqual({
      kind: "box",
      width: 6,
      height: 8,
    });
  });

  it("reports length for a line", () => {
    expect(measureDraw("LINE", [{ x: 0, y: 0 }, { x: 3, y: 4 }])).toEqual({
      kind: "length",
      length: 5,
    });
  });

  it("sums the segments of a path and counts its vertices", () => {
    const measure = measureDraw("PATH", [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 14 },
    ]);
    expect(measure).toEqual({ kind: "path", length: 15, vertexCount: 3 });
  });

  it("has nothing to say about a point, or about a shape not yet begun", () => {
    expect(measureDraw("POINT", [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBeNull();
    expect(measureDraw("RECTANGLE", [{ x: 0, y: 0 }])).toBeNull();
  });
});

describe("formatSceneLength", () => {
  it.each([
    [1234.5, "1235"],
    [100, "100"],
    [12.34, "12.3"],
    [1.234, "1.23"],
    [0.04321, "0.0432"],
    [0, "0"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatSceneLength(value)).toBe(expected);
  });
});

describe("formatDrawMeasure", () => {
  it("uses a real multiplication sign, not the letter x", () => {
    const label = formatDrawMeasure({ kind: "box", width: 120, height: 84 }, "µm");
    // 84 sits in the one-decimal band, so it reads "84.0". Keeping the trailing
    // zero is the point of the ladder: stripping it would make the label's width
    // jump around as you drag, which is exactly the flicker we're avoiding.
    expect(label).toBe("120 × 84.0 µm");
    expect(label).toContain("×");
  });

  it("labels a length and a path", () => {
    expect(formatDrawMeasure({ kind: "length", length: 148 }, "µm")).toBe("148 µm");
    expect(
      formatDrawMeasure({ kind: "path", length: 312, vertexCount: 7 }, "nm"),
    ).toBe("7 pts · 312 nm");
  });

  it("says nothing when there is nothing to measure", () => {
    expect(formatDrawMeasure(null, "µm")).toBeNull();
  });
});

describe("polygonArea", () => {
  it("measures a unit square regardless of winding", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(polygonArea(square)).toBe(1);
    expect(polygonArea([...square].reverse())).toBe(1);
  });

  it("measures a triangle", () => {
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 3 },
      ]),
    ).toBe(6);
  });
});

describe("measureAnnotation", () => {
  it("headlines a POLYGON by its area", () => {
    const measure = measureAnnotation("POLYGON", [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    expect(measure).toEqual({ kind: "area", area: 100, vertexCount: 4 });
    expect(formatAnnotationMeasure(measure, "µm")).toBe("100 µm²");
  });

  it("headlines a rectangle by its box and the area it encloses", () => {
    const measure = measureAnnotation("RECTANGLE", [{ x: 0, y: 0 }, { x: 10, y: 4 }]);
    expect(measure).toEqual({ kind: "boxArea", width: 10, height: 4, area: 40 });
    expect(formatAnnotationMeasure(measure, "µm")).toBe("10.0 × 4.00 µm · 40.0 µm²");
  });

  it("headlines an ellipse by the ELLIPSE's area, not its bounding box's", () => {
    const measure = measureAnnotation("ELLIPSE", [{ x: 0, y: 0 }, { x: 6, y: 8 }]);
    expect(measure).toEqual({
      kind: "boxArea",
      width: 6,
      height: 8,
      area: (Math.PI / 4) * 6 * 8, // π·a·b with a=3, b=4
    });
  });

  it("headlines a SPHERE by its radius and volume — not a bare length", () => {
    const measure = measureAnnotation("SPHERE", [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    expect(measure).toEqual({
      kind: "sphere",
      radius: 5,
      volume: (4 / 3) * Math.PI * 125,
    });
    expect(formatAnnotationMeasure(measure, "µm")).toBe("r 5.00 µm · 524 µm³");
  });

  it("headlines a CUBE by its side and volume", () => {
    const measure = measureAnnotation("CUBE", [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    expect(measure).toEqual({ kind: "cube", side: 10, volume: 1000 });
    expect(formatAnnotationMeasure(measure, "µm")).toBe("10.0 µm · 1000 µm³");
  });

  it("reuses the drawing conventions where length IS the feature", () => {
    expect(
      measureAnnotation("LINE", [{ x: 0, y: 0 }, { x: 3, y: 4 }]),
    ).toEqual({ kind: "length", length: 5 });
  });

  it("says nothing for unmeasurable kinds or too few points", () => {
    expect(measureAnnotation("POINT", [{ x: 0, y: 0 }])).toBeNull();
    expect(measureAnnotation("SLICE", [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBeNull();
    expect(measureAnnotation("POLYGON", [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual({
      kind: "path",
      length: Math.hypot(1, 1),
      vertexCount: 2,
    });
    expect(formatAnnotationMeasure(null, "µm")).toBeNull();
  });
});

describe("unitLabel", () => {
  it("maps the known server enums to symbols", () => {
    expect(unitLabel("MICROMETERS")).toBe("µm");
    expect(unitLabel("NANOMETERS")).toBe("nm");
    expect(unitLabel("UNKNOWN")).toBe("units");
  });

  // The scale bar has always fallen through to the raw string; keep that, so a
  // new server unit shows up as itself rather than disappearing.
  it("passes an unrecognised unit through verbatim", () => {
    expect(unitLabel("PARSECS")).toBe("PARSECS");
    expect(UNIT_LABELS.PARSECS).toBeUndefined();
  });
});
