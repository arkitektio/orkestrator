import { describe, expect, it } from "vitest";

import {
  STATUS_EMPTY,
  STATUS_RESIDENT,
  STATUS_UNMAPPED,
  attenuatedMipDone,
  attenuationAt,
  desiredLevelForDistance,
  directionProjectedPitch,
  emptyStepMaxNorm,
  normalizeSlotValue,
  occupancyUpperNorm,
  occupancyUpperNormPerSlab,
  residentBrickSkippable,
  shouldSkipStep,
  type MemberSkipState,
  type SlotTransfer,
} from "./raymarchStep";

const slot = (overrides: Partial<SlotTransfer> = {}): SlotTransfer => ({
  climMin: 0,
  climMax: 1,
  gamma: 1,
  invert: false,
  visible: true,
  ...overrides,
});

describe("shouldSkipStep", () => {
  it("always skips an unmapped chain", () => {
    expect(shouldSkipStep(STATUS_UNMAPPED, 0)).toBe(true);
    expect(shouldSkipStep(STATUS_UNMAPPED, 1)).toBe(true);
  });

  it("never skips a resident brick", () => {
    expect(shouldSkipStep(STATUS_RESIDENT, 0)).toBe(false);
    expect(shouldSkipStep(STATUS_RESIDENT, 1)).toBe(false);
  });

  it("skips an EMPTY brick only when nothing contributes", () => {
    expect(shouldSkipStep(STATUS_EMPTY, 0.001)).toBe(true);
    expect(shouldSkipStep(STATUS_EMPTY, 0.0011)).toBe(false);
  });
});

