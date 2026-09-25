import { describe, expect, it } from "vitest";
import { decodeEmptyValue, encodeEmptyTexel, encodeEmptyValue } from "./brickEncoding";

/**
 * EMPTY (uniform-fill) bricks survive only as an 8-bit page-table byte, so the
 * value the GPU renders is the encode→decode round-trip — not the raw value.
 * `decodeEmptyValue` is the CPU mirror that keeps `sampleResident` in lockstep
 * with the shader (OCTREE_RENDERER.md P11).
 */
describe("EMPTY-brick encode/decode round-trip", () => {
  const range = { minValue: 0, maxValue: 65535 }; // uint16

  it("encodes the bounds to 0 and 255 and decodes them back exactly", () => {
    expect(encodeEmptyValue(0, range)).toBe(0);
    expect(encodeEmptyValue(65535, range)).toBe(255);
    expect(decodeEmptyValue(0, range)).toBe(0);
    expect(decodeEmptyValue(255, range)).toBe(65535);
  });

  it("is idempotent under a second round-trip (decode lands on the code grid)", () => {
    for (const raw of [100, 4000, 32000, 60000]) {
      const once = decodeEmptyValue(encodeEmptyValue(raw, range), range);
      const twice = decodeEmptyValue(encodeEmptyValue(once, range), range);
      expect(twice).toBeCloseTo(once, 6);
    }
  });

  it("quantizes uint16 to ~257-unit steps (the inherent P11 precision loss)", () => {
    // 4000 and 4100 are within one 8-bit code (~257 raw units) → same rendered value.
    const a = decodeEmptyValue(encodeEmptyValue(4000, range), range);
    const b = decodeEmptyValue(encodeEmptyValue(4100, range), range);
    expect(a).toBe(b);
    // The round-trip error stays within one code step.
    expect(Math.abs(a - 4000)).toBeLessThanOrEqual(65535 / 255);
  });

  it("returns min when the range is degenerate", () => {
    expect(encodeEmptyValue(500, { minValue: 7, maxValue: 7 })).toBe(0);
    expect(decodeEmptyValue(0, { minValue: 7, maxValue: 7 })).toBe(7);
  });
});

/**
 * LABEL pools encode an EMPTY brick's value 24-bit across r,g,b instead. This is
 * the test the whole label render path rests on: a segmentation mask is MOSTLY
 * uniform bricks — the background between objects, the interior of any large
 * object — so an id that does not survive this round-trip is not a small
 * precision loss, it is most of the mask painted as the wrong object.
 */
describe("24-bit EMPTY encoding for label ids", () => {
  const idRange = { minValue: 0, maxValue: 2 ** 24 - 1 };

  it("round-trips EXACTLY over the whole id range", () => {
    const ids = [
      0, 1, 2, 3, 7, 255, 256, 257, 65535, 65536, 65537,
      1_000_000, 8_388_607, 8_388_608, 16_777_214, 2 ** 24 - 1,
    ];
    for (const id of ids) {
      expect(decodeEmptyValue(encodeEmptyValue(id, idRange, 24), idRange, 24)).toBe(id);
    }
  });

  it("keeps CONSECUTIVE ids distinct — the property 8 bits destroys", () => {
    // At 8 bits these three collapse to one code over this range, so a mask's
    // uniform bricks would all decode to the same object.
    const codes = [4000, 4001, 4002].map((id) => encodeEmptyValue(id, idRange, 24));
    expect(new Set(codes).size).toBe(3);

    const eightBit = [4000, 4001, 4002].map((id) => encodeEmptyValue(id, idRange, 8));
    expect(new Set(eightBit).size).toBe(1);
  });

  it("splits the code little-endian across r,g,b and leaves 8-bit in r alone", () => {
    expect(encodeEmptyTexel(0x123456, idRange, 24)).toEqual([0x56, 0x34, 0x12]);
    expect(encodeEmptyTexel(0xff, idRange, 24)).toEqual([0xff, 0, 0]);
    // The historical shape is unchanged for intensity pools.
    expect(encodeEmptyTexel(65535, { minValue: 0, maxValue: 65535 }, 8)).toEqual([255, 0, 0]);
  });

  it("recomposes the way the shader does (bytes · (1, 256, 65536))", () => {
    // Lockstep with `emitResolveBrickResidency`'s EMPTY branch: if these weights
    // change on one side they must change on both.
    for (const id of [0, 1, 300, 70000, 2 ** 24 - 1]) {
      const [r, g, b] = encodeEmptyTexel(id, idRange, 24);
      expect(r + g * 256 + b * 65536).toBe(encodeEmptyValue(id, idRange, 24));
    }
  });

  it("defaults to 8 bits, so every existing intensity caller is unchanged", () => {
    const range = { minValue: 0, maxValue: 65535 };
    expect(encodeEmptyValue(32768, range)).toBe(encodeEmptyValue(32768, range, 8));
    expect(decodeEmptyValue(128, range)).toBe(decodeEmptyValue(128, range, 8));
  });

  it("still returns min for a degenerate range at either width", () => {
    expect(encodeEmptyValue(500, { minValue: 7, maxValue: 7 }, 24)).toBe(0);
    expect(decodeEmptyValue(0, { minValue: 7, maxValue: 7 }, 24)).toBe(7);
  });
});

