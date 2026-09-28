import { describe, expect, it } from "vitest";
import { formatPixelSize, pixelSizeEntries, spatialPixelSizes } from "./pixelSize";

/**
 * A calibration's pixel size is displayed by pairing three differently-ordered
 * things (input-ordered `scale`, output-ordered axis names, units on the output
 * system). These tests pin the pairing — the display-side twin of the authoring
 * trap in forms/registration/mapping.test.ts.
 */

// The physical (y, x) system in micrometres.
const PHYSICAL = [
  { name: "y", unit: "µm", type: "SPACE" },
  { name: "x", unit: "µm", type: "SPACE" },
];

describe("pixelSizeEntries", () => {
  it("reads a SCALE edge's per-axis factors with their units", () => {
    const entries = pixelSizeEntries(
      { inputAxes: ["y", "x"], outputAxes: ["y", "x"], scale: [0.5, 0.25] },
      PHYSICAL,
    );

    expect(entries).toEqual([
      { axis: "y", value: 0.5, unit: "µm", type: "SPACE" },
      { axis: "x", value: 0.25, unit: "µm", type: "SPACE" },
    ]);
  });

  it("takes the label from the OUTPUT axis when a calibration renames", () => {
    // The edge maps intrinsic (row, col) onto physical (y, x). The units live
    // on y and x; looking "row" up among the physical axes would find nothing
    // and silently drop the unit.
    const entries = pixelSizeEntries(
      { inputAxes: ["row", "col"], outputAxes: ["y", "x"], scale: [0.5, 0.25] },
      PHYSICAL,
    );

    expect(entries).toEqual([
      { axis: "y", value: 0.5, unit: "µm", type: "SPACE" },
      { axis: "x", value: 0.25, unit: "µm", type: "SPACE" },
    ]);
  });

  it("does not mis-pair when a calibration swaps axes", () => {
    // Intrinsic y lands on physical x and vice versa. Pairing by position
    // through the edge keeps each number on the axis it actually belongs to;
    // looking the INPUT name up among the output axes would put 0.5 on y —
    // confidently, and wrongly.
    const entries = pixelSizeEntries(
      { inputAxes: ["y", "x"], outputAxes: ["x", "y"], scale: [0.5, 0.25] },
      PHYSICAL,
    );

    expect(entries).toEqual([
      { axis: "x", value: 0.5, unit: "µm", type: "SPACE" },
      { axis: "y", value: 0.25, unit: "µm", type: "SPACE" },
    ]);
  });

  it("reads an AFFINE calibration off the matrix diagonal", () => {
    // M x (N+1): rows output, columns input, last column the translation. The
    // pixel size is the diagonal; the offset is not part of it.
    const entries = pixelSizeEntries(
      {
        inputAxes: ["y", "x"],
        outputAxes: ["y", "x"],
        affine: [
          [0.5, 0, 10],
          [0, 0.25, -4],
        ],
      },
      PHYSICAL,
    );

    expect(entries).toEqual([
      { axis: "y", value: 0.5, unit: "µm", type: "SPACE" },
      { axis: "x", value: 0.25, unit: "µm", type: "SPACE" },
    ]);
  });

  it("returns nothing for an edge that encodes no per-axis size", () => {
    // A displacement field has no pixel size to state. Better to say nothing
    // than to invent a 1.
    expect(
      pixelSizeEntries({ inputAxes: ["y", "x"], outputAxes: ["y", "x"] }, PHYSICAL),
    ).toEqual([]);
    expect(pixelSizeEntries(null, PHYSICAL)).toEqual([]);
  });

  it("reports a null unit rather than guessing one", () => {
    const entries = pixelSizeEntries(
      { inputAxes: ["y"], outputAxes: ["y"], scale: [2] },
      [{ name: "y", unit: null, type: "SPACE" }],
    );

    expect(entries).toEqual([{ axis: "y", value: 2, unit: null, type: "SPACE" }]);
  });

  it("falls back to the input name only when the edge names no outputs", () => {
    const entries = pixelSizeEntries(
      { inputAxes: ["y"], scale: [0.5] },
      PHYSICAL,
    );

    expect(entries).toEqual([{ axis: "y", value: 0.5, unit: "µm", type: "SPACE" }]);
  });
});

describe("formatPixelSize", () => {
  it("renders an axis, its size and its unit", () => {
    expect(formatPixelSize({ axis: "x", value: 0.325, unit: "µm", type: "SPACE" })).toBe(
      "x 0.325 µm",
    );
  });

  it("omits a missing unit rather than printing null", () => {
    expect(formatPixelSize({ axis: "c", value: 1, unit: null, type: "CHANNEL" })).toBe("c 1");
  });
});

