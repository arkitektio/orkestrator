import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  CROP_PLANE_FAR,
  createCropPlanes,
  cropBoxFromCorners,
  cropBoxOverlaps,
  cropBoxToVoxelAabb,
  cropZRange,
  sameCropBox,
  updateCropPlanes,
  type CropBox,
} from "./cropBox";

const kept = (planes: ReturnType<typeof createCropPlanes>, p: [number, number, number]) =>
  planes.every((plane) => plane.distanceToPoint(new THREE.Vector3(...p)) >= 0);

const box: CropBox = { min: [10, 20, 30], max: [40, 60, 50] };

describe("crop box", () => {
  it("is built from two corners in either order", () => {
    expect(cropBoxFromCorners([40, 20, 50], [10, 60, 30])).toEqual(box);
  });

  it("compares by value", () => {
    expect(sameCropBox(box, { min: [10, 20, 30], max: [40, 60, 50] })).toBe(true);
    expect(sameCropBox(box, { min: [10, 20, 30], max: [40, 60, 51] })).toBe(false);
    expect(sameCropBox(box, null)).toBe(false);
    expect(sameCropBox(null, null)).toBe(true);
  });

  it("overlaps an AABB that touches it and not one beside it", () => {
    expect(cropBoxOverlaps(box, [0, 0, 0], [10, 20, 30])).toBe(true);
    expect(cropBoxOverlaps(box, [41, 0, 0], [50, 100, 100])).toBe(false);
  });
});

describe("crop box in voxel space", () => {
  it("is the box itself under an identity affine, clamped to the layer", () => {
    const voxel = cropBoxToVoxelAabb(box, new THREE.Matrix4(), [100, 50, 100]);
    expect(voxel).toEqual({ min: [10, 20, 30], max: [40, 50, 50] });
  });

  it("follows a scale and an offset", () => {
    // voxel → world: x' = 2x + 10
    const voxelToWorld = new THREE.Matrix4().makeScale(2, 1, 1).setPosition(10, 0, 0);
    const voxel = cropBoxToVoxelAabb(box, voxelToWorld.clone().invert(), [100, 100, 100]);
    expect(voxel?.min[0]).toBeCloseTo(0);
    expect(voxel?.max[0]).toBeCloseTo(15);
  });

  it("is null for a layer wholly outside the box", () => {
    expect(cropBoxToVoxelAabb(box, new THREE.Matrix4(), [5, 100, 100])).toBeNull();
  });

  it("is conservative, never short, under a rotation", () => {
    const voxelToWorld = new THREE.Matrix4().makeRotationZ(Math.PI / 4);
    const voxel = cropBoxToVoxelAabb(
      { min: [-10, -10, 0], max: [10, 10, 5] },
      voxelToWorld.clone().invert(),
      [100, 100, 100],
    )!;
    // The world box's corner (10, 10) sits at voxel x = √200 ≈ 14.1.
    expect(voxel.max[0]).toBeCloseTo(Math.SQRT2 * 10);
  });

  it("does not crop a stackless layer by z", () => {
    const voxel = cropBoxToVoxelAabb(box, new THREE.Matrix4(), [100, 100, 1]);
    expect(voxel).toEqual({ min: [10, 20, 0], max: [40, 60, 1] });
    expect(cropBoxToVoxelAabb(box, new THREE.Matrix4(), [100, 100, 0])).not.toBeNull();
  });
});

describe("crop clip planes", () => {
  it("keep exactly the box", () => {
    const planes = createCropPlanes();
    updateCropPlanes(planes, box);
    expect(kept(planes, [25, 40, 40])).toBe(true);
    expect(kept(planes, [9, 40, 40])).toBe(false);
    expect(kept(planes, [41, 40, 40])).toBe(false);
    expect(kept(planes, [25, 19, 40])).toBe(false);
    expect(kept(planes, [25, 61, 40])).toBe(false);
    expect(kept(planes, [25, 40, 29])).toBe(false);
    expect(kept(planes, [25, 40, 51])).toBe(false);
  });

  it("clip nothing without a box, and are mutated in place", () => {
    const planes = createCropPlanes();
    const first = planes[0];
    updateCropPlanes(planes, box);
    updateCropPlanes(planes, null);
    expect(planes[0]).toBe(first);
    expect(planes.every((plane) => plane.constant === CROP_PLANE_FAR)).toBe(true);
    expect(kept(planes, [1e6, -1e6, 1e6])).toBe(true);
  });
});

describe("crop z range", () => {
  // 11 slices of 2 µm starting at z = 0: slice k spans [2k, 2k + 2).
  const grid = { min: 0, max: 20, step: 2 };

  it("starts as the one slice the anchor lies in", () => {
    expect(cropZRange(10, 0, grid)).toEqual([10, 12]); // exactly on slice 5
    expect(cropZRange(11.9, 0, grid)).toEqual([10, 12]);
    // currentZ carries float error; it must not fall into the slice below.
    expect(cropZRange(10 - 1e-9, 0, grid)).toEqual([10, 12]);
  });

  it("grows a slice per step on each side", () => {
    expect(cropZRange(10, 3, grid)).toEqual([4, 18]);
  });

  it("stops at the stack and never goes below one slice", () => {
    expect(cropZRange(10, 50, grid)).toEqual([0, 22]);
    expect(cropZRange(10, -4, grid)).toEqual([10, 12]);
    expect(cropZRange(500, 0, grid)).toEqual([20, 22]);
  });

  it("uses unit slices when the scene has no stack", () => {
    expect(cropZRange(3, 0, null)).toEqual([2.5, 3.5]);
    expect(cropZRange(3, 2, null)).toEqual([0.5, 5.5]);
  });
});
