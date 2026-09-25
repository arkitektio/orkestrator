import { describe, expect, it } from "vitest";
import { layerPlanSignature, layersPlanKey, sameLayerElements } from "./layerPlanKey";
import type { LayerState } from "./layerModel";

/** The shared lens object — identity matters: the signature captures it via
 * `identityOf`, exactly as the store's spread-preserving edits do. */
const lens = {
  axisNames: ["t", "c", "z", "y", "x"],
  shape: [10, 4, 36, 1024, 1024],
  slices: [],
  dataset: { dataArrays: [{ id: "a0" }], axisNames: ["t", "c", "z", "y", "x"] },
};

const makeLayer = (overrides?: Partial<Record<string, unknown>>): LayerState =>
  ({
    id: "layer-1",
    __typename: "ImageLayer",
    visible: true,
    xAxis: "x",
    yAxis: "y",
    zAxis: "z",
    intensityAxis: "c",
    phasorAxis: null,
    phasors: [],
    affineMatrix: [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ],
    fixedLOD: null,
    lens,
    channels: [{ type: "channel", intensityIndex: 0, transfer: { climMin: 0, climMax: 100 } }],
    sources: [{ type: "channel", intensityIndex: 0, transfer: { climMin: 0, climMax: 100 } }],
    climMin: 0,
    climMax: 100,
    ...overrides,
  }) as unknown as LayerState;

describe("layerPlanSignature", () => {
  it("is cached per layer object (same object → the identical string)", () => {
    const layer = makeLayer();
    expect(layerPlanSignature(layer)).toBe(layerPlanSignature(layer));
  });

  it("ignores a window-only replacement — the exact pushChannels shape", () => {
    const layer = makeLayer();
    // pushChannels builds a WHOLE new layer: fresh channels/sources arrays,
    // moved flat clim/colormap/gamma fields — and spreads everything else,
    // lens reference included. None of that is a planning input.
    const dragged = makeLayer({
      channels: [{ type: "channel", intensityIndex: 0, transfer: { climMin: 5, climMax: 60 } }],
      sources: [{ type: "channel", intensityIndex: 0, transfer: { climMin: 5, climMax: 60 } }],
      climMin: 5,
      climMax: 60,
      gamma: 1.4,
      colormap: "MAGMA",
    });
    expect(layerPlanSignature(dragged)).toEqual(layerPlanSignature(layer));
    expect(layersPlanKey([dragged])).toEqual(layersPlanKey([layer]));
  });

  it("moves on every planning input", () => {
    const base = layerPlanSignature(makeLayer());
    expect(layerPlanSignature(makeLayer({ visible: false }))).not.toEqual(base);
    expect(layerPlanSignature(makeLayer({ fixedLOD: 2 }))).not.toEqual(base);
    expect(layerPlanSignature(makeLayer({ intensityAxis: "t" }))).not.toEqual(base);
    expect(
      layerPlanSignature(
        makeLayer({
          affineMatrix: [
            [2, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
          ],
        }),
      ),
    ).not.toEqual(base);
    expect(
      layerPlanSignature(makeLayer({ phasors: [{ harmonic: 2, intensityIndex: 0 }] })),
    ).not.toEqual(base);
    // A NEW lens object is a new identity — anchors, arrays and shape all
    // arrive as a fresh lens, so identity is the change signal.
    expect(layerPlanSignature(makeLayer({ lens: { ...lens } }))).not.toEqual(base);
  });
});

describe("sameLayerElements", () => {
  it("distinguishes a touch republish from a real element replacement", () => {
    const a = makeLayer();
    const b = makeLayer({ id: "layer-2" });
    // touchImageLayers: identical elements, fresh array — the replan request.
    expect(sameLayerElements([a, b], [a, b])).toBe(true);
    // updateLayer: one element replaced.
    expect(sameLayerElements([a, b], [a, makeLayer({ id: "layer-2" })])).toBe(false);
    expect(sameLayerElements([a, b], [b, a])).toBe(false);
    expect(sameLayerElements([a], [a, b])).toBe(false);
  });
});
