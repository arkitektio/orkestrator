import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { MANIFEST_NAME } from "../../meshes/fabriks/fabriksManifest";
import { bakeFabriksCollection, type BakeMesh } from "../../meshes/fabriks/writer/fabriksBake";
import { bakeDesign, bakeTransfers, SINGLE_CELL_MAX_QUANTIZATION } from "./bakeDesign";

const sphere = (objectId: number, centre: [number, number, number], radius: number): BakeMesh => {
  const geometry = new THREE.SphereGeometry(radius, 16, 12);
  geometry.translate(...centre);
  return {
    objectId,
    positions: new Float32Array(geometry.getAttribute("position").array),
    indices: Uint32Array.from(geometry.getIndex()!.array),
  };
};

describe("bakeDesign", () => {
  it("bakes a small design into ONE cell, and says where it sits", () => {
    const meshes = [sphere(1, [40.5, 12, 30], 10), sphere(2, [80, 20, 35], 12)];
    const bake = bakeDesign(meshes, ["x", "y", "z"]);
    expect(bake.cells).toBe("single");
    expect(bake.quantizationVoxels).toBeLessThanOrEqual(SINGLE_CELL_MAX_QUANTIZATION);
    // The same answer the bake itself gives — decided from the bounds alone.
    expect(bake.quantizationVoxels).toBe(bakeFabriksCollection(meshes, { cells: "single" }).quantizationVoxels);
    expect(bake.offset).toEqual([30, 2, 20]);
    expect([...bake.files.keys()].at(-1)).toBe(MANIFEST_NAME); // the completion marker goes last
    let total = 0;
    for (const bytes of bake.files.values()) total += bytes.byteLength;
    expect(bake.totalBytes).toBe(total);
    expect(new Set(bakeTransfers(bake)).size).toBe(bake.files.size);
  });

  it("takes the auto grid once a single cell would quantize too coarsely", () => {
    const bake = bakeDesign([sphere(1, [10, 10, 10], 8), sphere(2, [5000, 10, 10], 8)], ["x", "y", "z"]);
    expect(bake.cells).toBe("auto");
    expect(bake.quantizationVoxels).toBeLessThan(SINGLE_CELL_MAX_QUANTIZATION);
  });
});
