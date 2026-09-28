import { describe, expect, it } from "vitest";
import { encodeHalfArray, floatToHalfBits, halfBitsToFloat } from "./halfFloat";

describe("floatToHalfBits / halfBitsToFloat", () => {
  it("round-trips exact half-float values", () => {
    for (const value of [0, 1, -1, 0.5, 0.25, 2048, -2048, 0.099975585937_5]) {
      expect(halfBitsToFloat(floatToHalfBits(value))).toBe(value);
    }
  });

  it("known bit patterns", () => {
    expect(floatToHalfBits(0)).toBe(0x0000);
    expect(floatToHalfBits(1)).toBe(0x3c00);
    expect(floatToHalfBits(-2)).toBe(0xc000);
    expect(floatToHalfBits(65504)).toBe(0x7bff); // f16 max
    expect(halfBitsToFloat(0x3c00)).toBe(1);
    expect(halfBitsToFloat(0x7c00)).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(halfBitsToFloat(0x7e00))).toBe(true);
  });

  it("overflow → infinity, NaN → NaN", () => {
    expect(halfBitsToFloat(floatToHalfBits(1e6))).toBe(Number.POSITIVE_INFINITY);
    expect(halfBitsToFloat(floatToHalfBits(-1e6))).toBe(Number.NEGATIVE_INFINITY);
    expect(Number.isNaN(halfBitsToFloat(floatToHalfBits(Number.NaN)))).toBe(true);
  });

  it("subnormals survive the round trip", () => {
    const smallestSubnormal = 2 ** -24;
    expect(halfBitsToFloat(floatToHalfBits(smallestSubnormal))).toBe(smallestSubnormal);
    expect(halfBitsToFloat(floatToHalfBits(smallestSubnormal * 5))).toBe(
      smallestSubnormal * 5,
    );
  });

  it("relative round-trip error stays within half-float precision", () => {
    // 11-bit significand → worst relative error 2^-11 for normal values.
    for (let i = 0; i < 2000; i++) {
      const value = Math.random(); // the atlas stores normalized [0,1]
      const roundTripped = halfBitsToFloat(floatToHalfBits(value));
      expect(Math.abs(roundTripped - value)).toBeLessThanOrEqual(
        Math.max(value * 2 ** -11, 2 ** -24),
      );
    }
  });

  it("is monotone non-decreasing (linear filtering relies on ordering)", () => {
    let previous = -Infinity;
    for (let raw = 0; raw <= 65535; raw += 13) {
      const decoded = halfBitsToFloat(floatToHalfBits(raw / 65535));
      expect(decoded).toBeGreaterThanOrEqual(previous);
      previous = decoded;
    }
  });
});

describe("encodeHalfArray", () => {
  it("encodes uint16 raw values scaled to [0,1] within tolerance after rescale", () => {
    const raw = new Float32Array([0, 1, 255, 4095, 32768, 65535]);
    const half = new Uint16Array(raw.length);
    encodeHalfArray(raw, half, 1 / 65535);
    for (let i = 0; i < raw.length; i++) {
      const rescaled = halfBitsToFloat(half[i]) * 65535;
      // ≤ 2^-11 relative — invisible after clim windowing + 8-bit display.
      expect(Math.abs(rescaled - raw[i])).toBeLessThanOrEqual(
        Math.max(raw[i] * 2 ** -11, 0.01),
      );
    }
  });
});
