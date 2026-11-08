import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { applyFitToCamera, panCameraTo, type FitCanvasContext } from "./cameraFit";

/** A perspective camera at (0,-100,100) orbiting the origin. */
const canvasAt = (): FitCanvasContext & { camera: THREE.PerspectiveCamera } => {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10_000);
  camera.up.set(0, 0, 1);
  camera.position.set(0, -100, 100);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const target = new THREE.Vector3();
  return {
    camera,
    controls: { target, update: () => camera.lookAt(target) },
    size: { width: 800, height: 600 },
    invalidate: vi.fn(),
  };
};

const viewOffset = (canvas: FitCanvasContext) =>
  canvas.camera.position.clone().sub(canvas.controls!.target);

describe("panCameraTo", () => {
  it("brings the point to the view's center without turning or zooming", () => {
    const canvas = canvasAt();
    const before = viewOffset(canvas);
    const point = new THREE.Vector3(40, 25, -10);

    panCameraTo(point, canvas);

    expect(canvas.controls!.target.toArray()).toEqual(point.toArray());
    const after = viewOffset(canvas);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(after.z).toBeCloseTo(before.z);
    expect(canvas.invalidate).toHaveBeenCalled();
  });

  it("does nothing for the point it already looks at", () => {
    const canvas = canvasAt();
    panCameraTo(new THREE.Vector3(0, 0, 0), canvas);
    expect(canvas.invalidate).not.toHaveBeenCalled();
  });
});

describe("applyFitToCamera (perspective)", () => {
  it("keeps the line of sight's direction for a box off that line", () => {
    const canvas = canvasAt();
    const before = viewOffset(canvas).normalize();
    const box = new THREE.Box3(new THREE.Vector3(200, 50, 0), new THREE.Vector3(220, 70, 10));

    applyFitToCamera(box, canvas);

    const after = viewOffset(canvas).normalize();
    expect(after.dot(before)).toBeCloseTo(1, 6);
    expect(canvas.controls!.target.toArray()).toEqual(box.getCenter(new THREE.Vector3()).toArray());
  });
});
