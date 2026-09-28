import { describe, expect, it } from "vitest";
import { bsplineTaps, bsplineWeights, reconstructTwoTap } from "./tricubic";

describe("bsplineWeights", () => {
  it("partition of unity for any fraction", () => {
    for (let f = 0; f < 1; f += 0.05) {
      const [w0, w1, w2, w3] = bsplineWeights(f);
      expect(w0 + w1 + w2 + w3).toBeCloseTo(1, 10);
    }
  });

  it("known values at f = 0 (on a voxel center)", () => {
    const [w0, w1, w2, w3] = bsplineWeights(0);
    expect(w0).toBeCloseTo(1 / 6, 10);
    expect(w1).toBeCloseTo(4 / 6, 10);
    expect(w2).toBeCloseTo(1 / 6, 10);
    expect(w3).toBeCloseTo(0, 10);
  });

  it("symmetry: w(f) is w(1−f) reversed", () => {
    for (let f = 0; f <= 1; f += 0.1) {
      const forward = bsplineWeights(f);
      const backward = bsplineWeights(1 - f);
      expect(forward[0]).toBeCloseTo(backward[3], 10);
      expect(forward[1]).toBeCloseTo(backward[2], 10);
    }
  });

  it("linear precision: Σ k·w_k reproduces the fraction", () => {
    // Support points at k = −1, 0, 1, 2 relative to the base index.
    for (let f = 0; f < 1; f += 0.05) {
      const [w0, w1, w2, w3] = bsplineWeights(f);
      expect(-1 * w0 + 0 * w1 + 1 * w2 + 2 * w3).toBeCloseTo(f, 10);
    }
  });
});

describe("bsplineTaps (two-tap decomposition)", () => {
  it("tap offsets stay within the cubic support (−1.5 … +1.5)", () => {
    for (let f = 0; f < 1; f += 0.05) {
      const { h0, h1, g0 } = bsplineTaps(f);
      expect(h0).toBeGreaterThanOrEqual(-1.5);
      expect(h0).toBeLessThanOrEqual(0.5);
      expect(h1).toBeGreaterThanOrEqual(0.5);
      expect(h1).toBeLessThanOrEqual(2.0);
      expect(g0).toBeGreaterThan(0);
      expect(g0).toBeLessThan(1);
    }
  });

  it("two trilinear taps reproduce the four-weight cubic on linear data", () => {
    // With a LINEAR signal, both the direct cubic sum and the two-tap form
    // must reproduce the signal exactly (B-splines have linear precision, and
    // the hardware lerp inside each tap is exact on linear data).
    const signal = (x: number) => 3 * x + 7;
    for (let f = 0; f < 1; f += 0.05) {
      expect(reconstructTwoTap(signal, 10, f)).toBeCloseTo(signal(10 + f), 8);
    }
  });

  it("two-tap equals direct four-weight sum on arbitrary data", () => {
    // Discrete samples at k∈{−1,0,1,2}; the tap's linear interpolation between
    // neighbors must combine to the exact four-weight sum.
    const samples = [-1, 0, 1, 2].map((k) => Math.sin(k * 1.7) * 5 + k * k);
    const sampleAt = (x: number) => {
      // linear interp over the discrete samples, x relative to base index 0
      const t = x + 1; // shift so samples[0] is at t=0
      const lo = Math.floor(t);
      const frac = t - lo;
      return samples[lo] * (1 - frac) + (samples[lo + 1] ?? samples[lo]) * frac;
    };
    for (let f = 0.05; f < 1; f += 0.1) {
      const [w0, w1, w2, w3] = bsplineWeights(f);
      const direct =
        w0 * samples[0] + w1 * samples[1] + w2 * samples[2] + w3 * samples[3];
      expect(reconstructTwoTap(sampleAt, 0, f)).toBeCloseTo(direct, 8);
    }
  });
});
