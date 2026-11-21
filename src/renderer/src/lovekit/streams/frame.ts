/**
 * A frame of a data stream on the wire, the same on every transport: sixteen
 * bytes, little-endian, then the values as the stream declared them.
 *
 *     version u8 | flags u8 | reserved u16 | sequence u32 | sent_at_us u64 | values
 */

export const HEADER_BYTES = 16;
const VERSION = 1;

export type DataFrame = {
  sequence: number;
  /** When it was sent, in milliseconds of the sender's clock since the epoch. */
  sentAt: number;
  values: ArrayLike<number>;
};

/** IEEE 754 half precision, read by hand: `Float16Array` is not in every Chromium we ship. */
const halves = (view: DataView, offset: number, count: number) => {
  const values = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    const bits = view.getUint16(offset + index * 2, true);
    const sign = bits & 0x8000 ? -1 : 1;
    const exponent = (bits >> 10) & 0x1f;
    const fraction = bits & 0x3ff;
    if (exponent === 0) values[index] = sign * 2 ** -14 * (fraction / 1024);
    else if (exponent === 31) values[index] = fraction ? NaN : sign * Infinity;
    else values[index] = sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
  }
  return values;
};

const ARRAYS = {
  uint8: Uint8Array,
  int8: Int8Array,
  uint16: Uint16Array,
  int16: Int16Array,
  uint32: Uint32Array,
  int32: Int32Array,
  float32: Float32Array,
  float64: Float64Array,
} as const;

/** The frame in `payload`, its values read as `dtype`; nothing for what this build cannot read. */
export const decodeFrame = (payload: Uint8Array, dtype: string): DataFrame | null => {
  if (payload.byteLength < HEADER_BYTES) return null;
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  if (view.getUint8(0) !== VERSION) return null;
  const sequence = view.getUint32(4, true);
  const sentAt = Number(view.getBigUint64(8, true)) / 1000;
  const bytes = payload.byteLength - HEADER_BYTES;
  if (dtype === "float16") return { sequence, sentAt, values: halves(view, HEADER_BYTES, bytes >> 1) };
  const array = ARRAYS[dtype as keyof typeof ARRAYS];
  if (!array) return null;
  // Copied: a typed array needs its bytes aligned, and the payload's are not.
  const values = new array(payload.slice(HEADER_BYTES, HEADER_BYTES + bytes - (bytes % array.BYTES_PER_ELEMENT)).buffer);
  return { sequence, sentAt, values };
};
