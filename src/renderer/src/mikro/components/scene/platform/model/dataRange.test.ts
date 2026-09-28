import { describe, expect, it } from "vitest";
import { dtypeRangeIsWeakProxy, resolveLayerDataRange, serverHistogramRange } from "./dataRange";
import type { ImageLayerFragment } from "./layerGuards";

const layerWith = (histogram: { min: number; max: number } | null) =>
  ({
    lens: {
      activeAnchors: histogram
        ? [{ valueHistogram: { min: histogram.min, max: histogram.max } }]
        : [{ valueHistogram: null }],
    },
  }) as unknown as ImageLayerFragment;

/** A layer whose anchors are per-channel, each carrying its own histogram. */
const layerWithAnchors = (histograms: ({ min: number; max: number } | null)[]) =>
  ({
    lens: {
      activeAnchors: histograms.map((h) => ({ valueHistogram: h })),
    },
  }) as unknown as ImageLayerFragment;

describe("resolveLayerDataRange", () => {
  it("uses the value histogram range for float data (dtype range is a poor proxy)", () => {
    expect(resolveLayerDataRange(layerWith({ min: 0, max: 255 }), "float32")).toEqual([0, 255]);
    expect(resolveLayerDataRange(layerWith({ min: -2, max: 6 }), "float64")).toEqual([-2, 6]);
  });

  it("falls back to the dtype range for float data without a usable histogram", () => {
    expect(resolveLayerDataRange(layerWith(null), "float32")).toEqual([0, 1]);
    // Degenerate (min === max) histograms are ignored.
    expect(resolveLayerDataRange(layerWith({ min: 5, max: 5 }), "float32")).toEqual([0, 1]);
  });

  it("keeps the dtype range for uint8/uint16 even when a histogram exists", () => {
    expect(resolveLayerDataRange(layerWith({ min: 10, max: 200 }), "uint8")).toEqual([0, 255]);
    expect(resolveLayerDataRange(layerWith({ min: 0, max: 4095 }), "uint16")).toEqual([0, 65535]);
  });

  // A signed dtype range is centred on zero, so ordinary 0..4000 data would
  // normalize into [0.500, 0.561] — flat mid-gray, raw 0 no longer reading as
  // background. The histogram is the escape hatch; auto-range covers its absence.
  it("uses the value histogram range for signed and wide integer data", () => {
    expect(resolveLayerDataRange(layerWith({ min: 0, max: 4000 }), "int16")).toEqual([0, 4000]);
    expect(resolveLayerDataRange(layerWith({ min: -500, max: 500 }), "int8")).toEqual([-500, 500]);
    expect(resolveLayerDataRange(layerWith({ min: 0, max: 9 }), "int32")).toEqual([0, 9]);
    expect(resolveLayerDataRange(layerWith({ min: 0, max: 9 }), "uint32")).toEqual([0, 9]);
  });

  it("falls back to the dtype range for signed data without a usable histogram", () => {
    expect(resolveLayerDataRange(layerWith(null), "int16")).toEqual([-32768, 32767]);
  });

  it("tolerates a missing lens/anchors and falls back to the dtype range", () => {
    expect(resolveLayerDataRange({} as ImageLayerFragment, "float32")).toEqual([0, 1]);
  });
});

describe("serverHistogramRange", () => {
  // Anchors are per-coordinate ({c: 0}, {c: 1}, …). Taking only the first would
  // stand channel 0's range in for the whole pool and clip every brighter
  // channel to blown-out white.
  it("unions every anchor's histogram rather than taking the first", () => {
    const layer = layerWithAnchors([
      { min: 0, max: 500 },
      { min: -20, max: 30000 },
    ]);
    expect(serverHistogramRange(layer)).toEqual([-20, 30000]);
    expect(resolveLayerDataRange(layer, "int16")).toEqual([-20, 30000]);
  });

  it("skips anchors with absent or degenerate histograms", () => {
    expect(
      serverHistogramRange(
        layerWithAnchors([null, { min: 7, max: 7 }, { min: 1, max: 9 }]),
      ),
    ).toEqual([1, 9]);
  });

  it("is null when no anchor carries a usable histogram", () => {
    expect(serverHistogramRange(layerWithAnchors([null, { min: 7, max: 7 }]))).toBeNull();
    expect(serverHistogramRange({} as ImageLayerFragment)).toBeNull();
  });
});

describe("dtypeRangeIsWeakProxy", () => {
  it("covers floats, signed integers and uint32 — but not uint8/uint16", () => {
    for (const dtype of ["float32", "float64", "int8", "int16", "int32", "uint32"]) {
      expect(dtypeRangeIsWeakProxy(dtype)).toBe(true);
    }
    for (const dtype of ["uint8", "uint16", "bool"]) {
      expect(dtypeRangeIsWeakProxy(dtype)).toBe(false);
    }
  });

  it("matches numpy-style aliases too (the dtype string is not canonicalized)", () => {
    for (const dtype of ["<i2", "|i1", "<i4", "<u4", "<f4", ">f8"]) {
      expect(dtypeRangeIsWeakProxy(dtype)).toBe(true);
    }
    for (const dtype of ["|u1", "<u2"]) {
      expect(dtypeRangeIsWeakProxy(dtype)).toBe(false);
    }
  });
});
