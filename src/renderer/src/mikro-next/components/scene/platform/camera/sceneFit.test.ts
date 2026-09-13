import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { computeFitPose, computeSceneWorldBox } from "./sceneFit";
import type { LayerState } from "../model/layerModel";

/** Minimal layer for the metadata box math (same casting style as visibility.test.ts). */
const makeLayer = (opts: {
  shape: number[]; // [z, y, x] under DIMS below (or use axisNames override)
  axisNames?: string[];
  affineMatrix?: number[][] | null;
  xAxis?: string | null;
  /** Server placement present (the default); false = unplaceable, skipped. */
  placed?: boolean;
}): LayerState =>
  ({
    id: "layer",
    // `affineMatrix` is only a world position when the server composed a
    // placement; the box math gates on `isPlaceable` (asAffine non-null).
    asAffine:
      opts.placed === false
        ? null
        : { matrix: [[1, 0, 0, 0]], inputAxes: ["x"], outputAxes: ["x"], total: true },
    affineMatrix: opts.affineMatrix ?? null,
    xAxis: opts.xAxis === undefined ? "x" : opts.xAxis,
    yAxis: "y",
    zAxis: "z",
    intensityAxis: null,
    lens: { axisNames: opts.axisNames ?? ["z", "y", "x"], shape: opts.shape },
  }) as unknown as LayerState;