describe("normalizeSlotValue", () => {
  it("windows into the clim range", () => {
    expect(normalizeSlotValue(50, 0, 100, slot())).toBeCloseTo(0.5, 5);
    expect(normalizeSlotValue(25, 0, 100, slot({ climMin: 0.25, climMax: 0.75 }))).toBe(0);
    expect(normalizeSlotValue(75, 0, 100, slot({ climMin: 0.25, climMax: 0.75 }))).toBeCloseTo(
      0.999,
      5,
    );
  });

  it("clamps to 0.999 before gamma so only invert reaches 1", () => {
    expect(normalizeSlotValue(1e9, 0, 100, slot())).toBeCloseTo(0.999, 6);
    expect(normalizeSlotValue(-1e9, 0, 100, slot({ invert: true }))).toBe(1);
  });

  it("applies gamma to the windowed norm", () => {
    expect(normalizeSlotValue(25, 0, 100, slot({ gamma: 2 }))).toBeCloseTo(0.0625, 5);
  });

  it("never exceeds 1 for any input (the ATTENUATED_MIP bound relies on it)", () => {
    for (const raw of [-1e12, 0, 1e-9, 42, 1e12]) {
      for (const s of [slot(), slot({ invert: true }), slot({ gamma: 0.1 })]) {
        const norm = normalizeSlotValue(raw, 0, 100, s);
        expect(norm).toBeGreaterThanOrEqual(0);
        expect(norm).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("emptyStepMaxNorm", () => {
  it("takes the max over visible slots only", () => {
    const slots = [
      slot({ visible: false, invert: true }), // would be ~1 if visible
      slot({ climMin: 0.4, climMax: 0.6 }),
    ];
    // emptyValue 0 → windowed norm 0 for the visible slot.
    expect(emptyStepMaxNorm(0, 0, 100, slots)).toBe(0);
  });

  it("a contributing empty value defeats the skip", () => {
    expect(emptyStepMaxNorm(50, 0, 100, [slot()])).toBeCloseTo(0.5, 5);
  });

  it("an inverted slot makes a zero empty value contribute", () => {
    expect(emptyStepMaxNorm(0, 0, 100, [slot({ invert: true })])).toBe(1);
  });

  it("no visible slots → zero (skippable)", () => {
    expect(emptyStepMaxNorm(50, 0, 100, [slot({ visible: false })])).toBe(0);
  });
});

describe("attenuatedMipDone", () => {
  it("terminates once the best reaches the depth ceiling", () => {
    expect(attenuatedMipDone(1.0, 0)).toBe(true);
    expect(attenuatedMipDone(0.99, 0)).toBe(false);
    expect(attenuatedMipDone(0.3, 1)).toBe(true); // exp(-1.5) ≈ 0.223
  });

  it("no reachable future contribution can exceed the bound", () => {
    // Property: for any state where done fires at depth d, every later sample
    // (norm ≤ 1, depth > d) produces a weighted value strictly below the
    // accumulated max, so the image is unchanged by termination.
    for (const d of [0, 0.1, 0.5, 0.9]) {
      const bound = attenuationAt(d);
      const accumulated = bound; // the smallest max that triggers done
      for (const futureDepth of [d + 1e-6, d + 0.1, 1]) {
        for (const norm of [0, 0.5, 0.999, 1]) {
          const future = norm * attenuationAt(futureDepth);
          expect(future).toBeLessThan(accumulated);
        }
      }
    }
  });

  it("monotone: attenuation strictly decreases with depth", () => {
    let previous = attenuationAt(0);
    for (let d = 0.05; d <= 1; d += 0.05) {
      const current = attenuationAt(d);
      expect(current).toBeLessThan(previous);
      previous = current;
    }
  });
});

describe("occupancyUpperNorm", () => {
  it("bounds every raw value in the bracket for a monotone window", () => {
    const s = slot({ climMin: 0.2, climMax: 0.8 });
    const upper = occupancyUpperNorm(10, 40, 0, 100, [s]);
    for (let raw = 10; raw <= 40; raw += 1) {
      expect(normalizeSlotValue(raw, 0, 100, s)).toBeLessThanOrEqual(upper + 1e-9);
    }
  });

  it("bounds inverted channels via the MIN endpoint", () => {
    const s = slot({ invert: true });
    // Low raw values are BRIGHT under inversion: the bound must come from
    // brickMin, not brickMax.
    const upper = occupancyUpperNorm(10, 40, 0, 100, [s]);
    expect(upper).toBeCloseTo(normalizeSlotValue(10, 0, 100, s), 9);
    for (let raw = 10; raw <= 40; raw += 1) {
      expect(normalizeSlotValue(raw, 0, 100, s)).toBeLessThanOrEqual(upper + 1e-9);
    }
  });

  it("ignores invisible slots and maxes across visible ones", () => {
    const dim = slot({ climMin: 0.9, climMax: 1 });
    const hot = slot({ climMin: 0, climMax: 0.1 });
    expect(occupancyUpperNorm(5, 8, 0, 100, [dim, slot({ visible: false })])).toBe(0);
    // hot: baseNorm(8) = 0.08 → windowed over [0, 0.1] = 0.8.
    expect(occupancyUpperNorm(5, 8, 0, 100, [dim, hot])).toBeCloseTo(0.8, 5);
  });
});

describe("residentBrickSkippable", () => {
  const member = (overrides: Partial<MemberSkipState> = {}): MemberSkipState => ({
    projectionMode: 0,
    upperNorm: 0.5,
    bestNorm: 0,
    isoThreshold: 0.5,
    done: false,
    ...overrides,
  });

  it("skips a brick invisible under the clim window in any mode", () => {
    for (const projectionMode of [0, 1, 2, 3]) {
      expect(residentBrickSkippable([member({ projectionMode, upperNorm: 0.001 })])).toBe(true);
      expect(residentBrickSkippable([member({ projectionMode: 1, upperNorm: 0.1 })])).toBe(
        false,
      );
    }
  });

  it("MIP skips bricks that cannot beat the accumulated max", () => {
    expect(residentBrickSkippable([member({ upperNorm: 0.4, bestNorm: 0.4 })])).toBe(true);
    expect(residentBrickSkippable([member({ upperNorm: 0.41, bestNorm: 0.4 })])).toBe(false);
    // Fresh ray (bestNorm 0): only invisible bricks skip.
    expect(residentBrickSkippable([member({ upperNorm: 0.1, bestNorm: 0 })])).toBe(false);
  });

  it("ISO skips bricks that never reach the threshold", () => {
    expect(
      residentBrickSkippable([member({ projectionMode: 3, upperNorm: 0.49, isoThreshold: 0.5 })]),
    ).toBe(true);
    expect(
      residentBrickSkippable([member({ projectionMode: 3, upperNorm: 0.5, isoThreshold: 0.5 })]),
    ).toBe(false);
  });

  it("hops only when EVERY member is satisfied", () => {
    const beaten = member({ upperNorm: 0.3, bestNorm: 0.4 });
    const hungry = member({ upperNorm: 0.3, bestNorm: 0.2 });
    expect(residentBrickSkippable([beaten, hungry])).toBe(false);
    expect(residentBrickSkippable([beaten, member({ ...hungry, done: true })])).toBe(true);
    expect(residentBrickSkippable([beaten, beaten])).toBe(true);
  });

  it("a skipped brick provably cannot change a MIP accumulator", () => {
    // Property over random states: when a MIP member is skippable, every
    // reachable sample norm in the brick (≤ upperNorm) stays within the
    // accumulated max, up to the shared invisible threshold (0.001).
    for (let i = 0; i < 200; i++) {
      const best = Math.random();
      const upper = Math.random();
      const m = member({ upperNorm: upper, bestNorm: best });
      if (!residentBrickSkippable([m])) continue;
      expect(upper).toBeLessThanOrEqual(Math.max(best, 0.001));
    }
  });
});

describe("occupancy observed-range golden (dim uint16, the F3 fix)", () => {
  // Dim fluorescence: uint16 pool, data peaks at ~2000 of 65535, clim window
  // [200, 1800] raw. Encoded against the DTYPE range every brick collapses
  // into a handful of 257-raw-unit codes and the skip predicates lose their
  // discrimination; against the OBSERVED range they regain it. The decode
  // path mirrors the shader exactly: decodeOccupancyBounds → occupancyUpperNorm.
  const pool = { minValue: 0, maxValue: 65535 };
  const observed = { minValue: 0, maxValue: 2000 };
  const dimSlot = slot({ climMin: 200 / 65535, climMax: 1800 / 65535 });

  const upperFor = async (
    brick: [number, number],
    encodeRange: { minValue: number; maxValue: number },
  ): Promise<number> => {
    const { encodeOccupancyTexel, decodeOccupancyBounds } = await import(
      "../octree/brickEncoding"
    );
    const bounds = decodeOccupancyBounds(
      encodeOccupancyTexel(brick[0], brick[1], encodeRange),
      encodeRange,
      pool,
    );
    return occupancyUpperNorm(bounds.minValue, bounds.maxValue, pool.minValue, pool.maxValue, [
      dimSlot,
    ]);
  };

  it("sub-window bricks become invisible (dtype encoding missed them)", async () => {
    // True brick max 150 sits below the clim window (200): truly invisible.
    // The dtype-range code inflates the decoded max past the window edge —
    // the skip never fires; the observed-range code keeps it below.
    expect(await upperFor([0, 150], pool)).toBeGreaterThan(0.001);
    expect(await upperFor([0, 150], observed)).toBeLessThanOrEqual(0.001);
  });

  it("MIP maximum-culling discriminates near the accumulator (dtype did not)", async () => {
    const bestNorm = 0.83; // ray already saw a brighter brick
    // True upper of a [0,1500] brick ≈ 0.812 — beatable. The dtype code
    // inflates it to ≈0.839 (not beaten); the observed code stays ≈0.816.
    expect((await upperFor([0, 1500], pool)) <= bestNorm).toBe(false);
    expect((await upperFor([0, 1500], observed)) <= bestNorm).toBe(true);
  });

  it("feeds residentBrickSkippable end to end", async () => {
    const upper = await upperFor([0, 1500], observed);
    const member: MemberSkipState = {
      projectionMode: 0,
      upperNorm: upper,
      bestNorm: 0.83,
      isoThreshold: 0.5,
      done: false,
    };
    expect(residentBrickSkippable([member])).toBe(true);
  });
});

describe("directionProjectedPitch (Phase B stride rule)", () => {
  const unit = (v: [number, number, number]): [number, number, number] => {
    const n = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / n, v[1] / n, v[2] / n];
  };
  const randomUnit = (): [number, number, number] =>
    unit([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1]);

  it("axis-aligned rays step by that axis' scale", () => {
    const scale: [number, number, number] = [8, 8, 1];
    expect(directionProjectedPitch([1, 0, 0], scale)).toBeCloseTo(0.75 * 8, 6);
    expect(directionProjectedPitch([0, 1, 0], scale)).toBeCloseTo(0.75 * 8, 6);
    // The face-on fix: down z the pitch is the z scale, not the xy factor.
    expect(directionProjectedPitch([0, 0, 1], scale)).toBeCloseTo(0.75 * 1, 6);
  });

  it("reduces exactly to the legacy rule on isotropic levels, any direction", () => {
    for (let i = 0; i < 200; i++) {
      const s = 1 + Math.random() * 30;
      expect(directionProjectedPitch(randomUnit(), [s, s, s])).toBeCloseTo(0.75 * s, 4);
    }
  });

  it("never oversamples the coarsest axis and never undersamples any axis", () => {
    for (let i = 0; i < 500; i++) {
      const scale: [number, number, number] = [
        1 + Math.random() * 30,
        1 + Math.random() * 30,
        1 + Math.random() * 30,
      ];
      const dir = randomUnit();
      const pitch = directionProjectedPitch(dir, scale);
      // ≤ legacy max-axis pitch (the never-oversample bound)…
      expect(pitch).toBeLessThanOrEqual(0.75 * Math.max(...scale) + 1e-9);
      // …and ≤ the per-axis crossing distance on EVERY axis (≥ ~one sample
      // per voxel crossing — strictly stronger than Amanatides).
      for (const axis of [0, 1, 2] as const) {
        if (Math.abs(dir[axis]) < 1e-6) continue;
        expect(pitch).toBeLessThanOrEqual(
          (0.75 * scale[axis]) / Math.abs(dir[axis]) + 1e-9,
        );
      }
    }
  });

  it("keeps the uMaxSteps termination guarantee arithmetic intact", () => {
    // floorDelta = rayLen / uMaxSteps stays in the stepLen max under both
    // stride rules, so uMaxSteps steps of ≥ floorDelta always cross rayLen.
    const rayLen = 3473;
    const uMaxSteps = 512;
    const floorDelta = rayLen / uMaxSteps;
    const stepLen = Math.max(floorDelta, directionProjectedPitch([1, 0, 0], [1, 1, 1]));
    expect(stepLen * uMaxSteps).toBeGreaterThanOrEqual(rayLen);
  });
});

describe("desiredLevelForDistance (the R4 hop's level-guard argument)", () => {
  const maxScales = [1, 2, 4.5, 9, 23.5];

  it("is monotone non-finer in distance — so the finest desired level on a forward ray segment is at its start", () => {
    const pxPerUnit = 500;
    let previous = 0;
    for (let distance = 1; distance <= 20000; distance *= 1.3) {
      const level = desiredLevelForDistance(distance, pxPerUnit, maxScales, 1, 0);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it("clamps to the desired floor and to the coarsest level", () => {
    expect(desiredLevelForDistance(1, 500, maxScales, 1, 2)).toBe(2);
    expect(desiredLevelForDistance(1e9, 500, maxScales, 1, 0)).toBe(maxScales.length - 1);
  });

  it("orthographic (pxPerUnit ≤ 0) is the constant floor — trivially segment-safe", () => {
    expect(desiredLevelForDistance(1, 0, maxScales, 1, 3)).toBe(3);
    expect(desiredLevelForDistance(1e6, 0, maxScales, 1, 3)).toBe(3);
  });
});

describe("desiredLevelForDistance world metric (uVoxelWorldSize lockstep)", () => {
  // κ=10 SPIM metric diag(0.5, 0.5, 5) over an isotropic [1,2,4,8] pyramid:
  // per-level WORLD maxes = max_i(scale_i · w_i) — z carries every max.
  const w: [number, number, number] = [0.5, 0.5, 5];
  const levelScales: [number, number, number][] = [
    [1, 1, 1],
    [2, 2, 2],
    [4, 4, 4],
    [8, 8, 8],
  ];
  const worldMaxes = levelScales.map((s) =>
    Math.max(s[0] * w[0], s[1] * w[1], s[2] * w[2]),
  ); // [5, 10, 20, 40]
  const minWorld = Math.max(...w); // one world voxel — the shader's min clamp
  const pxPerUnit = 100;

  it("goldens: the world call picks by px per WORLD unit", () => {
    // px/world at d=400 → 0.25; 0.25·5 = 1.25 ≥ 1 ⇒ level 0.
    expect(desiredLevelForDistance(400, pxPerUnit, worldMaxes, 1, 0, minWorld)).toBe(0);
    // d=800 → 0.125; 0.125·5 < 1 but 0.125·10 = 1.25 ⇒ level 1.
    expect(desiredLevelForDistance(800, pxPerUnit, worldMaxes, 1, 0, minWorld)).toBe(1);
    // d=8000 → 0.0125; even the coarsest golden: 0.0125·40 = 0.5 < 1 ⇒ 3.
    expect(desiredLevelForDistance(8000, pxPerUnit, worldMaxes, 1, 0, minWorld)).toBe(3);
  });

  it("clamps distances below one world voxel (max axis), mirroring max(dist, minWorld)", () => {
    expect(desiredLevelForDistance(0.01, pxPerUnit, worldMaxes, 1, 0, minWorld)).toBe(
      desiredLevelForDistance(minWorld, pxPerUnit, worldMaxes, 1, 0, minWorld),
    );
  });

  it("stays monotone non-finer in world distance — the R4 hop argument survives the metric", () => {
    let previous = 0;
    for (let distance = 0.1; distance <= 200000; distance *= 1.3) {
      const level = desiredLevelForDistance(distance, pxPerUnit, worldMaxes, 1, 0, minWorld);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it("identity metric defaults reproduce the legacy call exactly", () => {
    const voxelMaxes = levelScales.map((s) => Math.max(...s));
    for (let distance = 0.5; distance <= 20000; distance *= 2.1) {
      expect(
        desiredLevelForDistance(distance, pxPerUnit, voxelMaxes, 1, 0, 1),
      ).toBe(desiredLevelForDistance(distance, pxPerUnit, voxelMaxes, 1, 0));
    }
  });
});

describe("aggregate hop predicate (R4 reuses residentBrickSkippable)", () => {
  it("hops a coarse cell whose AGGREGATE bounds prove every member skippable", () => {
    // Aggregate union [0, 150] on the dim-uint16 pool from the observed-range
    // golden above: below the clim window ⇒ invisible ⇒ whole cell hops.
    const member: MemberSkipState = {
      projectionMode: 0,
      upperNorm: occupancyUpperNorm(0, 150, 0, 65535, [
        slot({ climMin: 200 / 65535, climMax: 1800 / 65535 }),
      ]),
      bestNorm: 0,
      isoThreshold: 0.5,
      done: false,
    };
    expect(residentBrickSkippable([member])).toBe(true);
  });

  it("an unknown aggregate (full-range decode) never hops", () => {
    const member: MemberSkipState = {
      projectionMode: 0,
      upperNorm: occupancyUpperNorm(0, 65535, 0, 65535, [
        slot({ climMin: 200 / 65535, climMax: 1800 / 65535 }),
      ]),
      bestNorm: 0.9,
      isoThreshold: 0.5,
      done: false,
    };
    expect(residentBrickSkippable([member])).toBe(false);
  });
});

describe("occupancyUpperNormPerSlab", () => {
  const slots = [
    { ...slot({ climMin: 0.1, climMax: 0.8 }), slab: 0 },
    { ...slot({ climMin: 0.1, climMax: 0.8 }), slab: 1 },
    { ...slot({ climMin: 0.1, climMax: 0.8 }), slab: 2 },
  ];

  it("equals the union predicate when every slab shares the union bracket", () => {
    const union = { min: 10, max: 200 };
    expect(occupancyUpperNormPerSlab([union, union, union], 0, 255, slots)).toBe(
      occupancyUpperNorm(10, 200, 0, 255, slots),
    );
  });

  it("is never looser than the union, and tighter when one bright slab dominated it", () => {
    // Red is bright; green and blue are dark. The union says "bright".
    const perSlab = [
      { min: 150, max: 200 },
      { min: 0, max: 5 },
      { min: 0, max: 5 },
    ];
    const union = occupancyUpperNorm(0, 200, 0, 255, slots);
    const greenBlueOnly = slots.slice(1);
    expect(occupancyUpperNormPerSlab(perSlab, 0, 255, greenBlueOnly)).toBeLessThan(union);
    expect(occupancyUpperNormPerSlab(perSlab, 0, 255, slots)).toBeLessThanOrEqual(union);
    // Under this window the dark slabs are invisible (≤ 0.001): skippable.
    expect(occupancyUpperNormPerSlab(perSlab, 0, 255, greenBlueOnly)).toBeLessThanOrEqual(0.001);
  });

  it("skips invisible slots and falls back to slab 0 for an out-of-range slab index", () => {
    const perSlab = [{ min: 0, max: 255 }];
    expect(
      occupancyUpperNormPerSlab(perSlab, 0, 255, [{ ...slot({ visible: false }), slab: 0 }]),
    ).toBe(0);
    expect(occupancyUpperNormPerSlab(perSlab, 0, 255, [{ ...slot(), slab: 7 }])).toBe(
      occupancyUpperNorm(0, 255, 0, 255, [slot()]),
    );
  });
});
