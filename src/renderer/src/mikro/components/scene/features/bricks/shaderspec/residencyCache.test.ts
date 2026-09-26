import { describe, expect, it } from "vitest";

import {
  resolveResidency,
  residencyCacheHit,
  type ResidencyLevel,
  type Vec3,
} from "./residencyCache";

/** Deterministic PRNG so a failure reproduces. */
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pyramid = (base: Vec3, scales: Vec3[]): ResidencyLevel[] =>
  scales.map((scale) => ({
    scale,
    shape: [0, 1, 2].map((a) => Math.max(1, Math.ceil(base[a] / scale[a]))) as unknown as Vec3,
  }));

const randomFlags = (rand: () => number) => {
  const memo = new Map<string, number>();
  return (level: number, brick: Vec3) => {
    const key = `${level}:${brick.join(",")}`;
    if (!memo.has(key)) {
      const r = rand();
      memo.set(key, r < 0.4 ? 0 : r < 0.8 ? 1 : 2);
    }
    return memo.get(key)!;
  };
};

const cases: { name: string; base: Vec3; payload: Vec3; scales: Vec3[] }[] = [
  { name: "dyadic", base: [512, 512, 256], payload: [64, 64, 64], scales: [[1, 1, 1], [2, 2, 2], [4, 4, 4], [8, 8, 8]] },
  { name: "xy-only [2^n,2^n,1]", base: [512, 512, 40], payload: [64, 64, 40], scales: [[1, 1, 1], [2, 2, 1], [4, 4, 1]] },
  { name: "non-nested (z 4.22)", base: [300, 300, 211], payload: [32, 32, 32], scales: [[1, 1, 1], [2, 2, 4.22], [4.4, 4.4, 9.1]] },
];

describe("residency cache validity", () => {
  for (const c of cases) {
    it(`a cache hit resolves exactly like a fresh walk — ${c.name}`, () => {
      const rand = mulberry32(42);
      const flagAt = randomFlags(rand);
      const levels = pyramid(c.base, c.scales);
      let hits = 0;
      for (let trial = 0; trial < 4000; trial++) {
        const desired = Math.floor(rand() * levels.length);
        const p: Vec3 = [rand() * c.base[0], rand() * c.base[1], rand() * c.base[2]];
        const cached = resolveResidency(p, desired, levels, c.payload, flagAt);
        // A nearby point, as the next ray step would be.
        const q: Vec3 = [
          p[0] + (rand() - 0.5) * 40,
          p[1] + (rand() - 0.5) * 40,
          p[2] + (rand() - 0.5) * 40,
        ];
        if (!residencyCacheHit({ desiredLevel: desired, ...cached }, q, desired)) continue;
        hits++;
        const fresh = resolveResidency(q, desired, levels, c.payload, flagAt);
        expect(fresh.status).toBe(cached.status);
        expect(fresh.level).toBe(cached.level);
        expect(fresh.brick).toEqual(cached.brick);
      }
      // The cache must actually hit, or it saves nothing.
      expect(hits).toBeGreaterThan(400);
    });
  }

  it("misses when the desired level changes", () => {
    const levels = pyramid([128, 128, 128], [[1, 1, 1], [2, 2, 2]]);
    const cached = resolveResidency([10, 10, 10], 0, levels, [64, 64, 64], () => 1);
    expect(residencyCacheHit({ desiredLevel: 0, ...cached }, [11, 11, 11], 0)).toBe(true);
    expect(residencyCacheHit({ desiredLevel: 0, ...cached }, [11, 11, 11], 1)).toBe(false);
  });

  it("never trusts a point on a brick boundary", () => {
    const levels = pyramid([128, 128, 128], [[1, 1, 1]]);
    const cached = resolveResidency([10, 10, 10], 0, levels, [64, 64, 64], () => 1);
    expect(residencyCacheHit({ desiredLevel: 0, ...cached }, [64, 10, 10], 0)).toBe(false);
    expect(residencyCacheHit({ desiredLevel: 0, ...cached }, [0, 10, 10], 0)).toBe(false);
  });
});
