import { describe, expect, it } from "vitest";
import {
  traceChannelSlab,
  traceFailureMessage,
  traceLayerShape,
  traceLevelSteps,
  type TraceLayerShape,
} from "./traceLayer";

/** A c/t/z/y/x layer whose pyramid the test supplies. */
const layerWith = (
  dataArrays: { level: number; shape: number[] }[],
  overrides: Partial<TraceLayerShape> = {},
): TraceLayerShape => ({
  xAxis: "x",
  yAxis: "y",
  zAxis: "z",
  lens: { dataset: { axisNames: ["c", "t", "z", "y", "x"], dataArrays } },
  ...overrides,
});

/** 512x512x64 base, xy-only pyramid — the common microscopy shape. */
const xyPyramid = () =>
  layerWith([
    { level: 0, shape: [3, 10, 64, 512, 512] },
    { level: 1, shape: [3, 10, 64, 256, 256] },
    { level: 2, shape: [3, 10, 64, 128, 128] },
  ]);

describe("traceChannelSlab", () => {
  const withChannels = (channels: { intensityIndex: number; visible: boolean }[]) => ({
    channels,
  });

  it("is the first VISIBLE channel's intensity index, not its position", () => {
    // Slabs are laid out one per intensity index (`levelGeometry`), so a layer
    // rendering channels 2 and 5 must read slab 2 — position 0 would silently
    // trace channel 0, which is not on screen at all.
    expect(
      traceChannelSlab(
        withChannels([
          { intensityIndex: 2, visible: true },
          { intensityIndex: 5, visible: true },
        ]),
      ),
    ).toBe(2);
  });

  it("skips hidden channels — the trace follows what the user can see", () => {
    expect(
      traceChannelSlab(
        withChannels([
          { intensityIndex: 0, visible: false },
          { intensityIndex: 3, visible: true },
        ]),
      ),
    ).toBe(3);
  });

  it("falls back to slab 0 rather than refusing to trace", () => {
    expect(traceChannelSlab(withChannels([{ intensityIndex: 4, visible: false }]))).toBe(0);
    expect(traceChannelSlab(withChannels([]))).toBe(0);
  });
});

describe("traceLayerShape", () => {
  it("reads the level-0 extent in render-axis order", () => {
    expect(traceLayerShape(xyPyramid())).toEqual([512, 512, 64]);
  });

  it("takes level 0 even when the pyramid is listed out of order", () => {
    const layer = layerWith([
      { level: 2, shape: [3, 10, 64, 128, 128] },
      { level: 0, shape: [3, 10, 64, 512, 512] },
    ]);
    expect(traceLayerShape(layer)).toEqual([512, 512, 64]);
  });

  it("is one slab deep without a z axis — the flat case, not an error", () => {
    const flat = layerWith([{ level: 0, shape: [3, 10, 512, 512] }], {
      zAxis: null,
      lens: {
        dataset: {
          axisNames: ["c", "t", "y", "x"],
          dataArrays: [{ level: 0, shape: [3, 10, 512, 512] }],
        },
      },
    });
    expect(traceLayerShape(flat)).toEqual([512, 512, 1]);
  });

  it("declines a layer with no planar axes — there is no lattice to search", () => {
    expect(traceLayerShape(layerWith([{ level: 0, shape: [1] }], { xAxis: null }))).toBeNull();
    expect(traceLayerShape(layerWith([]))).toBeNull();
  });
});

describe("traceLevelSteps", () => {
  it("leaves z alone for an xy-only pyramid", () => {
    // The anisotropy trap: assuming 2**level would step z by 4 at level 2 and
    // walk straight past three untouched slices out of every four.
    expect(traceLevelSteps(xyPyramid())).toEqual([
      [1, 1, 1],
      [2, 2, 1],
      [4, 4, 1],
    ]);
  });

  it("reports isotropic coarsening when the pyramid really is isotropic", () => {
    const layer = layerWith([
      { level: 0, shape: [3, 10, 64, 512, 512] },
      { level: 1, shape: [3, 10, 32, 256, 256] },
    ]);
    expect(traceLevelSteps(layer)).toEqual([
      [1, 1, 1],
      [2, 2, 2],
    ]);
  });

  it("drops duplicate resolutions — they buy no coarsening", () => {
    const layer = layerWith([
      { level: 0, shape: [3, 10, 64, 512, 512] },
      { level: 1, shape: [3, 10, 64, 512, 512] },
      { level: 2, shape: [3, 10, 64, 256, 256] },
    ]);
    expect(traceLevelSteps(layer)).toEqual([
      [1, 1, 1],
      [2, 2, 1],
    ]);
  });

  it("always offers at least the finest level", () => {
    expect(traceLevelSteps(layerWith([]))).toEqual([[1, 1, 1]]);
    expect(traceLevelSteps(layerWith([{ level: 0, shape: [3, 10, 64, 512, 512] }]))).toEqual([
      [1, 1, 1],
    ]);
  });
});

describe("traceFailureMessage", () => {
  it("says something distinct for every way a hop can fail", () => {
    const reasons = [
      "blocked-endpoint",
      "unreachable",
      "budget",
      "layer-changed",
      "no-layer",
    ] as const;
    const messages = reasons.map(traceFailureMessage);
    expect(new Set(messages).size).toBe(reasons.length);
    for (const message of messages) expect(message.length).toBeGreaterThan(0);
  });
});
