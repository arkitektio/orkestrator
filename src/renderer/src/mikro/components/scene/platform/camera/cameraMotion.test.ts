import { describe, expect, it, beforeEach } from "vitest";
import * as THREE from "three";
import {
  MOTION_RELATIVE_THRESHOLD,
  WHEEL_INTERACTION_HOLD_MS,
  cameraInteraction,
  isCameraMoving,
  matrixRelativeDelta,
} from "./cameraMotion";

/**
 * The reason this split exists: with inertial damping the camera coasts for
 * hundreds of ms after the mouse is released. Treating every frame of that
 * coast as MOTION held the whole scene at half resolution (`resolveVolumeScale`)
 * and blocked the settle ladder until it stopped, ending in a visible snap.
 */
describe("matrixRelativeDelta", () => {
  const identity = () => new THREE.Matrix4().elements;

  it("is zero for identical matrices", () => {
    expect(matrixRelativeDelta(identity(), identity())).toBe(0);
  });

  it("is SCALE-FREE — the property the absolute epsilon lacked", () => {
    // The same proportional nudge on a unit-scale element and on a
    // micrometre-world translation (~1e4) must read identically. Under the
    // old absolute 1e-5 test the second is nine orders of magnitude larger
    // and would dominate, while a genuinely large rotation change would not.
    const small = new THREE.Matrix4();
    const smallMoved = small.clone();
    smallMoved.elements[0] = 1.01; // +1%

    const big = new THREE.Matrix4().setPosition(50000, 0, 0);
    const bigMoved = big.clone();
    bigMoved.elements[12] = 50500; // +1%

    expect(matrixRelativeDelta(smallMoved.elements, small.elements)).toBeCloseTo(
      matrixRelativeDelta(bigMoved.elements, big.elements),
      6,
    );
  });

  it("does not divide by zero when both elements are ~0", () => {
    const a = new THREE.Matrix4();
    const b = new THREE.Matrix4();
    a.elements[1] = 0;
    b.elements[1] = 0;
    expect(Number.isFinite(matrixRelativeDelta(a.elements, b.elements))).toBe(true);
  });
});

describe("isCameraMoving", () => {
  it("a decaying damped tail stops counting as motion", () => {
    // Geometric decay, as OrbitControls' damping produces. The early frames
    // are motion; the tail is settling and must render at full quality.
    expect(isCameraMoving(false, 1e-1)).toBe(true);
    expect(isCameraMoving(false, 1e-2)).toBe(true);
    expect(isCameraMoving(false, 1e-5)).toBe(false);
  });

  it("a paused drag still counts as motion", () => {
    // Mouse held still mid-gesture: zero delta, but snapping to full quality
    // only to drop again on the next pixel is worse than staying cheap.
    expect(isCameraMoving(true, 0)).toBe(true);
  });

  it("catches camera motion with no pointer — keyboard nav and animation", () => {
    // The trap in a pointer-only rule: `KeyboardSceneNavigation` and
    // `AnimationPlayer` move the camera with no drag in progress, and would
    // otherwise render full-resolution every frame of a tour.
    expect(isCameraMoving(false, MOTION_RELATIVE_THRESHOLD * 10)).toBe(true);
  });

  it("is quiet only when neither source is active", () => {
    expect(isCameraMoving(false, 0)).toBe(false);
  });
});

describe("cameraInteraction", () => {
  beforeEach(() => cameraInteraction.reset());

  it("tracks gesture begin/end", () => {
    expect(cameraInteraction.isInteracting(0)).toBe(false);
    cameraInteraction.begin();
    expect(cameraInteraction.isInteracting(0)).toBe(true);
    cameraInteraction.end();
    expect(cameraInteraction.isInteracting(0)).toBe(false);
  });

  it("counts gestures monotonically, and reset does NOT clear the count", () => {
    // `isInteracting` answers "right now"; the auto-snapshot needs "has this
    // view been touched at all", which it gets by marking the count at mount
    // and comparing later. `reset()` fires on a 2D<->3D switch, so zeroing the
    // count there would make a driven camera read as untouched.
    const start = cameraInteraction.count();
    cameraInteraction.begin();
    cameraInteraction.end();
    expect(cameraInteraction.count()).toBe(start + 1);
    cameraInteraction.wheel(0);
    expect(cameraInteraction.count()).toBe(start + 2);
    cameraInteraction.reset();
    expect(cameraInteraction.count()).toBe(start + 2);
  });

  it("reset clears a gesture that never ended", () => {
    // Controls unmounting mid-drag (a 2D↔3D switch) never fire `onEnd`; a
    // stuck true would pin the scene at half resolution forever.
    cameraInteraction.begin();
    cameraInteraction.reset();
    expect(cameraInteraction.isInteracting(0)).toBe(false);
  });

  it("a wheel event holds interaction for WHEEL_INTERACTION_HOLD_MS", () => {
    cameraInteraction.wheel(1000);
    expect(cameraInteraction.isInteracting(1000)).toBe(true);
    expect(cameraInteraction.isInteracting(1000 + WHEEL_INTERACTION_HOLD_MS - 1)).toBe(true);
    expect(cameraInteraction.isInteracting(1000 + WHEEL_INTERACTION_HOLD_MS)).toBe(false);
    expect(cameraInteraction.holdRemainingMs(1100)).toBe(WHEEL_INTERACTION_HOLD_MS - 100);
    expect(cameraInteraction.holdRemainingMs(5000)).toBe(0);
  });

  it("the controls' synchronous wheel start/end pair does not clear a wheel hold", () => {
    // three-stdlib dispatches start → dolly → end inside one wheel event.
    cameraInteraction.wheel(1000);
    cameraInteraction.begin();
    cameraInteraction.end();
    expect(cameraInteraction.isInteracting(1050)).toBe(true);
  });

  it("repeated wheel events extend the hold from the LAST one", () => {
    cameraInteraction.wheel(1000);
    cameraInteraction.wheel(1200);
    expect(cameraInteraction.isInteracting(1200 + WHEEL_INTERACTION_HOLD_MS - 1)).toBe(true);
    expect(cameraInteraction.isInteracting(1200 + WHEEL_INTERACTION_HOLD_MS)).toBe(false);
  });

  it("reset clears a wheel hold too", () => {
    cameraInteraction.wheel(1000);
    cameraInteraction.reset();
    expect(cameraInteraction.isInteracting(1000)).toBe(false);
    expect(cameraInteraction.holdRemainingMs(1000)).toBe(0);
  });
});
