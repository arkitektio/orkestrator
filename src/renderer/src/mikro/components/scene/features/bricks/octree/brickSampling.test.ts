import { describe, expect, it } from "vitest";
import { marchResidentBricks, type ProbeMarchStrategy } from "./brickSampling";
import type { Vec3 } from "../../../platform/coords/levelGeometry";

/**
 * 100³ base volume; a bright box occupies base voxels x ∈ [60, 100) — a ray
 * marching +x must report the first hit at local x ≈ 0.1 (60/100 - 0.5).
 */
const BASE: Vec3 = [100, 100, 100];
const sampler = (baseVoxel: Vec3) => (baseVoxel[0] >= 60 ? 200 : 0);

const march = (
  threshold: number,
  sample = sampler,
  strategy: ProbeMarchStrategy = "first-hit",
) =>
  marchResidentBricks({
    origin: [-0.5, 0, 0],
    direction: [1, 0, 0],
    bounds: [0, 1],
    baseShape: BASE,
    desiredLevel: 0,
    channel: 0,
    minValue: 0,
    maxValue: 255,
    climMin: 0,
    climMax: 1,
    threshold,
    sample,
    steps: 1000,
    strategy,
  });

describe("marchResidentBricks (first-hit)", () => {
  it("reports the first sample crossing the threshold", () => {
    const hit = march(0.5);
    expect(hit).not.toBeNull();
    expect(hit!.position[0]).toBeGreaterThan(0.09);
    expect(hit!.position[0]).toBeLessThan(0.12);
    expect(hit!.position[1]).toBeCloseTo(0, 5);
    expect(hit!.rawValue).toBe(200);
    expect(hit!.normalized).toBeGreaterThan(0.7);
  });

  it("falls back to the strongest visible sample when nothing crosses the threshold", () => {
    // 200/255 ≈ 0.784 normalized — below a 0.9 threshold, but the ray DID
    // cross visible data, so the cursor still probes it (flagged fallback).
    const hit = march(0.9);
    expect(hit).not.toBeNull();
    expect(hit!.fallback).toBe(true);
    expect(hit!.rawValue).toBe(200);
  });

  it("misses pure background even with the fallback", () => {
    expect(march(0.5, () => 0)).toBeNull();
  });

  it("skips unresident samples instead of treating them as hits", () => {
    const gappy = (baseVoxel: Vec3) => (baseVoxel[0] < 80 ? null : 255);
    const hit = march(0.5, gappy);
    expect(hit).not.toBeNull();
    expect(hit!.position[0]).toBeGreaterThan(0.29);
  });

  it("applies the clim window in shader lockstep", () => {
    // climMin 0.9 pushes 200/255 below any positive threshold.
    const hit = marchResidentBricks({
      origin: [-0.5, 0, 0],
      direction: [1, 0, 0],
      bounds: [0, 1],
      baseShape: BASE,
      desiredLevel: 0,
      channel: 0,
      minValue: 0,
      maxValue: 255,
      climMin: 0.9,
      climMax: 1,
      threshold: 0.01,
      sample: sampler,
    });
    expect(hit).toBeNull();
  });
});

describe("marchResidentBricks over LABEL ids (the 3D mask probe)", () => {
  // The label layer's parameterization: the trivial [0, 1] window and a
  // threshold of 0 make "first sample above threshold" exactly "first
  // NON-BACKGROUND label" — any id ≥ 1 clamps to full visibility.
  const labelMarch = (values: (number | null)[]) =>
    marchResidentBricks({
      origin: [-0.5, 0, 0],
      direction: [1, 0, 0],
      bounds: [0, 1],
      baseShape: [values.length, 1, 1],
      desiredLevel: 0,
      channel: 0,
      minValue: 0,
      maxValue: 1,
      climMin: 0,
      climMax: 1,
      threshold: 0,
      strategy: "first-hit",
      steps: values.length * 4,
      sample: (voxel) => values[Math.min(values.length - 1, Math.floor(voxel[0]))] ?? null,
    });

  it("hits the FIRST non-zero id, whatever its magnitude", () => {
    const hit = labelMarch([0, 0, 4711, 3, 0]);
    expect(hit).not.toBeNull();
    expect(hit!.rawValue).toBe(4711);
    expect(hit!.fallback).toBeUndefined();
  });

  it("answers null over pure background, and skips unresident gaps", () => {
    expect(labelMarch([0, 0, 0, 0])).toBeNull();
    const hit = labelMarch([0, null, null, 9]);
    expect(hit!.rawValue).toBe(9);
  });
});

describe("marchResidentBricks (max)", () => {
  it("returns the brightest sample along the ray, not the first hit", () => {
    // Dim slab at x ∈ [20, 40), bright peak at x ∈ [70, 75).
    const ramp = (baseVoxel: Vec3) => {
      if (baseVoxel[0] >= 70 && baseVoxel[0] < 75) return 250;
      if (baseVoxel[0] >= 20 && baseVoxel[0] < 40) return 100;
      return 0;
    };
    const hit = march(0.01, ramp, "max");
    expect(hit).not.toBeNull();
    expect(hit!.rawValue).toBe(250);
    // Peak spans local x ∈ [0.2, 0.25).
    expect(hit!.position[0]).toBeGreaterThanOrEqual(0.2);
    expect(hit!.position[0]).toBeLessThan(0.25);
  });

  it("misses an all-zero volume", () => {
    expect(march(0.01, () => 0, "max")).toBeNull();
  });

  it("ignores the threshold entirely", () => {
    // Threshold 0.9 would kill first-hit; max still reports the peak.
    const hit = march(0.9, sampler, "max");
    expect(hit).not.toBeNull();
    expect(hit!.rawValue).toBe(200);
  });
});

