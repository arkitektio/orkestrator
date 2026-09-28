import type { LayerState } from "../../../platform/model/layerModel";
import { climToUnit } from "../../../platform/model/dataRange";
import { effectiveScalarTransfer } from "../../../platform/model/renderGraph";

/**
 * Compositor uniforms for a layer whose recipe is DECLARED to be RGB — the
 * three-slab counterpart of `intensityUniforms.ts`.
 *
 * `LayerState.renderKind === "rgb"` promises exactly three visible CHANNEL
 * sources, tinted pure red / green / blue in slot order, over ONE shared
 * contrast window, with gamma 1, no colormap, no curve, no invert, additive
 * blend. Per-slot opacity IS allowed: it is the plane's white-balance gain
 * (`normalizeRgbLayer`). Everything the general builder packs per slot is
 * therefore either a compile-time constant here or one of EIGHT scalars — and
 * there is no colormap atlas at all:
 *
 * `buildColormapAtlas` bakes a CONSTANT-tint row for a `colormap == null`
 * channel with an explicit color (the "RESPONSE-CURVE CONVENTION" note in
 * `platform/gpu/colormaps.tsx`), so the general path's contribution for slot
 * k is `tint_k/255 · (opacity_k · norm_k)` = `gain_k · norm_k · e_k`. Summed
 * additively over a zero accumulator that is simply
 * `vec3(gain_r·norm_r, gain_g·norm_g, gain_b·norm_b)`: three taps and three
 * multiplies assemble the colour directly and
 * the three LUT samples the general path pays are provably the identity.
 * (`rgbUniforms.test.ts` pins that the rows ARE constant, so a change to the
 * atlas convention fails here rather than silently tinting the fast path
 * differently from the reference.)
 *
 * The clim window is read from slot 0 and asserted equal across the three by
 * the same test — `resolveRenderKind` only earns "rgb" when they agree.
 */
export type RgbUniformData = {
  /** Integer atlas-slab index of the red / green / blue channel. */
  slabR: number;
  slabG: number;
  slabB: number;
  /** Shared contrast window, normalized into the shader's [0,1] base space. */
  climMin: number;
  climMax: number;
  /** White-balance gain per primary — the slot's `opacity`, 1 when unset. */
  gainR: number;
  gainG: number;
  gainB: number;
};

const clampSlab = (index: number | null | undefined, maxChannelIndex: number): number =>
  Math.min(maxChannelIndex, Math.max(0, index ?? 0));

/**
 * Build the slim uniform set for a fixed-shape RGB layer. Every value comes
 * from the SAME helpers the general builder uses (`effectiveScalarTransfer`,
 * `climToUnit`), which is what lets `rgbUniforms.test.ts` assert equality with
 * slots 0..2 of `buildChannelUniformData` rather than trusting a reimplementation.
 */
export function buildRgbUniformData(
  layer: LayerState | undefined,
  maxChannelIndex: number,
  minValue: number = 0,
  maxValue: number = 1,
): RgbUniformData {
  const sources = (layer?.sources ?? layer?.channels ?? []).slice(0, 3);
  const slabOf = (i: number): number => {
    const source = sources[i];
    return source?.type === "channel" ? clampSlab(source.intensityIndex, maxChannelIndex) : 0;
  };
  const gainOf = (i: number): number => {
    const source = sources[i];
    return source?.type === "channel" ? (source.transfer.opacity ?? 1) : 1;
  };
  const first = sources[0];
  const transfer = first?.type === "channel" ? first.transfer : undefined;
  const scalar = effectiveScalarTransfer(
    transfer ?? { climMin: null, climMax: null, gamma: null, stops: null },
  );
  return {
    slabR: slabOf(0),
    slabG: slabOf(1),
    slabB: slabOf(2),
    climMin: climToUnit(scalar.climMin, minValue, maxValue, 0),
    climMax: climToUnit(scalar.climMax, minValue, maxValue, 1),
    gainR: gainOf(0),
    gainG: gainOf(1),
    gainB: gainOf(2),
  };
}
