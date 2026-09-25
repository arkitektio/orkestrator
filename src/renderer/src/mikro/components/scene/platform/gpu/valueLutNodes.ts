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
const { clamp, float, max, mix, step, vec2 } = TSL;

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
): { code: any; rgb: any } => {
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
  const span = max(uniforms.uLutClimMax.sub(uniforms.uLutClimMin), float(1e-9));
  const t = clamp(raw.sub(uniforms.uLutClimMin).div(span), 0.0, 1.0);
  // A 256-entry row; the sample lands on a texel centre.
  const mapped = palette.sample(vec2(t, 0.5)).rgb;
  return { code, rgb: mix(base, mapped, uniforms.uLutColorize.mul(hasValue)) };
};