describe("occupancy texel encode/decode", () => {
  const range = { minValue: 0, maxValue: 65535 };

  it("brackets the true brick range from the outside (conservative rounding)", async () => {
    const { encodeOccupancyTexel, decodeOccupancyBounds } = await import("./brickEncoding");
    for (let i = 0; i < 500; i++) {
      const a = Math.random() * 65535;
      const b = Math.random() * 65535;
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      const bounds = decodeOccupancyBounds(encodeOccupancyTexel(lo, hi, range), range);
      expect(bounds.minValue).toBeLessThanOrEqual(lo);
      expect(bounds.maxValue).toBeGreaterThanOrEqual(hi);
    }
  });

  it("the all-zero texel (fresh texture / unknown brick) decodes to the full range", async () => {
    const { decodeOccupancyBounds } = await import("./brickEncoding");
    const bounds = decodeOccupancyBounds([0, 0], range);
    expect(bounds.minValue).toBe(range.minValue);
    expect(bounds.maxValue).toBe(range.maxValue);
  });

  it("degenerate or non-finite inputs fall back to the conservative texel", async () => {
    const { encodeOccupancyTexel } = await import("./brickEncoding");
    expect(encodeOccupancyTexel(1, 2, { minValue: 5, maxValue: 5 })).toEqual([0, 0]);
    expect(encodeOccupancyTexel(Number.NaN, 2, range)).toEqual([0, 0]);
    expect(encodeOccupancyTexel(3, 2, range)).toEqual([0, 0]); // max < min
  });

  it("out-of-range values clamp without losing conservatism", async () => {
    const { encodeOccupancyTexel, decodeOccupancyBounds } = await import("./brickEncoding");
    const bounds = decodeOccupancyBounds(encodeOccupancyTexel(-100, 70000, range), range);
    // Clamped to the pool range — the shader's baseNorm clamps the same way,
    // so the bracket still bounds every *normalized* value.
    expect(bounds.minValue).toBe(0);
    expect(bounds.maxValue).toBe(65535);
  });
});

describe("occupancy observed-range encoding (encode range ≠ pool range)", () => {
  const pool = { minValue: -1000, maxValue: 1000 };
  const encode = { minValue: 0, maxValue: 100 };

  it("byte-0 sentinel decodes to the POOL endpoint, not the encode endpoint", async () => {
    const { decodeOccupancyBounds } = await import("./brickEncoding");
    const bounds = decodeOccupancyBounds([0, 0], encode, pool);
    expect(bounds.minValue).toBe(pool.minValue);
    expect(bounds.maxValue).toBe(pool.maxValue);
    // Non-zero codes decode against the ENCODE range.
    const mid = decodeOccupancyBounds([128, 128], encode, pool);
    expect(mid.minValue).toBeCloseTo((128 / 255) * 100, 5);
    expect(mid.maxValue).toBeCloseTo(((255 - 128) / 255) * 100, 5);
  });

  it("stale-encode corners stay conservative (bracket from the outside)", async () => {
    const { encodeOccupancyTexel, decodeOccupancyBounds } = await import("./brickEncoding");
    const bracketOf = (lo: number, hi: number) =>
      decodeOccupancyBounds(encodeOccupancyTexel(lo, hi, encode), encode, pool);
    const cases: Array<[number, number]> = [
      [-50, -10], // wholly below the encode range
      [150, 200], // wholly above
      [-50, 50], // straddling the low edge
      [50, 150], // straddling the high edge
    ];
    for (const [lo, hi] of cases) {
      const bounds = bracketOf(lo, hi);
      expect(bounds.minValue).toBeLessThanOrEqual(lo);
      expect(bounds.maxValue).toBeGreaterThanOrEqual(hi);
    }
    // Property sweep: random bricks vs the stale encode range.
    for (let i = 0; i < 500; i++) {
      const a = -900 + Math.random() * 1800;
      const b = -900 + Math.random() * 1800;
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      const bounds = bracketOf(lo, hi);
      expect(bounds.minValue).toBeLessThanOrEqual(lo);
      expect(bounds.maxValue).toBeGreaterThanOrEqual(hi);
    }
  });

  it("the observed range restores code resolution on dim data", async () => {
    const { encodeOccupancyTexel, decodeOccupancyBounds } = await import("./brickEncoding");
    const dtype = { minValue: 0, maxValue: 65535 };
    const observed = { minValue: 0, maxValue: 2000 };
    // A dim brick quantized against the dtype range: ~257 raw units/code.
    const coarse = decodeOccupancyBounds(
      encodeOccupancyTexel(500, 700, dtype),
      dtype,
      dtype,
    );
    // The same brick against the observed range: ~8 raw units/code.
    const fine = decodeOccupancyBounds(
      encodeOccupancyTexel(500, 700, observed),
      observed,
      dtype,
    );
    const trueWidth = 200;
    expect(coarse.maxValue - coarse.minValue).toBeGreaterThan(trueWidth + 200);
    expect(fine.maxValue - fine.minValue).toBeLessThanOrEqual(trueWidth + 2 * (2000 / 255));
  });
});
