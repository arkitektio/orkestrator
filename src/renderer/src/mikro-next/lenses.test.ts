import { describe, expect, it } from "vitest";
import { slicesFromDrafts } from "./lenses";

const AXES = ["c", "y", "x"];
const SHAPE = [3, 512, 512];
const blank = { start: "", stop: "", step: "" };

describe("slicesFromDrafts", () => {
  it("drops untouched and whole-extent rows, so nothing cut is the full lens", () => {
    expect(
      slicesFromDrafts(AXES, SHAPE, {
        c: blank,
        y: { start: "0", stop: "512", step: "1" },
      }),
    ).toEqual({ ok: true, slices: [] });
  });

  it("keeps only the bounds that were typed", () => {
    expect(
      slicesFromDrafts(AXES, SHAPE, {
        c: { start: "", stop: "2", step: "" },
        x: { start: "100", stop: "", step: "2" },
      }),
    ).toEqual({
      ok: true,
      slices: [
        { axis: "c", stop: 2 },
        { axis: "x", start: 100, step: 2 },
      ],
    });
  });

  it("reports per-axis errors instead of sending a bad slice", () => {
    const result = slicesFromDrafts(AXES, SHAPE, {
      c: { start: "", stop: "4", step: "" },
      y: { start: "10", stop: "5", step: "" },
      x: { start: "a", stop: "", step: "" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["c", "x", "y"]);
  });

  it("rejects a zero step", () => {
    expect(slicesFromDrafts(AXES, SHAPE, { x: { start: "", stop: "", step: "0" } }).ok).toBe(false);
  });
});
