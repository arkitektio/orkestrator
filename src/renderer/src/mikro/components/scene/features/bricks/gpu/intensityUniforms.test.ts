// @vitest-environment jsdom
// (the uniform builders reach the generated `graphql.ts` enums, whose Apollo
// hooks barrel touches `window` on load, and `buildColormapAtlas` makes a
// three.js DataTexture.)
import { describe, expect, it } from "vitest";

import { Blending, ColorMap } from "@/mikro/api/graphql";
import { buildChannelUniformData } from "./channelUniforms";
import { buildIntensityUniformData, buildIntensityWindow, INTENSITY_ATLAS_ROW } from "./intensityUniforms";
import type { LayerState } from "../../../platform/model/layerModel";
import type { ChannelRenderNode, TransferFn } from "../../../platform/model/renderGraph";
import { CHANNEL_KIND } from "../../../platform/model/renderGraph";

/**
 * THE contract test for the fixed-shape fast path.
 *
 * The specialised material's whole claim is that it computes nothing the
 * general material does not — it computes less of it. A shader cannot be
 * asserted without a GPU, but the values it is HANDED can be, and if the slim
 * builder agrees with slot 0 of the general one for every transfer the fast
 * path admits, the only remaining difference is the emission itself.
 *
 * So: same layer, both builders, compare. If someone changes the clim
 * conversion, the "gamma is the fallback" rule or the LUT row in one place,
 * this fails rather than the two silently drifting until a colour looks wrong.
 */

const transfer = (over: Partial<TransferFn> = {}): TransferFn => ({
  climMin: 120,
  climMax: 3800,
  colormap: ColorMap.Viridis,
  color: null,
  colorStops: null,
  stops: null,
  gamma: 0.7,
  opacity: null,
  invert: null,
  ...over,
});

const channel = (over: Partial<ChannelRenderNode> = {}): ChannelRenderNode => ({
  type: "channel",
  kind: CHANNEL_KIND,
  label: null,
  intensityAxis: "c",
  intensityIndex: 2,
  visible: true,
  transfer: transfer(),
  ...over,
});

const layerWith = (source: ChannelRenderNode): LayerState =>
  ({
    __typename: "IntensityLayer",
    id: "layer-1",
    renderKind: "intensity",
    channels: [source],
    phasors: [],
    sources: [source],
    blend: Blending.Additive,
    colormap: source.transfer.colormap,
    color: source.transfer.color,
  }) as unknown as LayerState;

const RANGE: [number, number] = [0, 65535];
const MAX_SLAB = 3;

/** Slot 0 of the general builder — what the specialised one must reproduce. */
const generalSlot0 = (layer: LayerState) => {
  const data = buildChannelUniformData(layer, MAX_SLAB, RANGE[0], RANGE[1], {
    slabs: [],
    channelSlabCount: MAX_SLAB + 1,
  });
  return {
    slab: data.channelIndex[0],
    climMin: data.climMin[0],
    climMax: data.climMax[0],
    gamma: data.gamma[0],
    row: data.row[0],
    atlasRow0: Array.from(
      (data.atlas.image.data as Uint8Array).slice(128 * 4, 128 * 4 + 3),
    ),
  };
};

const specialised = (layer: LayerState) => {
  const data = buildIntensityUniformData(layer, MAX_SLAB, RANGE[0], RANGE[1]);
  return {
    slab: data.slab,
    climMin: data.climMin,
    climMax: data.climMax,
    gamma: data.gamma,
    row: INTENSITY_ATLAS_ROW,
    atlasRow0: Array.from(
      (data.atlas.image.data as Uint8Array).slice(128 * 4, 128 * 4 + 3),
    ),
  };
};

describe("buildIntensityUniformData ≡ slot 0 of buildChannelUniformData", () => {
  it.each([
    ["a plain window + gamma", channel()],
    ["a null window (full range)", channel({ transfer: transfer({ climMin: null, climMax: null }) })],
    ["no gamma (defaults to 1)", channel({ transfer: transfer({ gamma: null }) })],
    ["a named colormap", channel({ transfer: transfer({ colormap: ColorMap.Magma }) })],
    ["a TINT instead of a ramp", channel({ transfer: transfer({ colormap: null, color: [255, 0, 255] }) })],
    ["slab 0", channel({ intensityIndex: 0 })],
    ["a slab index past the pool's last", channel({ intensityIndex: 99 })],
    ["a negative slab index", channel({ intensityIndex: -4 })],
  ])("agrees for %s", (_label, source) => {
    const layer = layerWith(source);
    expect(specialised(layer)).toEqual(generalSlot0(layer));
  });

  it("agrees on the LUT ROW, which is where a tint becomes colour", () => {
    // A one-row atlas puts the only row's centre at 0.5, which is what lets the
    // specialised shader use a compile-time constant instead of a uniform. If
    // the general builder ever emitted more than one row for a single source,
    // this is the assertion that catches it.
    const layer = layerWith(channel());
    expect(generalSlot0(layer).row).toBe(INTENSITY_ATLAS_ROW);
  });

  it("clamps the slab to the pool's channel count, as the general builder does", () => {
    // Tapping a slab the brick does not hold reads another channel's voxels.
    expect(buildIntensityUniformData(layerWith(channel({ intensityIndex: 99 })), MAX_SLAB).slab).toBe(
      MAX_SLAB,
    );
  });

  it("survives a layer with no sources at all", () => {
    // Defensive, and reachable: a layer normalizes before its pool exists.
    const empty = { channels: [], sources: [] } as unknown as LayerState;
    expect(() => buildIntensityUniformData(empty, MAX_SLAB)).not.toThrow();
    expect(buildIntensityUniformData(empty, MAX_SLAB).slab).toBe(0);
  });
});

describe("buildIntensityWindow ≡ the window half of buildIntensityUniformData", () => {
  // The plane layer's window fast path writes these three scalars alone
  // (BrickPlaneLayer's window effect) while the structure-keyed rebuild
  // stays put — so the split function must agree with the full builder for
  // every transfer, or a drag would paint a different window than a rebuild.
  it.each([
    ["a plain window + gamma", channel()],
    ["a null window (full range)", channel({ transfer: transfer({ climMin: null, climMax: null }) })],
    ["no gamma (defaults to 1)", channel({ transfer: transfer({ gamma: null }) })],
    ["a transfer CURVE (window derives from the stops)", channel({
      transfer: transfer({ stops: [
        { position: 100, value: 0 },
        { position: 2000, value: 1 },
      ] }),
    })],
  ])("agrees for %s", (_label, source) => {
    const layer = layerWith(source);
    const full = buildIntensityUniformData(layer, MAX_SLAB, RANGE[0], RANGE[1]);
    const window = buildIntensityWindow(layer, RANGE[0], RANGE[1]);
    expect(window).toEqual({ climMin: full.climMin, climMax: full.climMax, gamma: full.gamma });
  });
});
