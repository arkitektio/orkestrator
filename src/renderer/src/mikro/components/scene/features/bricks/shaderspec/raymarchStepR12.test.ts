import { describe, expect, it } from "vitest";

import {
  desiredLevelForDistance,
  desiredLevelFrom,
  levelEndDistance,
  mipSampleCanWin,
  normalizeSlotValue,
  sampledStepLength,
} from "./raymarchStep";

/** Deterministic PRNG (mulberry32) — no Math.random in tests. */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe("levelEndDistance (per-segment level pick)", () => {
  const pyramids = [
    [1, 2, 4, 8, 16],
    [1, 2, 4.22, 8.44],
    [1, 1, 3, 9],
    [1],
  ];

  it("marching with the cached segment end picks the same level as every step", () => {
    const random = rng(7);
    for (const scales of pyramids) {
      for (let trial = 0; trial < 200; trial++) {
        const px = 20 + random() * 4000;
        const bias = 0.5 + random() * 2;
        const floor = Math.floor(random() * scales.length);
        let level = 0;
        let end = -1;
        let distance = random() * 5;
        for (let step = 0; step < 400; step++) {
          if (distance > end) {
            level = desiredLevelFrom(level, distance, px, scales, bias, floor);
            end = levelEndDistance(level, px, scales, bias);
          }
          expect(level).toBe(desiredLevelForDistance(distance, px, scales, bias, floor));
          distance += random() * 40;
        }
      }
    }
  });

  it("holds forever in ortho and on the coarsest level", () => {
    expect(levelEndDistance(0, 0, [1, 2, 4], 1)).toBe(Number.POSITIVE_INFINITY);
    expect(levelEndDistance(2, 500, [1, 2, 4], 1)).toBe(Number.POSITIVE_INFINITY);
    expect(levelEndDistance(1, 500, [1, 2, 4], 1)).toBe(1000);
  });
});

describe("sampledStepLength (stride follows the level that is read)", () => {
  const base = { desiredStep: 0.75, sampledStep: 3, desiredLevel: 0, sampledLevel: 2 };

  it("is the desired stride when the sample resolves at the desired level", () => {
    expect(sampledStepLength({ ...base, sampledLevel: 0, boxExit: 100 })).toBe(0.75);
  });

  it("takes the coarse stride inside a coarse brick", () => {
    expect(sampledStepLength({ ...base, boxExit: 100 })).toBe(3);
  });

  it("stops at the box exit, so a finer brick behind it is entered at its face", () => {
    expect(sampledStepLength({ ...base, boxExit: 1.2 })).toBeCloseTo(1.21, 10);
  });

  it("is never shorter than the desired stride (termination guarantee)", () => {
    const random = rng(3);
    for (let i = 0; i < 500; i++) {
      const desiredStep = 0.1 + random() * 4;
      const length = sampledStepLength({
        desiredStep,
        sampledStep: desiredStep * (1 + random() * 8),
        desiredLevel: 1,
        sampledLevel: 1 + Math.floor(random() * 4),
        boxExit: random() * 6 - 1,
      });
      expect(length).toBeGreaterThanOrEqual(desiredStep);
    }
  });
});

describe("mipSampleCanWin (raw gate of a fixed-shape MIP member)", () => {
  it("a gated march ends on the same max norm as a march that normalizes every sample", () => {
    const random = rng(11);
    for (let trial = 0; trial < 300; trial++) {
      const slot = {
        climMin: random() * 0.5,
        climMax: 0.5 + random() * 0.5,
        gamma: 0.2 + random() * 3,
        invert: false,
        visible: true,
      };
      const raws = Array.from({ length: 120 }, () => Math.floor(random() * 300) - 20);
      // Reference: normalize every sample, strict `>` on the norm.
      let refBest = 0;
      let refIndex = -1;
      raws.forEach((raw, index) => {
        const norm = normalizeSlotValue(raw, 0, 255, slot);
        if (norm > refBest) {
          refBest = norm;
          refIndex = index;
        }
      });
      // Gated: normalize only a raw value above the largest normalized so far.
      let bestRaw = -1e30;
      let best = 0;
      let bestIndex = -1;
      let normalizes = 0;
      raws.forEach((raw, index) => {
        if (!mipSampleCanWin(raw, bestRaw)) return;
        bestRaw = raw;
        normalizes++;
        const norm = normalizeSlotValue(raw, 0, 255, slot);
        if (norm > best) {
          best = norm;
          bestIndex = index;
        }
      });
      expect(best).toBe(refBest);
      // Same WINNER too — the depth view reads its ray position.
      expect(bestIndex).toBe(refIndex);
      expect(normalizes).toBeLessThan(raws.length);
    }
  });
});
