import { describe, expect, it } from "vitest";
import { decodeFrame, HEADER_BYTES } from "./frame";

/** A frame as the Python client's `lovekit.frames.encode` writes it. */
const packet = (sequence: number, sentAtUs: bigint, values: ArrayBufferView) => {
  const bytes = new Uint8Array(HEADER_BYTES + values.byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, 1);
  view.setUint32(4, sequence, true);
  view.setBigUint64(8, sentAtUs, true);
  bytes.set(new Uint8Array(values.buffer, values.byteOffset, values.byteLength), HEADER_BYTES);
  return bytes;
};

describe("decodeFrame", () => {
  it("reads the header and the values as declared", () => {
    const frame = decodeFrame(packet(7, 1_700_000_000_000_000n, new Float32Array([0.5, -2, 1024])), "float32");
    expect(frame?.sequence).toBe(7);
    expect(frame?.sentAt).toBe(1_700_000_000_000);
    expect(Array.from(frame!.values)).toEqual([0.5, -2, 1024]);
  });

  it("reads half precision, which numpy writes for float16", () => {
    // 1.0, -2.0, 0.5 and the smallest subnormal, as numpy float16 little-endian.
    const halves = new Uint16Array([0x3c00, 0xc000, 0x3800, 0x0001]);
    const frame = decodeFrame(packet(1, 0n, halves), "float16");
    expect(Array.from(frame!.values)).toEqual([1, -2, 0.5, 2 ** -24]);
  });

  it("reads a frame as the Python client writes it", () => {
    // The same bytes as GOLDEN in the lovekit client's tests/test_frames.py.
    const golden = "010000002a000000401261018b600600003c00c000380064";
    const bytes = Uint8Array.from(golden.match(/../g)!, (byte) => parseInt(byte, 16));
    const frame = decodeFrame(bytes, "float16");
    expect(frame?.sequence).toBe(42);
    expect(frame?.sentAt).toBeCloseTo(1_795_000_000_123.456, 3);
    expect(Array.from(frame!.values)).toEqual([1, -2, 0.5, 1024]);
  });

  it("reads nothing from a version or a type it does not know", () => {
    const bytes = packet(1, 0n, new Uint8Array([1, 2]));
    expect(decodeFrame(bytes, "complex64")).toBeNull();
    bytes[0] = 2;
    expect(decodeFrame(bytes, "uint8")).toBeNull();
  });
});
