import * as THREE from "three";

/**
 * Value semantics shared by the brick pyramid's shader and its CPU mirror.
 *
 * The traversal itself lives in the TSL port (`features/bricks/gpu/brickNodeMaterials.ts`),
 * which compiles to WGSL; what stays here is the small set of constants and
 * encodings the CPU side must reproduce exactly to stay in lockstep with what
 * the GPU renders.
 */

// Defined by levelGeometry, which is the module that applies the cap.
export { MAX_BRICK_LEVELS } from "../../../platform/coords/levelGeometry";

/**
 * How many bits of a page-table entry an EMPTY (uniform) brick's value gets.
 *
 * An EMPTY brick costs no atlas slot: its single value rides in the page-table
 * entry itself, which is RGBA8. The width is a per-POOL property, not a global
 * constant, because the two kinds of pool need different things from it:
 *
 *  - `8` — INTENSITY. One byte in `r`, which is inherently lossy for wide dtype
 *    ranges (~257 raw units per code over uint16's `[0,65535]`; see P11) and has
 *    always been, because an intensity is about to be normalized through a
 *    transfer function anyway.
 *  - `24` — LABEL IDS, spread across `r`, `g` and `b`. An id must survive
 *    EXACTLY: a mask is mostly uniform bricks (the background between objects,
 *    the interior of any large object), so an 8-bit round-trip would not lose a
 *    little precision on a few voxels, it would paint most of the mask as the
 *    wrong object. Over `[0, 2^24-1]` the 24-bit round-trip is exact for every
 *    id a float32 atlas can hold anyway.
 *
 * 24 bits is free rather than a trade: an EMPTY entry is written as
 * `[code, 0, 0]` today, so `g` and `b` are unused — they carry slot coordinates
 * only when the flag says RESIDENT.
 */
export type EmptyValueBits = 8 | 24;

/** The largest code each width can hold. */
const codeCeiling = (bits: EmptyValueBits): number => (bits === 24 ? 0xffffff : 0xff);

/**
 * Quantize a uniform brick's raw value to an integer code of `bits` width.
 *
 * Returns the CODE, not the texel — `encodeEmptyTexel` splits it into the bytes
 * a page entry carries. The two are separate because the CPU mirror
 * (`decodeEmptyValue`) round-trips the code, and only the write path cares how
 * the code is laid out across channels.
 */
export function encodeEmptyValue(
  value: number,
  dataRange: { minValue: number; maxValue: number },
  bits: EmptyValueBits = 8,
): number {
  const range = dataRange.maxValue - dataRange.minValue;
  if (range <= 0) return 0;
  const ceiling = codeCeiling(bits);
  return Math.round(
    THREE.MathUtils.clamp((value - dataRange.minValue) / range, 0, 1) * ceiling,
  );
}

/**
 * CPU mirror of the shader's EMPTY-brick decode. An EMPTY brick's value survives
 * only as the page-table code, so the value the GPU renders is the
 * `encode`→`decode` round-trip of the raw value — NOT the raw value itself. The
 * CPU raymarch (`marchResidentBricks`) and the resident probe must apply the same
 * round-trip to stay in lockstep with the rendered image.
 */
export function decodeEmptyValue(
  encoded: number,
  dataRange: { minValue: number; maxValue: number },
  bits: EmptyValueBits = 8,
): number {
  const range = dataRange.maxValue - dataRange.minValue;
  return dataRange.minValue + (encoded / codeCeiling(bits)) * range;
}

/**
 * The `[r, g, b]` bytes an EMPTY page entry carries, little-endian.
 *
 * At 8 bits this is the historical `[code, 0, 0]`. At 24 it fills all three, and
 * the shader recomposes with the same weights — keep the two in lockstep
 * (`emitResolveBrickResidency`'s EMPTY branch).
 */
export function encodeEmptyTexel(
  value: number,
  dataRange: { minValue: number; maxValue: number },
  bits: EmptyValueBits = 8,
): [number, number, number] {
  const code = encodeEmptyValue(value, dataRange, bits);
  if (bits === 8) return [code, 0, 0];
  return [code & 0xff, (code >>> 8) & 0xff, (code >>> 16) & 0xff];
}

