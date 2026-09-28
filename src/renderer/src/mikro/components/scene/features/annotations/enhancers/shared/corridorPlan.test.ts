import { describe, expect, it } from "vitest";

import { corridorIndex, corridorVoxelCount, planCorridor } from "./corridorPlan";
import type { Vec3 } from "./strokeModel";

// World === level voxels, 1 µm cubes: the identity mapping keeps the numbers
// readable; anisotropy gets its own case.
const identity = {
  worldToLevelVoxel: (w: Vec3): Vec3 => w,
  levelVoxelWorldSize: [1, 1, 1] as Vec3,
  levelShape: [100, 100, 100] as Vec3,
};

describe("planCorridor", () => {
  it("dilates the stroke's bounding box by the radius plus one voxel", () => {
    const box = planCorridor({
      ...identity,
      strokeWorld: [
        [10, 10, 10],
        [20, 10, 10],
      ],
      radiusWorld: 3,
    });
    // pad = ceil(3/1) + 1 = 4 on every axis.
    expect(box).toEqual({ origin: [6, 6, 6], size: [19, 9, 9] });
  });

  it("converts the radius per axis — a coarse-z level pads fewer z voxels", () => {
    const box = planCorridor({
      ...identity,
      levelVoxelWorldSize: [1, 1, 4],
      strokeWorld: [[50, 50, 50]],
      radiusWorld: 4,
    });
    expect(box).not.toBeNull();
    // x/y pad = 4 + 1 = 5; z pad = ceil(4/4) + 1 = 2.
    expect(box!.origin).toEqual([45, 45, 48]);
    expect(box!.size).toEqual([11, 11, 5]);
  });

  it("clamps to the level's extent", () => {
    const box = planCorridor({
      ...identity,
      strokeWorld: [[0, 0, 0]],
      radiusWorld: 5,
    });
    expect(box!.origin).toEqual([0, 0, 0]);
    expect(box!.size).toEqual([7, 7, 7]);
  });

  it("answers null over the voxel budget so the caller can coarsen", () => {
    const box = planCorridor({
      ...identity,
      strokeWorld: [
        [0, 0, 0],
        [99, 99, 99],
      ],
      radiusWorld: 1,
      maxVoxels: 1000,
    });
    expect(box).toBeNull();
  });

  it("answers null for an empty stroke", () => {
    expect(
      planCorridor({ ...identity, strokeWorld: [], radiusWorld: 1 }),
    ).toBeNull();
  });
});

describe("corridorIndex", () => {
  it("is x-fastest over the box size", () => {
    const box = { origin: [0, 0, 0] as Vec3, size: [4, 5, 6] as Vec3 };
    expect(corridorIndex(box, 1, 2, 3)).toBe(1 + 2 * 4 + 3 * 20);
    expect(corridorVoxelCount(box)).toBe(120);
  });
});
