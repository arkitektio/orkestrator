import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { centerBaseVoxel, centerWorldRay, levelDownsampleFactor } from "./centerLod";
import type { Vec3 } from "../../../platform/coords/levelGeometry";

/**
 * The center-pixel LOD readout's frame math. What these pin:
 *  - the center ray is unprojected under BOTH NDC conventions (WebGPU is what
 *    production renders with; the WebGL default is what test cameras build);
 *  - the layer frame is base voxels, corner-anchored — a voxel index, not a
 *    centered or flipped one (COORDINATE_SYSTEMS.md §0);
 *  - 3D answers at the box ENTRY point, so the badge describes the front of
 *    the volume rather than wherever the ray happens to leave it.
 */

const vpOf = (camera: THREE.Camera): THREE.Matrix4 => {
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
};

/** Ortho camera looking down -z at (x, y), spanning `span` world units. */
const orthoCameraAt = (x: number, y: number, span = 100): THREE.OrthographicCamera => {
  const camera = new THREE.OrthographicCamera(-span / 2, span / 2, span / 2, -span / 2, 0.1, 1000);
  camera.position.set(x, y, 100);
  camera.lookAt(x, y, 0);
  return camera;
};

const identity = new THREE.Matrix4().identity();
const shape: Vec3 = [64, 32, 16];

describe("centerWorldRay", () => {
  it("points along the ortho camera's view direction from its center", () => {
    const camera = orthoCameraAt(10, 20);
    const ray = centerWorldRay(vpOf(camera), THREE.WebGLCoordinateSystem);

    expect(ray).not.toBeNull();
    expect(ray!.direction.x).toBeCloseTo(0, 6);
    expect(ray!.direction.y).toBeCloseTo(0, 6);
    expect(ray!.direction.z).toBeCloseTo(-1, 6);
    // Origin at the near plane, on the camera's center axis.
    expect(ray!.origin.x).toBeCloseTo(10, 5);
    expect(ray!.origin.y).toBeCloseTo(20, 5);
  });

  it("agrees between the two NDC conventions once each is told its own", () => {
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1000);
    camera.position.set(5, -3, 40);
    camera.lookAt(5, -3, 0);
    const webgl = centerWorldRay(vpOf(camera), THREE.WebGLCoordinateSystem)!;

    camera.coordinateSystem = THREE.WebGPUCoordinateSystem;
    const webgpu = centerWorldRay(vpOf(camera), THREE.WebGPUCoordinateSystem)!;

    expect(webgpu.direction.x).toBeCloseTo(webgl.direction.x, 5);
    expect(webgpu.direction.y).toBeCloseTo(webgl.direction.y, 5);
    expect(webgpu.direction.z).toBeCloseTo(webgl.direction.z, 5);
    expect(webgpu.origin.distanceTo(webgl.origin)).toBeLessThan(1e-3);
  });

  it("declines a singular view-projection matrix", () => {
    expect(centerWorldRay(new THREE.Matrix4().set(...(Array(16).fill(0) as never)))).toBeNull();
  });
});

describe("centerBaseVoxel — 2D", () => {
  const ray = (x: number, y: number) => ({
    origin: new THREE.Vector3(x, y, 10),
    direction: new THREE.Vector3(0, 0, -1),
  });

  it("reads the corner-anchored voxel under the center, with the plan's slab z", () => {
    expect(
      centerBaseVoxel({
        mode: "2D",
        ray: ray(10.7, 4.2),
        affine: identity,
        baseShape: shape,
        slabZ: 7,
      }),
    ).toEqual([10, 4, 7]);
  });

  it("answers null off the data", () => {
    for (const point of [
      [-0.5, 4],
      [10, -0.5],
      [64, 4],
      [10, 32],
    ] as const) {
      expect(
        centerBaseVoxel({
          mode: "2D",
          ray: ray(point[0], point[1]),
          affine: identity,
          baseShape: shape,
          slabZ: 0,
        }),
      ).toBeNull();
    }
  });

  it("goes through the affine — a scaled, translated layer answers in its own voxels", () => {
    // 2 world units per voxel, origin at world (100, 100).
    const affine = new THREE.Matrix4()
      .makeTranslation(100, 100, 0)
      .multiply(new THREE.Matrix4().makeScale(2, 2, 2));

    expect(
      centerBaseVoxel({ mode: "2D", ray: ray(110, 108), affine, baseShape: shape, slabZ: 3 }),
    ).toEqual([5, 4, 3]);
  });

  it("clamps a slab z past the stack instead of reporting a voxel that isn't there", () => {
    expect(
      centerBaseVoxel({ mode: "2D", ray: ray(1, 1), affine: identity, baseShape: shape, slabZ: 999 }),
    ).toEqual([1, 1, 15]);
  });

  it("declines a plane behind the camera", () => {
    expect(
      centerBaseVoxel({
        mode: "2D",
        ray: { origin: new THREE.Vector3(10, 4, -10), direction: new THREE.Vector3(0, 0, -1) },
        affine: identity,
        baseShape: shape,
        slabZ: 0,
      }),
    ).toBeNull();
  });
});

describe("centerBaseVoxel — 3D", () => {
  it("answers at the box ENTRY, not the exit", () => {
    // Down -z from above: entry is the z = 16 face, so the last z voxel.
    expect(
      centerBaseVoxel({
        mode: "3D",
        ray: { origin: new THREE.Vector3(8.5, 6.5, 100), direction: new THREE.Vector3(0, 0, -1) },
        affine: identity,
        baseShape: shape,
      }),
    ).toEqual([8, 6, 15]);
  });

  it("answers at the camera when the camera is inside the volume", () => {
    expect(
      centerBaseVoxel({
        mode: "3D",
        ray: { origin: new THREE.Vector3(8.5, 6.5, 4.5), direction: new THREE.Vector3(0, 0, -1) },
        affine: identity,
        baseShape: shape,
      }),
    ).toEqual([8, 6, 4]);
  });

  it("misses cleanly beside the box", () => {
    expect(
      centerBaseVoxel({
        mode: "3D",
        ray: { origin: new THREE.Vector3(-5, 6.5, 100), direction: new THREE.Vector3(0, 0, -1) },
        affine: identity,
        baseShape: shape,
      }),
    ).toBeNull();
  });

  it("declines a volume wholly behind the camera", () => {
    expect(
      centerBaseVoxel({
        mode: "3D",
        ray: { origin: new THREE.Vector3(8.5, 6.5, -100), direction: new THREE.Vector3(0, 0, -1) },
        affine: identity,
        baseShape: shape,
      }),
    ).toBeNull();
  });

  it("follows a rotated affine", () => {
    // Layer rotated 90° about z: base voxel (2, 0, 15) sits at world (0, 2, 15).
    const affine = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
    expect(
      centerBaseVoxel({
        mode: "3D",
        ray: { origin: new THREE.Vector3(-0.5, 2.5, 100), direction: new THREE.Vector3(0, 0, -1) },
        affine,
        baseShape: shape,
      }),
    ).toEqual([2, 0, 15]);
  });
});

describe("levelDownsampleFactor", () => {
  it("takes the axis that lost the most detail", () => {
    expect(levelDownsampleFactor([1, 1, 1])).toBe(1);
    expect(levelDownsampleFactor([4, 4, 1])).toBe(4);
    expect(levelDownsampleFactor([2, 2, 8])).toBe(8);
  });
});
