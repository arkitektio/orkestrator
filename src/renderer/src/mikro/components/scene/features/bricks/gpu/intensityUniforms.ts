import type { LayerState } from "../../../platform/model/layerModel";
import { climToUnit } from "../../../platform/model/dataRange";
import { effectiveScalarTransfer } from "../../../platform/model/renderGraph";
import { buildColormapAtlas } from "../../../platform/gpu/colormaps";

/**
 * Compositor uniforms for a layer whose recipe shape is DECLARED — the slim
 * counterpart of `buildChannelUniformData`.
 *
 * `LayerState.renderKind === "intensity"` promises exactly one visible CHANNEL
 * source with a plain window+gamma transfer: no curve, no colour-stop gradient,
 * no invert, no per-slot opacity, no phasor, and an additive (or normal, which
 * collapses identically at one slot) blend. Everything the general builder packs
 * per slot is therefore a SCALAR here, and the two `DataTexture`s it allocates —
 * `sourceParams` and `cursors`, together `3×16 + 14×16` RGBA32F texels rebuilt
 * on every transfer edit — are not allocated at all.
 *
 * The colormap ATLAS stays, and deliberately. A dedicated 1-D LUT is tempting,
 * but the material already sits near the WebGPU 12-uniform-buffers-per-stage
 * limit (`brickNodeMaterials.ts`) and a texture costs no uniform binding, while
 * `buildColormapAtlas` is also where a TINT and a named ramp are unified —
 * a monochrome channel shown in magenta is still one scalar source, and its
 * colour is a baked LUT row exactly as a viridis ramp is.
 *
 * The atlas is built with ONE row, so the row coordinate is the compile-time
 * constant 0.5 and no `row` uniform exists.
 */
export type IntensityUniformData = {
  atlas: ReturnType<typeof buildColormapAtlas>;
  /** Integer atlas-slab index of the single source's channel. */
  slab: number;
  /** Contrast window, normalized into the shader's [0,1] base-value space. */
  climMin: number;
  climMax: number;
  gamma: number;
};

/** The single row of a one-row colormap atlas. Compile-time in the shader. */
export const INTENSITY_ATLAS_ROW = 0.5;

/**
 * Build the slim uniform set for a fixed-shape intensity layer.
 *
 * Every value is computed by the SAME helper the general builder uses —
 * `effectiveScalarTransfer` for the "gamma is the fallback" rule, `climToUnit`
 * for the absolute-to-normalized conversion, `buildColormapAtlas` for the row.
 * That is not incidental: `intensityUniforms.test.ts` asserts this equals slot 0
 * of `buildChannelUniformData` for the same layer, and it can only stay equal if
 * neither reimplements the other's arithmetic.
 */
export type IntensityWindow = {
  climMin: number;
  climMax: number;
  gamma: number;
};

/**
 * The WINDOW half alone — what a clim/gamma drag moves at 60 Hz. Split out so
 * the plane layer's window fast path can write these three scalars into the
 * existing uniform nodes without rebuilding the atlas (`buildIntensityUniformData`
 * spreads this, so the two cannot drift).
 */
export function buildIntensityWindow(
  layer: LayerState | undefined,
  // Base-native data range (pool.minValue/maxValue). Clim is stored in absolute
  // base-native units and normalized into the shader's [0,1] space here.
  minValue: number = 0,
  maxValue: number = 1,
): IntensityWindow {
  const source = layer?.sources?.[0] ?? layer?.channels?.[0];
  const transfer = source?.type === "channel" ? source.transfer : undefined;
  const scalar = effectiveScalarTransfer(
    transfer ?? { climMin: null, climMax: null, gamma: null, stops: null },
  );
  return {
    climMin: climToUnit(scalar.climMin, minValue, maxValue, 0),
    climMax: climToUnit(scalar.climMax, minValue, maxValue, 1),
    gamma: scalar.gamma,
  };
}

export function buildIntensityUniformData(
  layer: LayerState | undefined,
  maxChannelIndex: number,
  minValue: number = 0,
  maxValue: number = 1,
): IntensityUniformData {
  const source = layer?.sources?.[0] ?? layer?.channels?.[0];
  const transfer = source?.type === "channel" ? source.transfer : undefined;
  return {
    atlas: buildColormapAtlas([
      {
        colormap: transfer?.colormap ?? layer?.colormap,
        color: transfer?.color ?? layer?.color,
      },
    ]),
    slab:
      source?.type === "channel"
        ? Math.min(maxChannelIndex, Math.max(0, source.intensityIndex ?? 0))
        : 0,
    ...buildIntensityWindow(layer, minValue, maxValue),
  };
}