/**
 * Per-brick occupancy texel `[r, g]` (RG8) for the page table's occupancy
 * sidecar: `r` is the brick's raw MIN, `g` its raw MAX, both 8-bit quantized
 * over the ENCODE range (`dataRange` — the pool data range, or under
 * `orkestrator.occObservedRange` the pool's observed value range) — with
 * CONSERVATIVE rounding and an INVERTED max:
 *
 *  - `r = floor(minFrac·255)` — decodes to a value ≤ the true min,
 *  - `g = 255 − ceil(maxFrac·255)` — decodes to a value ≥ the true max,
 *
 * so the decode brackets the brick's true value range from the outside. The
 * inversion makes the ALL-ZERO texel (a fresh texture, a brick whose range is
 * not yet known — e.g. a GPU-repacked brick before its min/max readback lands)
 * decode to the FULL data range: "could be anything, never skip". The shader's
 * occupancy skip and `decodeOccupancyBounds` must stay in lockstep.
 *
 * STALE-RANGE SAFETY (why encoding against a range that no longer contains
 * the brick is still conservative, given the byte-0 sentinel decode): the
 * clamps bracket from the outside in all four corners —
 *  - brick min below the range: minFrac clamps to 0 → r = 0 → sentinel →
 *    decodes to the POOL min ≤ true min;
 *  - brick min above the range: minFrac clamps to 1 → r = 255 → decodes to
 *    the encode-range max, which is < true min in this case — still ≤;
 *  - brick max above the range: maxFrac clamps to 1 → g = 0 → sentinel →
 *    decodes to the POOL max ≥ true max;
 *  - brick max below the range: maxFrac clamps to 0 → g = 255 → decodes to
 *    the encode-range min, which is > true max in this case — still ≥.
 * (The sentinel is over-broad for a genuinely-at-the-endpoint value —
 * decoding to the pool endpoint instead of the encode endpoint — which is
 * conservative by the same containment argument.)
 */
export function encodeOccupancyTexel(
  minValue: number,
  maxValue: number,
  dataRange: { minValue: number; maxValue: number },
): [number, number] {
  const range = dataRange.maxValue - dataRange.minValue;
  if (
    !(range > 0) ||
    !Number.isFinite(minValue) ||
    !Number.isFinite(maxValue) ||
    maxValue < minValue
  ) {
    return [0, 0]; // conservative: full range
  }
  const minFrac = THREE.MathUtils.clamp((minValue - dataRange.minValue) / range, 0, 1);
  const maxFrac = THREE.MathUtils.clamp((maxValue - dataRange.minValue) / range, 0, 1);
  return [Math.floor(minFrac * 255), 255 - Math.ceil(maxFrac * 255)];
}

/** CPU mirror of the shader's occupancy decode: the conservative raw-value
 * bracket `[min, max]` an occupancy texel declares for its brick.
 *
 * Byte 0 on either channel is the "unbounded on that side" SENTINEL and
 * decodes to the POOL range endpoint, never the encode range's: the all-zero
 * texel (fresh texture / range not yet known) must mean "could be anything,
 * never skip" even while the observed encode range lags a brick whose async
 * min/max readback has not landed. `poolRange` defaults to `encodeRange`,
 * which reproduces the legacy single-range behavior bit-for-bit (a 0 byte
 * then decodes to the same endpoint either way). */
export function decodeOccupancyBounds(
  texel: readonly [number, number],
  encodeRange: { minValue: number; maxValue: number },
  poolRange: { minValue: number; maxValue: number } = encodeRange,
): { minValue: number; maxValue: number } {
  const range = encodeRange.maxValue - encodeRange.minValue;
  return {
    minValue:
      texel[0] === 0
        ? poolRange.minValue
        : encodeRange.minValue + (texel[0] / 255) * range,
    maxValue:
      texel[1] === 0
        ? poolRange.maxValue
        : encodeRange.minValue + ((255 - texel[1]) / 255) * range,
  };
}
