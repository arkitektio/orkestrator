import { describe, expect, it } from "vitest";
import * as THREE from "three";

import {
  EMPTY_CULL_BOX,
  UNBOUNDED_CULL_BOX,
  cropCullBox,
  inverseGainBound,
  pointCullBox,
  pointDataBounds,
} from "./pointsCullBounds";

// An orthographic camera looking down -z at a [0, 100]² window, WebGL convention (what the
// frustum helper's own tests build; the layer passes the camera's real one).
const orthoViewProjection = (left: number, right: number, bottom: number, top: number) => {
  const camera = new THREE.OrthographicCamera(left, right, top, bottom, 0.1, 1000);
  camera.position.set(0, 0, 500);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
};

/** What the kernel does with a box: a centre survives when it is inside on every axis. */
const survives = (box: { min: number[]; max: number[] }, p: [number, number, number]) =>
  p.every((v, axis) => v >= box.min[axis] && v <= box.max[axis]);

describe("pointDataBounds", () => {
  it("is the AABB of the finite points, with z pinned to 0 for a 2D cloud", () => {
    const bounds = pointDataBounds(new Float32Array([1, 2, -3, 4, NaN, 9]), 2, 3);
    expect(bounds).toEqual({ min: [-3, 2, 0], max: [1, 4, 0] });
  });

  it("reads z for a 3D cloud", () => {
    expect(pointDataBounds(new Float32Array([0, 0, 5, 1, 1, -2]), 3, 2)).toEqual({
      min: [0, 0, -2],
      max: [1, 1, 5],
    });
  });

  it("is null when nothing is finite", () => {
    expect(pointDataBounds(new Float32Array([NaN, NaN]), 2, 1)).toBeNull();
    expect(pointDataBounds(new Float32Array(0), 2, 0)).toBeNull();
  });
});

describe("inverseGainBound", () => {
  it("bounds how far a view unit reaches in data space", () => {
    // Data scaled up 4x into the world: one world unit is a quarter of a data unit per axis.
    const gain = inverseGainBound(new THREE.Matrix4().makeScale(4, 4, 4))!;
    expect(gain).toBeGreaterThanOrEqual(0.25);
    expect(gain).toBeCloseTo(Math.sqrt(3) / 4);
  });

  it("refuses a singular placement", () => {
    expect(inverseGainBound(new THREE.Matrix4().makeScale(1, 1, 0))).toBeNull();
  });
});

