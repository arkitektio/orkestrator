import { describe, expect, it } from "vitest";
import * as THREE from "three";

import type { CorridorBox } from "./corridorPlan";
import {
  boxRelative,
  centerlineToWorld,
  climWindow,
  levelForSpacing,
  pickCorridor,
  soupToWorld,
  touchesBoundary,
  voxelWorldSize,
} from "./planning";

const identity = new THREE.Matrix4();

describe("pickCorridor", () => {
  const opts = {
    strokeWorld: [
      [10, 10, 10],
      [40, 10, 10],
    ] as const,
    radiusWorld: 3,
    inverse: identity,
    voxelSize: [1, 1, 1] as const,
    levelSteps: [
      [1, 1, 1],
      [2, 2, 2],
      [4, 4, 4],
    ] as const,
    shape: [128, 128, 128] as const,
    startLevel: 0,
  };

  it("stays at the start level when the corridor fits", () => {
    const picked = pickCorridor({ ...opts, maxVoxels: 1_000_000 });
    expect(picked?.level).toBe(0);
    expect(picked?.spacing).toEqual([1, 1, 1]);
  });

  it("coarsens level by level until the budget fits", () => {
    // Level 0 box ≈ 39×9×9 ≈ 3200 voxels; cap below that forces level 1+.
    const picked = pickCorridor({ ...opts, maxVoxels: 800 });
    expect(picked?.level).toBeGreaterThan(0);
    expect(picked?.spacing[0]).toBeGreaterThan(1);
  });

  it("floors the level at the requested detail, never above the pyramid", () => {
    expect(levelForSpacing(1, opts.voxelSize, opts.levelSteps)).toBe(0);
    expect(levelForSpacing(2, opts.voxelSize, opts.levelSteps)).toBe(1);
    expect(levelForSpacing(3, opts.voxelSize, opts.levelSteps)).toBe(2);
    expect(levelForSpacing(64, opts.voxelSize, opts.levelSteps)).toBe(2);
    // Anisotropy: the LARGEST axis decides, so a 4 µm z step already counts as 4.
    expect(levelForSpacing(4, [1, 1, 4], opts.levelSteps)).toBe(0);
    expect(pickCorridor({ ...opts, maxVoxels: 1_000_000, minSpacingWorld: 2 })?.level).toBe(1);
    // The floor never goes finer than the on-screen level.
    expect(pickCorridor({ ...opts, startLevel: 2, maxVoxels: 1_000_000, minSpacingWorld: 2 })?.level).toBe(2);
  });

  it("answers null when even the coarsest level overflows", () => {
    expect(pickCorridor({ ...opts, maxVoxels: 8 })).toBeNull();
  });

  it("maps world to level voxels through the inverse ∘ step", () => {
    const picked = pickCorridor({ ...opts, startLevel: 1, maxVoxels: 1_000_000 })!;
    expect(picked.level).toBe(1);
    expect(picked.worldToLevelVoxel([10, 20, 30])).toEqual([5, 10, 15]);
  });
});

describe("boxRelative", () => {
  const box: CorridorBox = { origin: [10, 10, 10], size: [8, 8, 8] };

  it("brings a level-0 voxel into box coordinates at the level's step", () => {
    expect(boxRelative([24, 26, 28], box, [2, 2, 2])).toEqual([2, 3, 4]);
  });

  it("clamps into the box", () => {
    expect(boxRelative([0, 0, 0], box, [1, 1, 1])).toEqual([0, 0, 0]);
    expect(boxRelative([500, 500, 500], box, [1, 1, 1])).toEqual([7, 7, 7]);
  });
});

describe("climWindow", () => {
  const pool = { minValue: 0, maxValue: 1000 };

  it("defaults to the full pool range without clim", () => {
    expect(climWindow({}, pool)).toEqual({ min: 0, max: 1000 });
  });

  it("narrows to the display window with clim set", () => {
    const window = climWindow({ climMin: 100, climMax: 300 }, pool);
    expect(window.min).toBeCloseTo(100);
    expect(window.max).toBeCloseTo(300);
  });

  it("never collapses to a zero-width window", () => {
    const window = climWindow({ climMin: 500, climMax: 500 }, pool);
    expect(window.max).toBeGreaterThan(window.min);
  });
});

describe("soupToWorld / centerlineToWorld", () => {
  const affine = new THREE.Matrix4().makeTranslation(100, 0, 0);

  it("applies step then affine to triangle soup", () => {
    const out = soupToWorld(Float32Array.from([1, 2, 3]), [2, 2, 2], affine);
    expect(Array.from(out)).toEqual([102, 4, 6]);
  });

  it("applies the identical map to centerline nodes and simplifies", () => {
    const points = centerlineToWorld(
      [
        [0.5, 0.5, 0.5],
        [1.5, 0.5, 0.5],
        [2.5, 0.5, 0.5],
      ],
      {
        level: 0,
        box: { origin: [0, 0, 0], size: [8, 8, 8] },
        step: [2, 2, 2],
        spacing: [2, 2, 2],
        worldToLevelVoxel: (w) => w,
      },
      affine,
    );
    // Collinear interior point simplifies away; ends survive the map.
    expect(points[0]).toEqual([101, 1, 1]);
    expect(points[points.length - 1]).toEqual([105, 1, 1]);
    expect(points).toHaveLength(2);
  });
});

describe("touchesBoundary", () => {
  const seed = [0, 0, 0] as const;

  it("flags vertices near the search radius, ignores interior ones", () => {
    const interior = Float32Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const clipped = Float32Array.from([9.5, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(touchesBoundary(interior, seed, 10, 1)).toBe(false);
    expect(touchesBoundary(clipped, seed, 10, 1)).toBe(true);
  });
});

describe("voxelWorldSize", () => {
  it("reads the affine's basis lengths — anisotropy included", () => {
    const affine = new THREE.Matrix4().makeScale(0.32, 0.32, 2);
    expect(voxelWorldSize(affine)).toEqual([0.32, 0.32, 2]);
  });

  it("is rotation-invariant: a rotated voxel is the same size", () => {
    const affine = new THREE.Matrix4()
      .makeRotationZ(Math.PI / 3)
      .multiply(new THREE.Matrix4().makeScale(0.5, 0.5, 4));
    const size = voxelWorldSize(affine);
    expect(size[0]).toBeCloseTo(0.5, 10);
    expect(size[1]).toBeCloseTo(0.5, 10);
    expect(size[2]).toBeCloseTo(4, 10);
  });

  it("never returns zero — a degenerate axis would make every step free", () => {
    expect(voxelWorldSize(new THREE.Matrix4().makeScale(1, 1, 0))).toEqual([1, 1, 1]);
  });
});
