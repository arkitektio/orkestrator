import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { repivotPreservingView, shouldRepivot, type PivotFrame } from "./orbitPivot";

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
