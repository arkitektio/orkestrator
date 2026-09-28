import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { deriveCollectionPlanView } from "./collectionPlanView";

const vp = new THREE.Matrix4().makePerspective(-1, 1, 1, -1, 1, 100);

describe("deriveCollectionPlanView", () => {
  it("is null before the first camera emission", () => {
    expect(
      deriveCollectionPlanView(
        { viewProjectionMatrix: null, viewportSize: { height: 800 }, cameraPose: null },
        4,
        0.01,
      ),
    ).toBeNull();
  });

  it("perspective: focal length from fovY and viewport height, no error budget", () => {
    const out = deriveCollectionPlanView(
      {
        viewProjectionMatrix: vp,
        viewportSize: { height: 800 },
        cameraPose: { isPerspective: true, fovY: Math.PI / 2, position: [1, 2, 3] },
      },
      4,
      0.01,
    )!;
    // 0.5 * 800 / tan(45°) = 400
    expect(out.focalPixels).toBeCloseTo(400);
    expect(out.cameraPosition).toEqual([1, 2, 3]);
    expect(out.errorBudget).toBeUndefined();
  });

  it("copies the camera position rather than aliasing the pose", () => {
    const position = [1, 2, 3];
    const out = deriveCollectionPlanView(
      {
        viewProjectionMatrix: vp,
        viewportSize: { height: 800 },
        cameraPose: { isPerspective: true, fovY: 1, position },
      },
      4,
      0.01,
    )!;
    position[0] = 99;
    expect(out.cameraPosition![0]).toBe(1);
  });

  it("ortho: no camera, and an error budget in WORLD units", () => {
    const out = deriveCollectionPlanView(
      {
        viewProjectionMatrix: vp,
        viewportSize: { height: 800 },
        cameraPose: { isPerspective: false, fovY: 0, position: [0, 0, 0] },
      },
      5,
      0.02,
    )!;
    expect(out.cameraPosition).toBeNull();
    expect(out.focalPixels).toBe(0);
    expect(out.errorBudget).toBeCloseTo(0.1); // 5 px × 0.02 world units/px
  });

  it("treats a degenerate fovY as ortho — a zero fov would divide by tan(0)", () => {
    const out = deriveCollectionPlanView(
      {
        viewProjectionMatrix: vp,
        viewportSize: { height: 800 },
        cameraPose: { isPerspective: true, fovY: 0, position: [0, 0, 0] },
      },
      4,
      0.01,
    )!;
    expect(out.errorBudget).toBeDefined();
    expect(Number.isFinite(out.focalPixels)).toBe(true);
  });
});
