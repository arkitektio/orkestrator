/**
 * float32 ↔ float16 bit conversion for the R16F brick atlas (roadmap R3).
 *
 * uint16 voxels used to be promoted to float32 and stored in an R32F atlas —
 * 2× the bytes the data carries. WebGPU has no core filterable 16-bit UNORM
 * format (`r16unorm` is optional-extension territory and three has no type
 * for it), but `r16float` IS core and filterable, so uint16 intensity pools
 * store `raw / 65535` as half floats and the shader rescales through the
 * existing `uAtlasScale` uniform (= 65535), exactly like the R8 path's 255.
 *
 * Precision: a half float carries an 11-bit significand — ~2048 distinguishable
 * levels in the top octave of [0,1], finer below. The rendered image passes
 * through clim windowing → colormap → an 8-bit swapchain, so this is invisible
 * in practice; the theoretical exception is a clim window narrower than ~32
 * raw counts positioned in the top half of the uint16 range. Probes and
 * measurements are UNAFFECTED — they read raw values from the decoded-chunk
 * cache, never from the atlas. Label pools never use R16F (ids must be exact);
 * kill switch: `orkestrator.r16Atlas` (see atlasFormat.ts).
 *
 * Hand-rolled rather than `DataView.getFloat16` / `Float16Array` (ES2024+):
 * the conversion also runs inside the repack worker, and a 20-line pure
 * function with tests beats a runtime-support probe in both places.
 */

const floatView = new Float32Array(1);
const intView = new Uint32Array(floatView.buffer);

/** IEEE 754 binary16 bits for a float (round-to-nearest, ties away handled by
 * the standard magic-rounding trick; NaN → canonical qNaN, overflow → ±inf). */
export function floatToHalfBits(value: number): number {
  floatView[0] = value;
  const bits = intView[0];
  const sign = (bits >>> 16) & 0x8000;
  let exponent = (bits >>> 23) & 0xff;
  const mantissa = bits & 0x7fffff;

  if (exponent === 0xff) {
    // Inf / NaN.
    return sign | 0x7c00 | (mantissa !== 0 ? 0x200 : 0);
  }
  // Re-bias 127 → 15.
  exponent = exponent - 127 + 15;
  if (exponent >= 0x1f) return sign | 0x7c00; // overflow → inf
  if (exponent <= 0) {
    // Subnormal half (or underflow to zero): shift the implicit-1 mantissa.
    if (exponent < -10) return sign; // too small even for a subnormal
    const shifted = (mantissa | 0x800000) >>> (1 - exponent + 13);
    // Round to nearest on the dropped bit.
    const roundBit = ((mantissa | 0x800000) >>> (-exponent + 13)) & 1;
    return sign | (shifted + roundBit);
  }
  // Normal half: keep 10 mantissa bits, round to nearest on bit 12.
  const rounded = mantissa + 0x1000;
  if (rounded & 0x800000) {
    // Mantissa rounding overflowed into the exponent.
    exponent += 1;
    if (exponent >= 0x1f) return sign | 0x7c00;
    return sign | (exponent << 10);
  }
  return sign | (exponent << 10) | (rounded >>> 13);
}

/** The float a binary16 bit pattern denotes. */
export function halfBitsToFloat(bits: number): number {
  const sign = (bits & 0x8000) !== 0 ? -1 : 1;
  const exponent = (bits >>> 10) & 0x1f;
  const mantissa = bits & 0x3ff;
  if (exponent === 0) return sign * mantissa * 2 ** -24; // subnormal / zero
  if (exponent === 0x1f) return mantissa !== 0 ? Number.NaN : sign * Number.POSITIVE_INFINITY;
  return sign * (mantissa + 0x400) * 2 ** (exponent - 25);
}

/**
 * Bulk-encode a repacked brick for an R16F atlas: `dst[i] =
 * halfBits(src[i] * scale)`. `scale` is the inverse of the atlas'
 * `dataScale` (1/65535 for uint16), so the shader's `tap * uAtlasScale`
 * round-trips to ~the raw value.
 */
export function encodeHalfArray(
  src: Float32Array,
  dst: Uint16Array,
  scale: number,
  length = dst.length,
): void {
  for (let i = 0; i < length; i++) {
    dst[i] = floatToHalfBits(src[i] * scale);
  }
}
