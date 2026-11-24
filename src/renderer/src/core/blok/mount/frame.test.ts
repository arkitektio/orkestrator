import { describe, expect, it } from "vitest";
import { plotMap, stageMatrix } from "./frame";
import { fold } from "./steps";

const rounded = (rows: number[][]) => rows.map((row) => row.map((v) => Number(v.toPrecision(6))));

describe("mount placement", () => {
  it("folds mikro steps through renamed axes onto the output, in input order", () => {
    // (row, col) in µm → scaled, then mapped onto (y, x), then shifted.
    const affine = fold(
      [
        { kind: "SCALE", scale: [2, 3] },
        { kind: "MAP_AXIS", inputAxes: ["row", "col"], outputAxes: ["y", "x"] },
        { kind: "BY_DIMENSION", parts: [{ kind: "TRANSLATION", inputAxes: ["x"], outputAxes: ["x"], translation: [10] }, { kind: "IDENTITY", inputAxes: ["y"], outputAxes: ["y"] }] },
      ],
      ["row", "col"],
      ["x", "y"],
    );
    expect(affine.m).toEqual([
      [0, 3, 10],
      [2, 0, 0],
    ]);
  });

  it("stands a µm camera frame on the stage in meters, Y up, and converts a plot's unit", () => {
    const frame = { axes: [{ name: "y", type: "SPACE", unit: "µm" }, { name: "x", type: "SPACE", unit: "µm" }] };
    const { rows, error } = stageMatrix(frame, { kind: "TRANSLATION", translation: [50, 100] });
    expect(error).toBeNull();
    // Local (x, y) = (0, 0) is y=50 µm, x=100 µm: stage x 1e-4 m, z = −y.
    expect(rounded(rows).map((row) => row[3])).toEqual([1e-4, 0, -5e-5, 1]);

    const wavelength = { name: "wavelength", type: "SPECTRUM", unit: "nm" };
    const map = plotMap(wavelength, { name: "wavelength", unit: "µm" }, { kind: "SCALE", scale: [2] });
    expect(map.error).toBeNull();
    expect(map.scale).toBeCloseTo(2e-3, 12);
    expect(plotMap(wavelength, { name: "shift", unit: "1/cm" }).error).toMatch(/does not convert/);
  });
});
