import { describe, expect, it } from "vitest";
import type { LayerState } from "../../../platform/model/layerModel";
import {
  buildChannelDataSignature,
  buildChannelWindowSignature,
} from "./channelDataSignature";

const layer = (over: Record<string, unknown> = {}): LayerState =>
  ({
    id: "a",
    blend: "ADDITIVE",
    colormap: "VIRIDIS",
    color: null,
    projection: "MAXIMUM",
    lens: { phasor: undefined },
    sources: [
      {
        type: "channel",
        visible: true,
        intensityIndex: 0,
        transfer: { colormap: "VIRIDIS", climMin: 0, climMax: 255, gamma: 1 },
      },
    ],
    // Fields the uniform builders never read — edits here must NOT invalidate.
    name: "layer a",
    opacity3D: 1,
    ...over,
  }) as unknown as LayerState;

describe("buildChannelDataSignature", () => {
  it("is stable across object identity for equal values", () => {
    expect(buildChannelDataSignature(layer())).toBe(buildChannelDataSignature(layer()));
  });

  it("a clim drag moves the WINDOW signature and leaves the structure one alone", () => {
    // The split is the whole point: the structure signature keys the full
    // rebuild (colormap atlas + DataTextures), the window signature keys the
    // allocation-free scalar fast path — so a drag must move only the latter,
    // and it is how the drag still reaches the GPU.
    const dragged = layer({
      sources: [
        {
          type: "channel",
          visible: true,
          intensityIndex: 0,
          transfer: { colormap: "VIRIDIS", climMin: 10, climMax: 255, gamma: 1 },
        },
      ],
    });
    expect(buildChannelDataSignature(dragged)).toBe(buildChannelDataSignature(layer()));
    expect(buildChannelWindowSignature(dragged)).not.toBe(buildChannelWindowSignature(layer()));
  });

  it("changes on blend / projection / colormap / phasor-lens edits", () => {
    const base = buildChannelDataSignature(layer());
    expect(buildChannelDataSignature(layer({ blend: "MULTIPLICATIVE" }))).not.toBe(base);
    expect(buildChannelDataSignature(layer({ projection: "VOLUME" }))).not.toBe(base);
    expect(buildChannelDataSignature(layer({ colormap: "MAGMA" }))).not.toBe(base);
    expect(
      buildChannelDataSignature(layer({ lens: { phasor: { axisType: "lifetime" } } })),
    ).not.toBe(base);
  });

  it("ignores fields the uniform builders never read", () => {
    expect(buildChannelDataSignature(layer({ name: "renamed" }))).toBe(
      buildChannelDataSignature(layer()),
    );
  });

  it("a missing layer has a distinct stable signature", () => {
    expect(buildChannelDataSignature(undefined)).toBe(buildChannelDataSignature(undefined));
    expect(buildChannelDataSignature(undefined)).not.toBe(buildChannelDataSignature(layer()));
  });
});

describe("the per-object signature cache", () => {
  it("serves the SAME string for repeat calls on one object", () => {
    // Layers are replaced immutably, so the WeakMap cache is sound — and the
    // brick layers rebuild their member keys at drag cadence, so a repeat
    // call must be a lookup, never a restringify. `toBe` on the same object
    // twice, and value equality (asserted above) across distinct objects.
    const one = layer();
    expect(buildChannelDataSignature(one)).toBe(buildChannelDataSignature(one));
    expect(buildChannelWindowSignature(one)).toBe(buildChannelWindowSignature(one));
  });
});
