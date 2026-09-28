import { describe, expect, it } from "vitest";

import { jitterHash } from "./jitterHash";

describe("jitterHash (pcg2d ray jitter)", () => {
  it("stays in [0, 1) for pixels far from the origin", () => {
    for (const [x, y] of [
      [0, 0],
      [7680, 4320],
      [65535, 65535],
      [4294967295, 4294967295],
    ]) {
      const v = jitterHash(x, y);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic per pixel (motion-invariant, P14)", () => {
    expect(jitterHash(123, 456)).toBe(jitterHash(123, 456));
  });

  it("is roughly uniform and decorrelated between neighbours", () => {
    const bins = new Array(10).fill(0);
    let neighbourDelta = 0;
    const n = 256;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = jitterHash(x + 1000, y + 2000);
        bins[Math.floor(v * 10)] += 1;
        neighbourDelta += Math.abs(v - jitterHash(x + 1001, y + 2000));
      }
    }
    const expected = (n * n) / 10;
    for (const count of bins) expect(Math.abs(count - expected) / expected).toBeLessThan(0.05);
    // Independent uniforms differ by 1/3 on average; a smooth hash would not.
    expect(neighbourDelta / (n * n)).toBeGreaterThan(0.3);
  });
});