describe("pixelSizeEntries through a wrapper edge", () => {
  // What CalibrateForm authors: a BY_DIMENSION, which carries no parameters of
  // its own — the schema gives it `transformations` and nothing else.
  const axes = [
    { name: "z", unit: "µm", type: "SPACE" },
    { name: "y", unit: "µm", type: "SPACE" },
    { name: "x", unit: "µm", type: "SPACE" },
  ];

  it("unwraps children that each act on one axis", () => {
    expect(
      pixelSizeEntries(
        {
          inputAxes: ["z", "y", "x"],
          outputAxes: ["z", "y", "x"],
          transformations: [
            { inputAxes: ["z"], outputAxes: ["z"], scale: [0.5] },
            { inputAxes: ["y"], outputAxes: ["y"], scale: [0.1] },
            { inputAxes: ["x"], outputAxes: ["x"], scale: [0.1] },
          ],
        },
        axes,
      ),
    ).toEqual([
      { axis: "z", value: 0.5, unit: "µm", type: "SPACE" },
      { axis: "y", value: 0.1, unit: "µm", type: "SPACE" },
      { axis: "x", value: 0.1, unit: "µm", type: "SPACE" },
    ]);
  });

  it("reads in the wrapper's axis order, not the children's arrival order", () => {
    const entries = pixelSizeEntries(
      {
        inputAxes: ["z", "y", "x"],
        outputAxes: ["z", "y", "x"],
        transformations: [
          { inputAxes: ["x"], outputAxes: ["x"], scale: [0.1] },
          { inputAxes: ["z"], outputAxes: ["z"], scale: [0.5] },
        ],
      },
      axes,
    );
    expect(entries.map((entry) => entry.axis)).toEqual(["z", "x"]);
  });

  it("prefers the wrapper's own parameters when it has them", () => {
    // A leaf that also happens to carry children must not be double-read.
    expect(
      pixelSizeEntries(
        {
          inputAxes: ["x"],
          outputAxes: ["x"],
          scale: [2],
          transformations: [{ inputAxes: ["x"], outputAxes: ["x"], scale: [99] }],
        },
        [{ name: "x", unit: "µm", type: "SPACE" }],
      ),
    ).toEqual([{ axis: "x", value: 2, unit: "µm", type: "SPACE" }]);
  });

  it("keeps the first writer when children disagree about an axis", () => {
    expect(
      pixelSizeEntries(
        {
          outputAxes: ["x"],
          transformations: [
            { inputAxes: ["x"], outputAxes: ["x"], scale: [0.1] },
            { inputAxes: ["x"], outputAxes: ["x"], scale: [0.9] },
          ],
        },
        [{ name: "x", unit: "µm", type: "SPACE" }],
      ),
    ).toEqual([{ axis: "x", value: 0.1, unit: "µm", type: "SPACE" }]);
  });

  it("is still empty for a wrapper whose children carry no parameters", () => {
    expect(
      pixelSizeEntries(
        { outputAxes: ["x"], transformations: [{ inputAxes: ["x"], outputAxes: ["x"] }] },
        axes,
      ),
    ).toEqual([]);
  });
});

describe("spatialPixelSizes", () => {
  // A calibration edge scales EVERY axis it maps. The time step of a timelapse
  // and the bin width of a spectrum are real measurements, but they are not the
  // size of a pixel, and printing them under "Pixel size" claims a geometry
  // that is not there.
  const MIXED = [
    { name: "t", unit: "s", type: "TIME" },
    { name: "c", unit: "dimensionless", type: "CHANNEL" },
    { name: "z", unit: "µm", type: "SPACE" },
    { name: "y", unit: "µm", type: "SPACE" },
  ];

  it("keeps only the SPACE axes", () => {
    const entries = pixelSizeEntries(
      {
        inputAxes: ["t", "c", "z", "y"],
        outputAxes: ["t", "c", "z", "y"],
        scale: [0.5, 1, 0.3, 0.1],
      },
      MIXED,
    );

    expect(entries).toHaveLength(4);
    expect(spatialPixelSizes(entries)).toEqual([
      { axis: "z", value: 0.3, unit: "µm", type: "SPACE" },
      { axis: "y", value: 0.1, unit: "µm", type: "SPACE" },
    ]);
  });

  it("drops an axis the output system never typed", () => {
    // An unlabelled axis is not evidence of a spatial one.
    const entries = pixelSizeEntries(
      { inputAxes: ["q"], outputAxes: ["q"], scale: [1] },
      [{ name: "q", unit: "µm" }],
    );

    expect(entries).toEqual([{ axis: "q", value: 1, unit: "µm", type: null }]);
    expect(spatialPixelSizes(entries)).toEqual([]);
  });

  it("is empty rather than throwing when there is nothing to filter", () => {
    expect(spatialPixelSizes([])).toEqual([]);
  });
});
