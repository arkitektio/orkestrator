/**
 * Turning a WebGPU texture readback into image bytes.
 *
 * three's `readRenderTargetPixelsAsync` hands back the raw mapped buffer from
 * `copyTextureToBuffer`, and WebGPU requires that copy's rows be aligned to 256
 * bytes — so three pads them (three.webgpu.js:73548) and nothing downstream
 * unpads. Reading such a buffer at `width * 4` bytes per row walks each row a
 * little further off than the last, which is why an unpadded read renders as a
 * diagonally striped, skewed image rather than the scene.
 */

/** WebGPU's `bytesPerRow` alignment for `copyTextureToBuffer`. */
const ROW_ALIGNMENT = 256;

/** RGBA8 — the only format this module's callers read back. */
const BYTES_PER_TEXEL = 4;

const alignedStride = (width: number): number =>
  Math.ceil((width * BYTES_PER_TEXEL) / ROW_ALIGNMENT) * ROW_ALIGNMENT;

/**
 * The bytes-per-row of a readback buffer, derived from the buffer itself.
 *
 * Deliberately inferred rather than assumed: three's padding is an
 * implementation detail we do not control, so if an upgrade starts returning
 * tightly packed rows, the unpadded branch takes over on its own instead of
 * silently reintroducing the skew. Both candidates coincide when `width * 4` is
 * already 256-aligned, and a padded buffer is never shorter than a tight one, so
 * testing padded first is unambiguous.
 *
 * Throws on a buffer too short to be either — a size mismatch means the layout
 * changed in some third way, and guessing would just stripe the image again.
 */
export const inferRowStride = (
  byteLength: number,
  width: number,
  height: number,
): number => {
  const tight = width * BYTES_PER_TEXEL;
  const padded = alignedStride(width);
  // three sizes the buffer to the last row's real bytes, not a full stride
  // (three.webgpu.js:73553), so the final row's padding is absent.
  if (byteLength >= (height - 1) * padded + tight) return padded;
  if (byteLength >= (height - 1) * tight + tight) return tight;
  throw new Error(
    `Readback buffer is ${byteLength} bytes — too short for ${width}x${height} RGBA ` +
      `at either a ${padded}- or ${tight}-byte row stride`,
  );
};

/**
 * Unpad and vertically flip a readback buffer into top-down RGBA, ready for
 * `ImageData`. GPU rows arrive bottom-up; canvas wants the opposite.
 *
 * The `<ArrayBuffer>` on the return type is load-bearing: `Uint8ClampedArray`
 * defaults to `ArrayBufferLike`, which `new ImageData(...)` rejects because it
 * admits a `SharedArrayBuffer`.
 */
export const gpuPixelsToImageBytes = (
  buf: Uint8Array,
  width: number,
  height: number,
): Uint8ClampedArray<ArrayBuffer> => {
  const stride = inferRowStride(buf.byteLength, width, height);
  const rowBytes = width * BYTES_PER_TEXEL;
  const out = new Uint8ClampedArray(rowBytes * height);
  for (let y = 0; y < height; y++) {
    const src = (height - 1 - y) * stride;
    out.set(buf.subarray(src, src + rowBytes), y * rowBytes);
  }
  return out;
};
