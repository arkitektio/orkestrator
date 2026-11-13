/**
 * The TSL half of `platform/attributes/valueLut.ts` — decoding an RG8
 * value-code texel into a colour on the GPU.
 *
 * One implementation, because the encoding is one contract: the label mask
 * material and the fabriks mesh material both bind a table of 16-bit codes
 * (`code = G * 256 + R`; `0…65533` a value quantised over
 * `[uLutValueMin, uLutValueMax]`, `65534` visible-no-value, `65535` hidden)
 * and both must decode it the same way, or a colouring would read differently
 * off a mask than off the meshes it labels.
 *
 * The window (`uLutClimMin`/`uLutClimMax`) is applied HERE rather than at
 * build time, which is the whole point of the encoding: dragging a contrast
 * slider or switching a colormap is a uniform write and a 1 KB palette row,
 * never a rebuild and a multi-megabyte re-upload.
 */
import * as THREE from "three";
import * as TSLTyped from "three/tsl";

/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const { clamp, float, max, mix, select, step, vec2 } = TSL;

/** Beyond this magnitude a window end is OPEN (±Infinity on the CPU side). */
const OPEN_END = 1e30;

/** The shader-side threshold above which a code is a sentinel (65534, 65535). */
export const VALUE_LUT_SENTINEL_EDGE = 65533.5;
/** The shader-side threshold above which a code means HIDDEN (65535). */
export const VALUE_LUT_HIDDEN_EDGE = 65534.5;

/**
 * A 1×1 "visible, no value" table, so a material can bind a table slot from
 * construction and a real table is a swap, never a recompile.
 * `CODE_NO_VALUE` = 65534 = 0xFFFE, little-endian: R = 0xFE, G = 0xFF.
 */
export const identityValueLutTexture = (): THREE.DataTexture => {
  const texture = new THREE.DataTexture(new Uint8Array([0xfe, 0xff]), 1, 1, THREE.RGFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
};

/**
 * Decode a value LUT texel into a colour, and hand back the code so the
 * caller can decide what a sentinel does (labels and meshes both discard on
 * `code > VALUE_LUT_HIDDEN_EDGE` when their filter uniform is on).
 *
 * The float comparisons are exact — an RG8 texel decodes to `k/255` in f32
 * and `round(x * 255)` recovers `k` exactly for those — and the half-unit
 * tolerances make them robust regardless.
 *
 * `base` is what a slot with no value keeps (the id-hash hue, the material
 * colour); the mix weight is `uLutColorize · hasValue`, so the two sentinels
 * never decode as data.
 *
 * `atBottom` is 1 where a real value sits at or below the window's lower bound
 * — the texels the colormap's first colour paints. A caller that offers "do
 * not draw the bottom" (`hideBelowMin`, labels) discards on it; it is already
 * zero for the sentinels and while nothing colourises, so it cannot hide an
 * object the colouring never saw.
 */
export const emitValueLutColor = (
  lutTexel: any,
  palette: any,
  base: any,
  // `any` for the reason the label material gives: a TSL uniform node carries
  // the whole operator surface at runtime.
  uniforms: {
    uLutColorize: any;
    uLutValueMin: any;
    uLutValueMax: any;
    uLutClimMin: any;
    uLutClimMax: any;
  },
): { code: any; rgb: any; atBottom: any } => {
  const code = lutTexel.g
    .mul(255)
    .round()
    .mul(256)
    .add(lutTexel.r.mul(255).round())
    .toVar("valueLutCode");
  // 1 while the code carries a value, 0 for the two sentinels — so a slot no
  // read covered keeps its base instead of decoding a sentinel as data.
  const hasValue = step(code, float(VALUE_LUT_SENTINEL_EDGE));
  const raw = mix(uniforms.uLutValueMin, uniforms.uLutValueMax, code.div(float(65533.0)));
  // An OPEN end of the window arrives as ±Infinity (a stored `min`/`max` of
  // null: "stretch over what you read") and resolves to the table's own range
  // here. Left as infinities the quotient below is inf/inf, and "at or below
  // the bottom" has no bottom to compare against.
  const lo = select(
    uniforms.uLutClimMin.greaterThan(float(-OPEN_END)),
    uniforms.uLutClimMin,
    uniforms.uLutValueMin,
  );
  const hi = select(
    uniforms.uLutClimMax.lessThan(float(OPEN_END)),
    uniforms.uLutClimMax,
    uniforms.uLutValueMax,
  );
  const span = max(hi.sub(lo), float(1e-9));
  const t = clamp(raw.sub(lo).div(span), 0.0, 1.0);
  // A 256-entry row; the sample lands on a texel centre.
  const mapped = palette.sample(vec2(t, 0.5)).rgb;
  const weight = uniforms.uLutColorize.mul(hasValue);
  // `raw <= climMin`, not `t <= 0`: the same test, read off the value rather
  // than off a quotient. Exact for the case that matters — a sparse slice's
  // zeros are code 0, which decodes to `uLutValueMin` bit for bit.
  const atBottom = weight.mul(step(raw, lo));
  return { code, rgb: mix(base, mapped, weight), atBottom };
};
