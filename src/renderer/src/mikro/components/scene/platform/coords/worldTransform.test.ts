import { describe, expect, it } from "vitest";
import type { LayerState } from "../model/layerModel";
import {
  buildAffineMatrix,
  finestLayerZStep,
  isLayerOutOfPlane,
  latticeZToSlice,
  physicalToVoxelZ,
  sceneZExtent,
  sliceToLatticeZ,
  voxelToPhysicalZ,
} from "./worldTransform";

/**
 * A stack whose slice `k` the server places at world z `origin + k * spacing`,
 * with the affine `composeLatticeAffine` gives its layer: corner-anchored, so
 * the lattice is half a cell ahead of the index on every rendered axis.
 */
const stack = (slices: number, spacing: number, origin = 0): LayerState =>
  ({
    zAxis: "z",
    affineMatrix: [
      [0.5, 0, 0, -0.25],
      [0, 0.5, 0, -0.25],
      [0, 0, spacing, origin - spacing / 2],
      [0, 0, 0, 1],
    ],
    lens: { axisNames: ["z", "y", "x"], shape: [slices, 1024, 1024] },
  }) as unknown as LayerState;

describe("a slice is its lattice cell, and sits at the cell's centre", () => {
  it("names the centre of cell [k, k + 1) and the cell a z falls in", () => {
    expect(sliceToLatticeZ(0)).toBe(0.5);
    expect(sliceToLatticeZ(35)).toBe(35.5);
    expect(latticeZToSlice(35.99)).toBe(35);
    expect(latticeZToSlice(36)).toBe(36);
    expect(latticeZToSlice(-0.01)).toBe(-1);
  });

  it("puts slice k at the world z the server puts index k", () => {
    const affine = buildAffineMatrix(stack(36, 2, 10));
    expect(voxelToPhysicalZ(affine, 0)).toBe(10);
    expect(voxelToPhysicalZ(affine, 35)).toBe(80);
  });

  it("scrubs from the first slice's centre to the last one's", () => {
    expect(sceneZExtent([stack(36, 2)])).toEqual({ min: 0, max: 70, step: 2 });
    expect(finestLayerZStep([stack(36, 2), stack(8, 5)])).toBe(2);
  });

  it("reads a world z back as the nearest slice", () => {
    const affine = buildAffineMatrix(stack(36, 2));
    for (const slice of [0, 1, 17, 35]) {
      expect(physicalToVoxelZ(affine, slice * 2, 35)).toBe(slice);
      expect(physicalToVoxelZ(affine, slice * 2 - 0.9, 35)).toBe(slice);
      expect(physicalToVoxelZ(affine, slice * 2 + 0.9, 35)).toBe(slice);
    }
    expect(physicalToVoxelZ(affine, 500, 35)).toBe(35);
    expect(physicalToVoxelZ(affine, -500, 35)).toBe(0);
  });

  it("is in plane up to half a slice past the end slices", () => {
    const layer = stack(36, 2);
    expect(isLayerOutOfPlane(layer, -0.9)).toBe(false);
    expect(isLayerOutOfPlane(layer, -1.1)).toBe(true);
    expect(isLayerOutOfPlane(layer, 70.9)).toBe(false);
    expect(isLayerOutOfPlane(layer, 71.1)).toBe(true);
  });
});