describe("computeSceneWorldBox", () => {
  it("skips unplaceable layers (no server asAffine) — they are not drawn", () => {
    expect(computeSceneWorldBox([makeLayer({ shape: [20, 50, 100], placed: false })])).toBeNull();
    const box = computeSceneWorldBox([
      makeLayer({ shape: [20, 50, 100], placed: false }),
      makeLayer({ shape: [1, 10, 10] }),
    ])!;
    expect(box.max.x).toBe(10); // only the placed layer contributes
  });

  it("anchors a single identity-affine layer at the origin corner", () => {
    // Corner-anchored: shape [z, y, x] = [20, 50, 100] → world box
    // [0,0,0]..[100,50,20] — voxel v sits at exactly affine(v).
    const box = computeSceneWorldBox([makeLayer({ shape: [20, 50, 100] })])!;
    expect(box.min.toArray()).toEqual([0, 0, 0]);
    expect(box.max.toArray()).toEqual([100, 50, 20]);
  });

  it("applies affine translation", () => {
    const affine = [
      [1, 0, 0, 100],
      [0, 1, 0, 0],
      [0, 0, 1, -5],
      [0, 0, 0, 1],
    ];
    const box = computeSceneWorldBox([makeLayer({ shape: [20, 50, 100], affineMatrix: affine })])!;
    // z ∈ [0, 20] then tz = -5 → [-5, 15]
    expect(box.min.toArray()).toEqual([100, 0, -5]);
    expect(box.max.toArray()).toEqual([200, 50, 15]);
  });

  it("applies anisotropic affine scale", () => {
    const affine = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 5, 0], // z scaled ×5
      [0, 0, 0, 1],
    ];
    const box = computeSceneWorldBox([makeLayer({ shape: [20, 50, 100], affineMatrix: affine })])!;
    expect(box.min.z).toBe(0);
    expect(box.max.z).toBe(100);
  });

  it("transforms corners individually under rotation (box ≠ naive min/max)", () => {
    // 90° rotation about z: x' = -y, y' = x → the x extent comes from y.
    const affine = [
      [0, -1, 0, 0],
      [1, 0, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    const box = computeSceneWorldBox([makeLayer({ shape: [20, 50, 100], affineMatrix: affine })])!;
    expect(box.min.x).toBeCloseTo(-50, 6);
    expect(box.max.x).toBeCloseTo(0, 6);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeCloseTo(100, 6);
  });

  it("unions multiple layers", () => {
    const shifted = [
      [1, 0, 0, 200],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    const box = computeSceneWorldBox([
      makeLayer({ shape: [20, 50, 100] }),
      makeLayer({ shape: [20, 50, 100], affineMatrix: shifted }),
    ])!;
    expect(box.min.x).toBe(0);
    expect(box.max.x).toBe(300);
  });

  it("returns null for no layers or layers without valid spatial axes", () => {
    expect(computeSceneWorldBox([])).toBeNull();
    expect(computeSceneWorldBox([makeLayer({ shape: [20, 50, 100], xAxis: null })])).toBeNull();
  });

  it("fits a z-less (2D) layer as a flat box", () => {
    const layer = makeLayer({ shape: [50, 100], axisNames: ["y", "x"] });
    (layer as { zAxis: string | null }).zAxis = null;
    const box = computeSceneWorldBox([layer])!;
    expect(box.min.toArray()).toEqual([0, 0, 0]);
    expect(box.max.toArray()).toEqual([100, 50, 0]);
  });

  it("maps voxel v to exactly affine(v) — the corner-anchored invariant", () => {
    // The load-bearing convention (COORDINATE_SYSTEMS.md): no centering, no
    // flip, nothing between a voxel coordinate and the affine.
    const affine = [
      [2, 0, 0, 7],
      [0, 3, 0, -1],
      [0, 0, 5, 4],
      [0, 0, 0, 1],
    ];
    const box = computeSceneWorldBox([makeLayer({ shape: [20, 50, 100], affineMatrix: affine })])!;
    expect(box.min.toArray()).toEqual([2 * 0 + 7, 3 * 0 - 1, 5 * 0 + 4]);
    expect(box.max.toArray()).toEqual([2 * 100 + 7, 3 * 50 - 1, 5 * 20 + 4]);
  });
});

describe("computeFitPose", () => {
  const box = new THREE.Box3(new THREE.Vector3(-50, -25, -10), new THREE.Vector3(50, 25, 10));

  it("orthographic: limiting-axis zoom with 1.1 padding, centered, target z=0", () => {
    const pose = computeFitPose(box, {
      kind: "orthographic",
      viewport: { width: 200, height: 100 },
      cameraZ: 50000,
    });
    // zoomX = 200/(100·1.1) == zoomY = 100/(50·1.1)
    expect(pose.zoom).toBeCloseTo(200 / 110, 6);
    expect(pose.position.toArray()).toEqual([0, 0, 50000]);
    expect(pose.target.toArray()).toEqual([0, 0, 0]);
  });

  it("orthographic: an off-center box centers x/y", () => {
    const shifted = box.clone().translate(new THREE.Vector3(100, -30, 0));
    const pose = computeFitPose(shifted, {
      kind: "orthographic",
      viewport: { width: 200, height: 100 },
      cameraZ: 1,
    });
    expect(pose.position.x).toBe(100);
    expect(pose.position.y).toBe(-30);
    expect(pose.target.toArray()).toEqual([100, -30, 0]);
  });

  it("perspective: distance = sphereRadius/sin(fov/2) · 1.3 along the view direction", () => {
    const radius = Math.sqrt(50 * 50 + 25 * 25 + 10 * 10);
    const pose = computeFitPose(box, {
      kind: "perspective",
      fov: 90,
      viewDirection: new THREE.Vector3(0, 0, 1),
    });
    const expected = (radius / Math.sin(THREE.MathUtils.degToRad(45))) * 1.3;
    expect(pose.position.z).toBeCloseTo(expected, 6);
    expect(pose.position.x).toBeCloseTo(0, 6);
    expect(pose.target.toArray()).toEqual([0, 0, 0]);
  });

  it("perspective: normalizes the view direction", () => {
    const a = computeFitPose(box, {
      kind: "perspective",
      fov: 45,
      viewDirection: new THREE.Vector3(0, -2, 2),
    });
    const b = computeFitPose(box, {
      kind: "perspective",
      fov: 45,
      viewDirection: new THREE.Vector3(0, -200, 200),
    });
    expect(a.position.distanceTo(b.position)).toBeCloseTo(0, 6);
  });
});
