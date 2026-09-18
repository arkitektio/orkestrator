import { describe, expect, it } from "vitest";
import { selectionForAxes } from "./axisSelection";

describe("selectionForAxes", () => {
  it("reads everything when nothing is restricted", () => {
    expect(selectionForAxes(["t"], {})).toEqual([null]);
    expect(selectionForAxes(["c", "t"], {})).toEqual([null, null]);
  });

  it("puts a restriction on the axis the store actually has it at", () => {
    // The point of resolving by name: the SAME selection must land in different
    // positions for the two legal axis orders, or a (c, t) dataset gets read as
    // though it were (t, c) and returns plausible nonsense.
    const selection = { t: { start: 10, stop: 20 } };

    expect(selectionForAxes(["t", "c"], selection)).toEqual([
      { start: 10, stop: 20 },
      null,
    ]);
    expect(selectionForAxes(["c", "t"], selection)).toEqual([
      null,
      { start: 10, stop: 20 },
    ]);
  });

  it("carries the stride through", () => {
    expect(selectionForAxes(["t"], { t: { step: 64 } })).toEqual([{ step: 64 }]);
  });

  it("restricts several axes at once", () => {
    expect(
      selectionForAxes(["c", "t"], {
        c: { start: 2, stop: 6 },
        t: { start: 0, stop: 1000, step: 8 },
      }),
    ).toEqual([
      { start: 2, stop: 6 },
      { start: 0, stop: 1000, step: 8 },
    ]);
  });

  it("throws on an axis the dataset does not have", () => {
    // Ignoring it would read the full extent of the axis the caller meant to
    // restrict — a wrong window that looks like data.
    expect(() => selectionForAxes(["t"], { z: { start: 1 } })).toThrow(
      /Axis "z" is not one of \[t\]/,
    );
  });
});
