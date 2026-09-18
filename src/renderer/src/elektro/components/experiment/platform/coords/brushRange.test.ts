import { describe, expect, it } from "vitest";
import {
  DEFAULT_RANGE,
  areRangesEqual,
  clampToWorld,
  encodeBrushRange,
  normalizeRange,
  parseBrushRange,
} from "./brushRange";

describe("parseBrushRange", () => {
  it("parses a well-formed window", () => {
    expect(parseBrushRange("100:500")).toEqual({ left: 100, right: 500 });
  });

  it("falls back to the default rather than throwing on junk", () => {
    // A bad URL must still open the experiment.
    for (const raw of [null, "", "abc", "100", "100:", ":500", "100:abc"]) {
      expect(parseBrushRange(raw)).toEqual(DEFAULT_RANGE);
    }
  });

  it("rejects an inverted or empty window", () => {
    expect(parseBrushRange("500:100")).toEqual(DEFAULT_RANGE);
    expect(parseBrushRange("100:100")).toEqual(DEFAULT_RANGE);
  });

  it("floors a negative start at zero", () => {
    expect(parseBrushRange("-50:500")).toEqual({ left: 0, right: 500 });
  });
});

describe("encodeBrushRange", () => {
  it("round-trips a real window", () => {
    const range = { left: 100, right: 500 };
    expect(parseBrushRange(encodeBrushRange(range))).toEqual(range);
  });

  it("drops the param for a full-extent view, so the clean URL is the default", () => {
    expect(encodeBrushRange({ left: 0, right: null })).toBeNull();
    expect(encodeBrushRange({ left: 100, right: 100 })).toBeNull();
    expect(encodeBrushRange({ left: 100, right: 50 })).toBeNull();
  });

  it("treats a null left as zero", () => {
    expect(encodeBrushRange({ left: null, right: 500 })).toBe("0:500");
  });
});

describe("normalizeRange / areRangesEqual", () => {
  it("fills nulls from the default", () => {
    expect(normalizeRange(undefined)).toEqual(DEFAULT_RANGE);
    expect(normalizeRange({ left: null, right: 5 })).toEqual({
      left: 0,
      right: 5,
    });
  });

  it("compares by value", () => {
    expect(areRangesEqual({ left: 1, right: 2 }, { left: 1, right: 2 })).toBe(
      true,
    );
    expect(areRangesEqual({ left: 1, right: 2 }, { left: 1, right: 3 })).toBe(
      false,
    );
  });
});

describe("clampToWorld", () => {
  const world = { start: 0, end: 5000 };

  it("leaves a window that already fits alone", () => {
    expect(clampToWorld({ left: 100, right: 500 }, world)).toEqual({
      left: 100,
      right: 500,
    });
  });

  it("makes an inherited sample-index link harmless", () => {
    // The whole point: `0:2000000` was 2M samples, and is now 2000 s of world
    // time against a 5 s world. Show everything rather than empty space.
    expect(clampToWorld({ left: 0, right: 2_000_000 }, world)).toEqual({
      left: 0,
      right: 5000,
    });
  });

  it("falls back to the full extent when the window misses the world", () => {
    expect(clampToWorld({ left: 90_000, right: 95_000 }, world)).toEqual({
      left: 0,
      right: 5000,
    });
  });

  it("resolves nulls against the world's own bounds", () => {
    expect(clampToWorld({ left: null, right: null }, world)).toEqual({
      left: 0,
      right: 5000,
    });
  });

  it("respects a world that does not start at zero", () => {
    const shifted = { start: 1000, end: 2000 };
    expect(clampToWorld({ left: 0, right: 1500 }, shifted)).toEqual({
      left: 1000,
      right: 1500,
    });
  });

  it("gives the default for a degenerate world rather than an inverted range", () => {
    expect(clampToWorld({ left: 1, right: 2 }, { start: 5, end: 5 })).toEqual(
      DEFAULT_RANGE,
    );
  });
});
