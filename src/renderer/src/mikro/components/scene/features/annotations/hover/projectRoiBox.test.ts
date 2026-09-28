import { describe, expect, it } from "vitest";
import * as THREE from "three";

import { BUTTON_MARGIN, buttonOriginFor, projectTopRightCorner } from "./projectRoiBox";

const viewport = { width: 200, height: 100 };

const viewProjectionOf = (camera: THREE.Camera) => {
  camera.updateMatrixWorld();
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  return new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
};

describe("projectTopRightCorner", () => {
  it("maps an identity view-projection (NDC in, pixels out, y flipped)", () => {
    const corner = projectTopRightCorner(
      { minX: -1, maxX: 0, minY: 0, maxY: 1 },
      { min: 0, max: 0 },
      new THREE.Matrix4(),
      viewport,
    );
    // The top-right corner is (x 0, y 1): x 0 → 100px, y 1 → 0px (top).
    expect(corner).toEqual({ x: 100, y: 0 });
  });

  it("uses the real camera: an orthographic top-down view", () => {
    const camera = new THREE.OrthographicCamera(-10, 10, 5, -5, 0.1, 100);
    camera.position.set(0, 0, 10);
    const corner = projectTopRightCorner(
      { minX: 0, maxX: 5, minY: 0, maxY: 5 },
      { min: 0, max: 1 },
      viewProjectionOf(camera),
      viewport,
    );
    // World (5, 5): x 5 of a 20-wide frame → 150px; y 5 of a 10-tall
    // frame, y up → 0px from the top.
    expect(corner).not.toBeNull();
    expect(corner!.x).toBeCloseTo(150);
    expect(corner!.y).toBeCloseTo(0);
  });

  it("picks an ACTUAL corner of a perspective-rotated box, not its screen bbox", () => {
    // Looking down at a box from off-axis: the corner furthest toward the
    // screen's top-right is the far top-right one (y max, z max).
    const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 100);
    camera.position.set(-4, -8, 8);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    const vp = viewProjectionOf(camera);
    const bounds = { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    const corner = projectTopRightCorner(bounds, { min: -1, max: 1 }, vp, viewport);
    expect(corner).not.toBeNull();
    // Compare against the eight corners projected by hand: the result must
    // coincide with one of them (no bbox synthesis).
    const projected: { x: number; y: number }[] = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      const v = new THREE.Vector3(x, y, z).applyMatrix4(vp);
      projected.push({ x: (v.x * 0.5 + 0.5) * 200, y: (-v.y * 0.5 + 0.5) * 100 });
    }
    const match = projected.find(
      (p) => Math.abs(p.x - corner!.x) < 1e-6 && Math.abs(p.y - corner!.y) < 1e-6,
    );
    expect(match).toBeDefined();
    const bestScore = Math.max(...projected.map((p) => p.x - p.y));
    expect(corner!.x - corner!.y).toBeCloseTo(bestScore);
  });

  it("skips corners behind the camera and is null only when all are", () => {
    const camera = new THREE.PerspectiveCamera(60, 2, 1, 100);
    camera.position.set(0, 0, 10);
    const vp = viewProjectionOf(camera);
    // z 0..20 straddles the eye (z 10): the near corners are dropped, the
    // far ones still anchor.
    expect(
      projectTopRightCorner({ minX: 0, maxX: 1, minY: 0, maxY: 1 }, { min: 0, max: 20 }, vp, viewport),
    ).not.toBeNull();
    // Entirely behind the eye: nothing to anchor.
    expect(
      projectTopRightCorner({ minX: 0, maxX: 1, minY: 0, maxY: 1 }, { min: 15, max: 20 }, vp, viewport),
    ).toBeNull();
  });
});

describe("buttonOriginFor", () => {
  const button = { width: 24, height: 24 };

  it("puts the button's bottom-left exactly on the corner", () => {
    expect(buttonOriginFor({ x: 60, y: 50 }, button, viewport)).toEqual({ left: 60, top: 26 });
  });

  it("slides inward at the frame edges", () => {
    expect(buttonOriginFor({ x: 199, y: 2 }, button, viewport)).toEqual({
      left: 200 - 24 - BUTTON_MARGIN,
      top: BUTTON_MARGIN,
    });
    expect(buttonOriginFor({ x: -30, y: 120 }, button, viewport)).toEqual({
      left: BUTTON_MARGIN,
      top: 100 - 24 - BUTTON_MARGIN,
    });
  });
});
