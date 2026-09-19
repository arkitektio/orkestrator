import { describe, expect, it } from "vitest";
import { gpuPixelsToImageBytes, inferRowStride } from "./pixelBuffer";

/**
 * A readback buffer shaped exactly like three's: rows at `stride` bytes, bottom-up,
 * padding bytes poisoned with 0xff so any read that drifts into them is visible,
 * and the last row truncated to its real bytes (three.webgpu.js:73553).
 *
 * Each pixel is tagged with its own row/column so a skew of even one byte lands
 * on a value the assertions do not expect.
 */
const makeReadback = (width: number, height: number, stride: number): Uint8Array => {
  const rowBytes = width * 4;
  const buf = new Uint8Array((height - 1) * stride + rowBytes).fill(0xff);
  for (let row = 0; row < height; row++) {
    for (let x = 0; x < width; x++) {
      const at = row * stride + x * 4;
      buf.set([row, x, 0x10, 0xf0], at);
    }
  }
  return buf;
};

/** What `makeReadback`'s row `row` should look like once unpadded. */
const expectedRow = (width: number, row: number): number[] =>
  Array.from({ length: width }, (_, x) => [row, x, 0x10, 0xf0]).flat();

describe("inferRowStride", () => {
  it("reports the 256-aligned stride for a padded buffer", () => {
    // width 3 -> 12 real bytes per row, padded up to 256.
    expect(inferRowStride(3 * 256 + 12, 3, 4)).toBe(256);
  });

  it("reports the tight stride when three hands back unpadded rows", () => {
    // The upgrade-proofing branch: same dimensions, buffer sized without padding.
    expect(inferRowStride(4 * 12, 3, 4)).toBe(12);
  });

  it("is unambiguous when the row is already 256-aligned", () => {
    // width 64 -> 256 bytes per row: padded and tight coincide, both correct.
    expect(inferRowStride(8 * 256, 64, 8)).toBe(256);
  });

  it("throws rather than guess at a buffer too short to be either layout", () => {
    expect(() => inferRowStride(10, 3, 4)).toThrow(/too short/);
  });
});

describe("gpuPixelsToImageBytes", () => {
  it("drops the row padding instead of skewing into it", () => {
    const width = 3;
    const height = 4;
    const out = gpuPixelsToImageBytes(makeReadback(width, height, 256), width, height);

    expect(out.length).toBe(width * height * 4);
    // No 0xff-tagged padding byte survived into the image.
    expect(Array.from(out.slice(0, 4))).toEqual([height - 1, 0, 0x10, 0xf0]);
  });

  it("flips bottom-up GPU rows into top-down image rows", () => {
    const width = 3;
    const height = 4;
    const out = gpuPixelsToImageBytes(makeReadback(width, height, 256), width, height);

    for (let y = 0; y < height; y++) {
      const row = Array.from(out.slice(y * width * 4, (y + 1) * width * 4));
      expect(row).toEqual(expectedRow(width, height - 1 - y));
    }
  });

  it("handles an already-aligned width, where there is no padding to drop", () => {
    const width = 64;
    const height = 3;
    const out = gpuPixelsToImageBytes(makeReadback(width, height, 256), width, height);

    for (let y = 0; y < height; y++) {
      const row = Array.from(out.slice(y * width * 4, (y + 1) * width * 4));
      expect(row).toEqual(expectedRow(width, height - 1 - y));
    }
  });

  it("differs from the old unpadded read, which is what striped the image", () => {
    // Guards the guard: if the naive read ever stops skewing, the assertions
    // above are proving nothing. Row 0 lands correctly either way — the drift
    // starts at row 1, which the buggy stride reads out of row 0's padding.
    const width = 3;
    const height = 4;
    const buf = makeReadback(width, height, 256);
    const rowBytes = width * 4;

    const naiveRow1 = Array.from(buf.subarray(rowBytes, rowBytes * 2));
    expect(naiveRow1).toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    expect(naiveRow1).not.toEqual(expectedRow(width, 1));
  });
});
