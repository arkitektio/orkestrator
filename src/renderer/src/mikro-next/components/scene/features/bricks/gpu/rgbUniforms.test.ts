// @vitest-environment jsdom
// (same reason as intensityUniforms.test.ts: the general builder reaches the
// generated GraphQL enums and makes a three.js DataTexture.)
import { describe, expect, it } from "vitest";

import { Blending } from "@/mikro-next/api/graphql";
import { buildChannelUniformData } from "./channelUniforms";
import { buildRgbUniformData } from "./rgbUniforms";
import { resolveRenderKind, type LayerState } from "../../../platform/model/layerModel";
import type { ChannelRenderNode, TransferFn } from "../../../platform/model/renderGraph";
import { CHANNEL_KIND } from "../../../platform/model/renderGraph";

/**
 * THE contract test for the RGB fast path — the three-slab twin of
 * `intensityUniforms.test.ts`.
 *
 * Two claims are pinned, and the shader is only exact if BOTH hold:
 *  1. the five scalars the slim builder hands the material equal slots 0..2 of
 *     the general builder (slab indices, the shared window, and the constants
 *     the fast path compiles away: gamma 1, visible, no invert — opacity is
 *     the white-balance gain and stays a uniform);
 *  2. the general path's colormap-atlas rows for these three sources are
 *     CONSTANT pure-basis tints — that is what makes the LUT tap droppable.
 *     If `buildColormapAtlas` ever bakes a tint as a ramp, (2) fails and the
 *     fast path would need `norm²`, not `norm`.
 */

const RGB: readonly [number, number, number][] = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
];

const transfer = (color: readonly number[], over: Partial<TransferFn> = {}): TransferFn => ({
  climMin: 12,
  climMax: 200,
  colormap: null,
  color: [...color],
  colorStops: null,
  stops: null,
  gamma: null,
  opacity: null,
  invert: null,
  ...over,
});

/** Slot `slot` (its basis tint) tapping atlas slab `slab` (defaults to the slot). */
const channel = (
  slot: 0 | 1 | 2,
  over: Partial<ChannelRenderNode> = {},
  slab: number = slot,
): ChannelRenderNode => ({
  type: "channel",
  kind: CHANNEL_KIND,
  label: null,
  intensityAxis: "c",
  intensityIndex: slab,
  visible: true,
  transfer: transfer(RGB[slot]),
  ...over,
});

const rgbLayer = (sources: ChannelRenderNode[]): LayerState =>
  ({
    __typename: "RgbLayer",
    id: "rgb-1",
    renderKind: resolveRenderKind(sources, Blending.Additive),
    channels: sources,
    phasors: [],
    sources,
    blend: Blending.Additive,
    colormap: null,
    color: null,
  }) as unknown as LayerState;

const RANGE: [number, number] = [0, 255];
const MAX_SLAB = 5;

const general = (layer: LayerState) =>
  buildChannelUniformData(layer, MAX_SLAB, RANGE[0], RANGE[1], {
    slabs: [],
    channelSlabCount: MAX_SLAB + 1,
  });

describe("buildRgbUniformData ≡ slots 0..2 of buildChannelUniformData", () => {
  const SLOTS = [0, 1, 2] as const;
  const cases: [string, ChannelRenderNode[]][] = [
    ["slabs 0/1/2", [channel(0), channel(1), channel(2)]],
    ["permuted slabs", [channel(0, {}, 2), channel(1, {}, 0), channel(2, {}, 1)]],
    [
      "a null window (full range)",
      SLOTS.map((i) =>
        channel(i, { transfer: transfer(RGB[i], { climMin: null, climMax: null }) }),
      ),
    ],
    [
      "explicit gamma 1 and opacity 1",
      SLOTS.map((i) => channel(i, { transfer: transfer(RGB[i], { gamma: 1, opacity: 1 }) })),
    ],
    ["a slab index past the pool's last", [channel(0, {}, 99), channel(1), channel(2)]],
    [
      "white-balance gains (per-slot opacity)",
      SLOTS.map((i) =>
        channel(i, { transfer: transfer(RGB[i], { opacity: [1, 0.8, 0.5][i] }) }),
      ),
    ],
  ];

  it.each(cases)("earns renderKind rgb for %s", (_label, sources) => {
    // The precondition the material compiles against; without it the layer
    // never reaches the fast path and this test would be pinning nothing.
    expect(rgbLayer(sources).renderKind).toBe("rgb");
  });

  it.each(cases)("agrees on the scalars for %s", (_label, sources) => {
    const layer = rgbLayer(sources);
    const g = general(layer);
    const s = buildRgbUniformData(layer, MAX_SLAB, RANGE[0], RANGE[1]);
    expect([s.slabR, s.slabG, s.slabB]).toEqual(g.channelIndex.slice(0, 3));
    expect(s.climMin).toBe(g.climMin[0]);
    expect(s.climMax).toBe(g.climMax[0]);
    // The gains ARE the general path's per-slot opacity, weight = opacity · norm.
    expect([s.gainR, s.gainG, s.gainB]).toEqual(g.opacity.slice(0, 3));
  });

  it.each(cases)(
    "the general slots hold exactly the constants the fast path compiles away, for %s",
    (_label, sources) => {
      const g = general(rgbLayer(sources));
      expect(g.numChannels).toBe(3);
      expect(g.climMin.slice(0, 3)).toEqual([g.climMin[0], g.climMin[0], g.climMin[0]]);
      expect(g.climMax.slice(0, 3)).toEqual([g.climMax[0], g.climMax[0], g.climMax[0]]);
      expect(g.gamma.slice(0, 3)).toEqual([1, 1, 1]);
      // Opacity is NOT a constant: it is the white-balance gain, a uniform.
      expect(g.visible.slice(0, 3)).toEqual([1, 1, 1]);
      expect(g.invert.slice(0, 3)).toEqual([0, 0, 0]);
    },
  );

  it("the general path's LUT rows are CONSTANT pure-basis tints (the LUT tap is the identity)", () => {
    const g = general(rgbLayer([channel(0), channel(1), channel(2)]));
    const data = g.atlas.image.data as Uint8Array;
    const width = g.atlas.image.width;
    expect(g.atlas.image.height).toBe(3);
    for (let row = 0; row < 3; row++) {
      for (const x of [0, 1, 37, 128, 254, 255]) {
        const i = (row * width + x) * 4;
        expect(Array.from(data.slice(i, i + 3)), `row ${row} x ${x}`).toEqual([...RGB[row]]);
      }
    }
  });

  it("survives a layer with no sources at all", () => {
    const empty = { channels: [], sources: [] } as unknown as LayerState;
    expect(() => buildRgbUniformData(empty, MAX_SLAB)).not.toThrow();
    expect(buildRgbUniformData(empty, MAX_SLAB)).toMatchObject({ slabR: 0, slabG: 0, slabB: 0 });
  });
});
