import { describe, expect, it } from "vitest";

import { DEFAULT_SPLIT_RATIO, MAX_SPLIT_RATIO, MIN_SPLIT_RATIO, ratioForSide } from "./splitRatio";

describe("ratioForSide", () => {
  it("leaves the left pane what the side pane does not take", () => {
    expect(ratioForSide("tiny")).toBeCloseTo(4 / 5);
    expect(ratioForSide("narrow")).toBeCloseTo(2 / 3);
    expect(ratioForSide("half")).toBe(0.5);
    expect(ratioForSide("wide")).toBeCloseTo(1 / 3);
    expect(ratioForSide(0.25)).toBe(0.75);
  });

  it("stays within what the divider allows", () => {
    expect(ratioForSide(0.05)).toBe(MAX_SPLIT_RATIO);
    expect(ratioForSide(0.95)).toBe(MIN_SPLIT_RATIO);
  });

  it("falls back to an even split for a share that is not a number", () => {
    expect(ratioForSide(Number.NaN)).toBe(DEFAULT_SPLIT_RATIO);
  });
});