describe("marchResidentBricks (gradient)", () => {
  it("locates the strongest edge of a step function", () => {
    const hit = march(0.01, sampler, "gradient");
    expect(hit).not.toBeNull();
    // The edge sits at local x ≈ 0.1 (base voxel 60).
    expect(hit!.position[0]).toBeGreaterThan(0.09);
    expect(hit!.position[0]).toBeLessThan(0.12);
    expect(hit!.rawValue).toBe(200);
  });

  it("does not treat a residency gap boundary as an edge", () => {
    // Uniform value 200 everywhere resident; a gap at x ∈ [40, 60) of nulls.
    // Real data has no edge — the answer is the coverage fallback, never an
    // edge hit at the gap boundary.
    const gapUniform = (baseVoxel: Vec3) =>
      baseVoxel[0] >= 40 && baseVoxel[0] < 60 ? null : 200;
    const hit = march(0.01, gapUniform, "gradient");
    expect(hit).not.toBeNull();
    expect(hit!.fallback).toBe(true);
  });

  it("answers a uniform volume with the fallback sample, not an edge", () => {
    const hit = march(0.01, () => 128, "gradient");
    expect(hit).not.toBeNull();
    expect(hit!.fallback).toBe(true);
    expect(hit!.rawValue).toBe(128);
  });
});

describe("marchResidentBricks (volume-accum)", () => {
  it("reports a depth inside dense material, past the entry face", () => {
    const hit = march(0.01, sampler, "volume-accum");
    expect(hit).not.toBeNull();
    // Accumulation starts at the box entry (x ≈ 0.1) and crosses 0.5 within it.
    expect(hit!.position[0]).toBeGreaterThan(0.1);
    expect(hit!.rawValue).toBe(200);
  });

  it("crosses earlier in denser material", () => {
    const dense = march(0.01, () => 255, "volume-accum");
    const thin = march(0.01, () => 80, "volume-accum");
    expect(dense).not.toBeNull();
    expect(thin).not.toBeNull();
    expect(dense!.t).toBeLessThan(thin!.t);
  });

  it("falls back to the strongest sample when accumulation never crosses 0.5", () => {
    // 20/255 ≈ 0.078 normalized: far too thin to accumulate to 0.5, yet the
    // data is faintly visible — the probe must still answer.
    const hit = march(0.01, () => 20, "volume-accum");
    expect(hit).not.toBeNull();
    expect(hit!.fallback).toBe(true);
    expect(hit!.rawValue).toBe(20);
  });

  it("misses an all-zero volume", () => {
    expect(march(0.01, () => 0, "volume-accum")).toBeNull();
  });
});

/**
 * The Y axis, which every fixture above leaves at zero — which is exactly why
 * the flip that used to live at the `baseVoxelScratch[1]` assignment survived
 * the 2026-08-15 "no client-injected flips" pass (COORDINATE_SYSTEMS.md §0)
 * that removed it from both shaders.
 *
 * An anisotropic shape is deliberate: with a cube, a sign error and a scale
 * error look alike.
 */
const Y_BASE: Vec3 = [100, 40, 100];

const marchY = (
  sample: (baseVoxel: Vec3) => number | null,
  strategy: ProbeMarchStrategy = "first-hit",
) =>
  marchResidentBricks({
    origin: [0, -0.5, 0],
    direction: [0, 1, 0],
    bounds: [0, 1],
    baseShape: Y_BASE,
    desiredLevel: 0,
    channel: 0,
    minValue: 0,
    maxValue: 255,
    climMin: 0,
    climMax: 1,
    threshold: 0.5,
    sample,
    steps: 1000,
    strategy,
  });

describe("marchResidentBricks (Y axis, shader lockstep)", () => {
  it("maps local y to base voxel y WITHOUT a flip", () => {
    // Pins the sign of the map itself, not just where the hit lands: at the
    // ray's start (local y = -0.5) the shader's `toBaseVoxel` reads row 0.
    const seen: number[] = [];
    marchY((baseVoxel) => {
      seen.push(baseVoxel[1]);
      return 0;
    });
    expect(seen[0]).toBeCloseTo(0, 3);
    expect(seen[seen.length - 1]).toBeGreaterThan(Y_BASE[1] * 0.9);
  });

  it("reports the first hit at the near face of a slab high in y", () => {
    // Bright for base voxels y ∈ [24, 40) → local y ≈ 24/40 - 0.5 = 0.1.
    // A flipped march finds the mirror of that slab and answers ≈ -0.1.
    const hit = marchY((baseVoxel) => (baseVoxel[1] >= 24 ? 200 : 0));
    expect(hit).not.toBeNull();
    expect(hit!.position[1]).toBeGreaterThan(0.09);
    expect(hit!.position[1]).toBeLessThan(0.12);
    expect(hit!.rawValue).toBe(200);
  });

  it("finds the brightest y row under `max`", () => {
    // A single bright row at y = 30 → local y = 30/40 - 0.5 = 0.25.
    const hit = marchY(
      (baseVoxel) => (Math.floor(baseVoxel[1]) === 30 ? 255 : 10),
      "max",
    );
    expect(hit).not.toBeNull();
    expect(hit!.position[1]).toBeGreaterThan(0.24);
    expect(hit!.position[1]).toBeLessThan(0.28);
    expect(hit!.rawValue).toBe(255);
  });

  it("finds the y edge under `gradient`", () => {
    const hit = marchY((baseVoxel) => (baseVoxel[1] >= 24 ? 200 : 0), "gradient");
    expect(hit).not.toBeNull();
    expect(hit!.position[1]).toBeGreaterThan(0.08);
    expect(hit!.position[1]).toBeLessThan(0.12);
  });
});