describe("pointCullBox", () => {
  const cloud = { min: [-1000, -1000, 0], max: [1000, 1000, 0] } as never;

  it("culls what is far off screen and keeps everything on it", () => {
    const box = pointCullBox({
      viewProjection: orthoViewProjection(0, 100, 0, 100),
      model: new THREE.Matrix4(),
      dataBounds: cloud,
      pointSize: 2,
      coordinateSystem: THREE.WebGLCoordinateSystem,
      slack: 0,
    });
    for (const p of [
      [0, 0, 0],
      [100, 100, 0],
      [50, 50, 0],
    ] as [number, number, number][]) {
      expect(survives(box, p)).toBe(true);
    }
    expect(survives(box, [500, 50, 0])).toBe(false);
    expect(survives(box, [-500, -500, 0])).toBe(false);
  });

  it("keeps a point whose centre is off screen but whose quad reaches in", () => {
    // Point size 10 in view units: a centre up to ~7 units outside still paints the edge.
    const box = pointCullBox({
      viewProjection: orthoViewProjection(0, 100, 0, 100),
      model: new THREE.Matrix4(),
      dataBounds: cloud,
      pointSize: 10,
      coordinateSystem: THREE.WebGLCoordinateSystem,
      slack: 0,
    });
    expect(survives(box, [104, 50, 0])).toBe(true);
    expect(survives(box, [-4, -4, 0])).toBe(true);
  });

  it("carries the frustum through the layer's placement into data space", () => {
    // Data placed at 10x scale: the [0, 100] world window is [0, 10] in data units.
    const box = pointCullBox({
      viewProjection: orthoViewProjection(0, 100, 0, 100),
      model: new THREE.Matrix4().makeScale(10, 10, 10),
      dataBounds: cloud,
      pointSize: 0,
      coordinateSystem: THREE.WebGLCoordinateSystem,
      slack: 0,
    });
    expect(survives(box, [5, 5, 0])).toBe(true);
    expect(survives(box, [10, 10, 0])).toBe(true);
    expect(survives(box, [50, 5, 0])).toBe(false);
  });

  it("widens by the slack, so a throttled re-cull does not pop the edge", () => {
    const box = pointCullBox({
      viewProjection: orthoViewProjection(0, 100, 0, 100),
      model: new THREE.Matrix4(),
      dataBounds: cloud,
      pointSize: 0,
      coordinateSystem: THREE.WebGLCoordinateSystem,
      slack: 0.25,
    });
    expect(survives(box, [120, 50, 0])).toBe(true);
    expect(survives(box, [130, 50, 0])).toBe(false);
  });

  it("is empty when the cloud is nowhere near the view", () => {
    const box = pointCullBox({
      viewProjection: orthoViewProjection(0, 100, 0, 100),
      model: new THREE.Matrix4(),
      dataBounds: { min: [5000, 5000, 0], max: [6000, 6000, 0] },
      pointSize: 2,
      coordinateSystem: THREE.WebGLCoordinateSystem,
    });
    expect(box).toBe(EMPTY_CULL_BOX);
  });

  it("draws everything when it cannot vouch for the math", () => {
    const base = {
      viewProjection: orthoViewProjection(0, 100, 0, 100),
      pointSize: 2,
      coordinateSystem: THREE.WebGLCoordinateSystem,
    } as const;
    expect(
      pointCullBox({ ...base, model: new THREE.Matrix4(), dataBounds: null }),
    ).toBe(UNBOUNDED_CULL_BOX);
    expect(
      pointCullBox({ ...base, model: new THREE.Matrix4().makeScale(1, 1, 0), dataBounds: cloud }),
    ).toBe(UNBOUNDED_CULL_BOX);
  });
});

describe("cropCullBox", () => {
  const crop = { min: [10, 10, 0], max: [20, 20, 5] } as { min: [number, number, number]; max: [number, number, number] };

  it("leaves the box alone without a crop", () => {
    const box = { min: [0, 0, 0], max: [1, 1, 1] } as typeof crop;
    expect(cropCullBox(box, null, new THREE.Matrix4())).toBe(box);
  });

  it("cuts a view box that includes its slack back to the crop", () => {
    // What `pointCullBox` hands over: the visible region, padded by the slack.
    const padded = { min: [-25, -25, -1], max: [125, 125, 6] } as typeof crop;
    const box = cropCullBox(padded, crop, new THREE.Matrix4());
    expect(survives(box, [15, 15, 2])).toBe(true);
    expect(survives(box, [21, 15, 2])).toBe(false); // on screen, inside the slack, outside the crop
  });

  it("crops an unbounded box too — while the camera moves", () => {
    const box = cropCullBox(UNBOUNDED_CULL_BOX, crop, new THREE.Matrix4());
    expect(box).toEqual(crop);
  });

  it("takes the crop into the data's own space", () => {
    // data → world: x' = 2x
    const box = cropCullBox(UNBOUNDED_CULL_BOX, crop, new THREE.Matrix4().makeScale(2, 1, 1));
    expect(box.min[0]).toBeCloseTo(5);
    expect(box.max[0]).toBeCloseTo(10);
  });

  it("is empty when the view and the crop do not meet", () => {
    const elsewhere = { min: [50, 50, 0], max: [60, 60, 1] } as typeof crop;
    expect(cropCullBox(elsewhere, crop, new THREE.Matrix4())).toBe(EMPTY_CULL_BOX);
  });
});
