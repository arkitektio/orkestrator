/**
 * The measure-palette contract every value-coloured layer shares: a value per
 * object in a buffer, a 256×1 colormap row as a texture, and the window as
 * uniforms — so changing how a number becomes a hue is a uniform write and a
 * 1 KB byte copy, never a buffer rebuild and never a texture reallocation.
 *
 * Four materials (points, tracks, vectors, network) each grew their own copy
 * of the three pieces this module owns, and two of the copies were wrong:
 *
 *  - the identity palette — a 1×1 white row bound from construction so a real
 *    colormap is a swap and not a recompile;
 *  - the palette swap — ADOPT THE ROW'S BYTES IN PLACE when the bound texture
 *    matches, because under WebGPU rebinding and disposing leaves the bind
 *    group pointing at a destroyed `GPUTexture` which three silently replaces
 *    with white (`valueLut.ts` and `labelNodeMaterials.setLabelColorStyle`
 *    record the hazard; `networkMaterial.setPalette` used to commit it, and
 *    `pointsMaterial` never bound the real row at all);
 *  - the ramp — `clamp((value − climMin) / span)` into a palette sample, with
 *    a non-finite clim falling back to the DATA window so a stored `min: null`
 *    means "stretch over what was read" rather than a NaN sample.
 *
 * The adopt path also carries the row's FILTERS across: a qualitative row is
 * NEAREST (adjacent ranks are unrelated classes) while a continuous row is
 * LINEAR, and adopting only the bytes would sample class boundaries blended.
 * Samplers are separate objects from textures under WebGPU, so a filter
 * change rides the same `needsUpdate` without touching the texture identity
 * the bind group holds.
 */
import * as THREE from "three";
import * as TSLTyped from "three/tsl";

/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const { clamp, float, max, uniform, vec2 } = TSL;

/** The window/ramp uniform set, under the names all four materials already
 *  use. `any`, for the reason the label material gives: a TSL uniform node
 *  carries the whole operator surface at runtime. */
export type MeasureAppearanceNodes = {
  /** 1 = palette over the value, 0 = the material's flat colour. */
  uColorize: any;
  /** The colormap window: `uClimMin` maps to the palette's bottom, `uClimMax`
   *  to its top. Non-finite ends fall back to `uValueMin`/`uValueMax`. */
  uClimMin: any;
  uClimMax: any;
  /** The DATA's value window — what a null clim end stretches over. */
  uValueMin: any;
  uValueMax: any;
};

export const createMeasureAppearance = (colorize = 0): MeasureAppearanceNodes => ({
  uColorize: uniform(colorize, "float"),
  uClimMin: uniform(0, "float"),
  uClimMax: uniform(1, "float"),
  uValueMin: uniform(0, "float"),
  uValueMax: uniform(1, "float"),
});

/** A 1×1 white palette, bound from the start so a real row is a texture swap
 *  and never a recompile. Per-call — the material owns its lifecycle and is
 *  the only thing allowed to dispose it. */
export const identityPaletteTexture = (): THREE.DataTexture => {
  const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
};

/** Anything past this is one of the ±Infinity sentinels a stored `min: null`
 *  becomes, never a real measurement. */
const FINITE_LIMIT = 1e30;

/**
 * Swap the colormap row a material samples, adopting its bytes in place when
 * the bound texture matches — the only palette mutation that is safe under
 * WebGPU (see the module docblock).
 *
 *  - `row === null` rebinds the identity: the previous row is disposed AFTER
 *    the rebind, and even if a stale bind group survives a frame, the white
 *    three substitutes for a destroyed texture IS the identity's colour.
 *  - same byte length → memcpy into the bound texture + filters + `needsUpdate`;
 *    the incoming row is consumed (disposed).
 *  - size mismatch (in practice only identity → first real row) → rebind, and
 *    dispose the old row only if it is not the identity.
 */
export const setMeasurePalette = (
  paletteNode: { value: THREE.Texture },
  identity: THREE.DataTexture,
  row: THREE.DataTexture | null,
): void => {
  const bound = paletteNode.value as THREE.DataTexture;
  if (row === bound) return;
  if (row === null) {
    if (bound === identity) return;
    paletteNode.value = identity;
    bound.dispose();
    return;
  }

  const boundImage = bound.image as { data?: Uint8Array } | undefined;
  const nextImage = row.image as { data?: Uint8Array } | undefined;
  if (
    bound !== identity &&
    boundImage?.data &&
    nextImage?.data &&
    boundImage.data.length === nextImage.data.length
  ) {
    boundImage.data.set(nextImage.data);
    bound.magFilter = row.magFilter;
    bound.minFilter = row.minFilter;
    bound.needsUpdate = true;
    row.dispose();
    return;
  }
  paletteNode.value = row;
  if (bound !== identity) bound.dispose();
};

/** Dispose what `setMeasurePalette` manages: the bound row if it is not the
 *  identity, and the identity itself. For the material's `dispose()`. */
export const disposeMeasurePalette = (
  paletteNode: { value: THREE.Texture },
  identity: THREE.DataTexture,
): void => {
  const bound = paletteNode.value as THREE.Texture;
  if (bound !== identity) bound.dispose();
  identity.dispose();
};

/**
 * The ramp, as a TSL colour expression: `value` normalised over the effective
 * clim window into a sample of the palette row. The caller composes it with
 * its base colour (`mix` by `uColorize`, or a select against a has-answer
 * gate) — that composition is the one genuinely per-material part.
 */
export const measureRampColor = (
  value: any,
  nodes: MeasureAppearanceNodes,
  paletteNode: any,
): any => {
  const climMin = nodes.uClimMin
    .abs()
    .lessThan(float(FINITE_LIMIT))
    .select(nodes.uClimMin, nodes.uValueMin);
  const climMax = nodes.uClimMax
    .abs()
    .lessThan(float(FINITE_LIMIT))
    .select(nodes.uClimMax, nodes.uValueMax);
  const span = max(climMax.sub(climMin), float(1e-9));
  const t = clamp(value.sub(climMin).div(span), 0.0, 1.0);
  return paletteNode.sample(vec2(t, 0.5)).rgb;
};
