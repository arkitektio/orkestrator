import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { gatherLayerWorldBoxes } from "../visibility/layerBoxes";
import { cropOrbitCenter, repivotPreservingView, shouldRepivot, type PivotFrame } from "./orbitPivot";
import { orbitDepthAlongRay } from "./panScale";

describe("repivotPreservingView", () => {
  it("moves the target onto the pivot without changing the view", () => {
    const target = new THREE.Vector3(0, 0, 0);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, -200, 200);
    const update = vi.fn();
    const frame: PivotFrame = { camera, controls: { target, update } };
    const offsetBefore = camera.position.clone().sub(target);
    const world = new THREE.Vector3(50, 10, -5);

    expect(repivotPreservingView(frame, world)).toBe(true);

    expect(target.toArray()).toEqual([50, 10, -5]);
    // The offset surviving IS "the view doesn't jump" — only the rotation
    // center moved.
    const offsetAfter = camera.position.clone().sub(target);
    expect(offsetAfter.x).toBeCloseTo(offsetBefore.x);
    expect(offsetAfter.y).toBeCloseTo(offsetBefore.y);
    expect(offsetAfter.z).toBeCloseTo(offsetBefore.z);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("is a no-op without target-bearing controls", () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(1, 2, 3);
    const frame: PivotFrame = { camera, controls: null };

    expect(repivotPreservingView(frame, new THREE.Vector3(9, 9, 9))).toBe(false);
    expect(camera.position.toArray()).toEqual([1, 2, 3]);
  });

  // An async exact-value merge mints a new ProbeResult for the same voxel and
  // re-runs the effect. Without this, every click would cost a second
  // re-target and an extra render on a demand loop.
  it("is a no-op when the target already sits on the pivot", () => {
    const target = new THREE.Vector3(5, 5, 5);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(5, 5, 105);
    const update = vi.fn();
    const frame: PivotFrame = { camera, controls: { target, update } };

    expect(repivotPreservingView(frame, new THREE.Vector3(5, 5, 5))).toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(camera.position.toArray()).toEqual([5, 5, 105]);
  });

  it("treats a sub-epsilon difference as already pivoted", () => {
    const target = new THREE.Vector3(5, 5, 5);
    const update = vi.fn();
    const camera = new THREE.PerspectiveCamera();
    const frame: PivotFrame = { camera, controls: { target, update } };

    expect(
      repivotPreservingView(frame, new THREE.Vector3(5, 5, 5 + 1e-9)),
    ).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("shouldRepivot", () => {
  const base = {
    pivotOnProbe: true,
    probe: { origin: "click" } as const,
    isAnimationPlaying: false,
    justEnabled: false,
  };

  it("does not pivot while the setting is off", () => {
    expect(shouldRepivot({ ...base, pivotOnProbe: false })).toBe(false);
  });

  it("does not pivot without a probe", () => {
    expect(shouldRepivot({ ...base, probe: null })).toBe(false);
  });

  it("pivots on a click probe", () => {
    expect(shouldRepivot(base)).toBe(true);
  });

  // The headline rule: a follow-cursor sweep updates the readout, never the
  // camera.
  it("ignores a hover probe", () => {
    expect(shouldRepivot({ ...base, probe: { origin: "hover" } })).toBe(false);
  });

  it("pivots to a hover probe on the frame the setting is switched on", () => {
    expect(
      shouldRepivot({ ...base, probe: { origin: "hover" }, justEnabled: true }),
    ).toBe(true);
  });

  it("stays out of the way while an animation is playing", () => {
    expect(shouldRepivot({ ...base, isAnimationPlaying: true })).toBe(false);
    expect(
      shouldRepivot({ ...base, isAnimationPlaying: true, justEnabled: true }),
    ).toBe(false);
  });
});

/** A layer trackable whose world box is exactly `min`–`max`. */
const layerOf = (min: [number, number, number], max: [number, number, number]) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]));
  mesh.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  mesh.updateMatrixWorld(true);
  return { kind: "layer", ref: { current: mesh } };
};

describe("crop-clipped layer boxes", () => {
  it("clips each layer box to the crop and drops one wholly outside", () => {
    const boxes: THREE.Box3[] = [];
    gatherLayerWorldBoxes(
      [layerOf([0, 0, 0], [100, 100, 20]), layerOf([500, 500, 0], [600, 600, 20])],
      boxes,
      { min: [10, 10, -50], max: [30, 40, 50] },
    );
    expect(boxes).toHaveLength(1);
    expect(boxes[0].min.toArray()).toEqual([10, 10, 0]);
    expect(boxes[0].max.toArray()).toEqual([30, 40, 20]);
  });

  it("leaves the boxes whole without a crop", () => {
    const boxes: THREE.Box3[] = [];
    gatherLayerWorldBoxes([layerOf([0, 0, 0], [100, 100, 20])], boxes, null);
    expect(boxes[0].max.toArray()).toEqual([100, 100, 20]);
  });
});

describe("cropOrbitCenter", () => {
  const crop = { min: [10, 10, -50], max: [30, 40, 50] };

  it("is the crop's center when the content fills it", () => {
    const boxes = [new THREE.Box3(new THREE.Vector3(10, 10, -50), new THREE.Vector3(30, 40, 50))];
    expect(cropOrbitCenter(crop, boxes, new THREE.Vector3()).toArray()).toEqual([20, 25, 0]);
  });

  it("centers on the drawn content when the crop reaches past the stack", () => {
    const boxes = [new THREE.Box3(new THREE.Vector3(10, 10, 0), new THREE.Vector3(30, 40, 20))];
    expect(cropOrbitCenter(crop, boxes, new THREE.Vector3()).toArray()).toEqual([20, 25, 10]);
  });

  it("falls back to the crop's own center when nothing overlaps it", () => {
    expect(cropOrbitCenter(crop, [], new THREE.Vector3()).toArray()).toEqual([20, 25, 0]);
  });

  it("stays put under PanScaleSync's retarget once the camera looks at it", () => {
    // Full content far beyond the crop along the view ray: unclipped, the
    // retarget would seat the pivot at the WHOLE stack's chord midpoint.
    const boxes: THREE.Box3[] = [];
    const cropBox = { min: [0, 0, 0] as [number, number, number], max: [20, 20, 20] as [number, number, number] };
    gatherLayerWorldBoxes([layerOf([0, 0, 0], [20, 400, 20])], boxes, cropBox);
    const center = cropOrbitCenter(cropBox, boxes, new THREE.Vector3());

    const camera = new THREE.Vector3(10, -100, 10);
    const direction = center.clone().sub(camera).normalize();
    const pivotDistance = camera.distanceTo(center);
    const depth = orbitDepthAlongRay(camera, direction, boxes, pivotDistance);
    expect(Math.abs(depth - pivotDistance)).toBeLessThanOrEqual(0.05 * pivotDistance);
  });
});
