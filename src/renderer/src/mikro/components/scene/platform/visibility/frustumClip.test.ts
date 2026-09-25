import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { frustumBoxIntersectionAabb } from "./frustumClip";

/** Ortho camera showing x ∈ cx±halfW, y ∈ cy±halfH, looking down −z. */
const orthoClip = (
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  camZ = 10,
  near = 0.1,
  far = 1000,
) => {
  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, near, far);
  camera.position.set(cx, cy, camZ);
  camera.lookAt(cx, cy, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
};

const perspectiveClip = (
  position: THREE.Vector3,
  lookAt: THREE.Vector3,
  fov = 50,
  aspect = 1,
  near = 0.1,
  far = 10000,
  coordinateSystem: number = THREE.WebGLCoordinateSystem,
) => {
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.coordinateSystem = coordinateSystem;
  camera.position.copy(position);
  camera.lookAt(lookAt);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
};

const out = new THREE.Box3();

describe("frustumBoxIntersectionAabb", () => {
  it("returns the whole box when the frustum contains it", () => {
    const clip = orthoClip(50, 25, 200, 200);
    const hit = frustumBoxIntersectionAabb(clip, [0, 0, -1], [100, 50, 1], out);
    expect(hit).toBe(true);
    expect(out.min.x).toBeCloseTo(0, 3);
    expect(out.min.y).toBeCloseTo(0, 3);
    expect(out.max.x).toBeCloseTo(100, 3);
    expect(out.max.y).toBeCloseTo(50, 3);
  });

  it("returns the frustum extent when the box contains the frustum", () => {
    // Ortho window x ∈ [40, 60], y ∈ [20, 30] entirely inside the box.
    const clip = orthoClip(50, 25, 10, 5);
    const hit = frustumBoxIntersectionAabb(clip, [0, 0, -100], [100, 50, 100], out);
    expect(hit).toBe(true);
    expect(out.min.x).toBeCloseTo(40, 3);
    expect(out.max.x).toBeCloseTo(60, 3);
    expect(out.min.y).toBeCloseTo(20, 3);
    expect(out.max.y).toBeCloseTo(30, 3);
  });

  it("clips a partial overlap exactly", () => {
    // Window x ∈ [50, 150]; box ends at 100 → intersection x ∈ [50, 100].
    const clip = orthoClip(100, 25, 50, 50);
    const hit = frustumBoxIntersectionAabb(clip, [0, 0, -1], [100, 50, 1], out);
    expect(hit).toBe(true);
    expect(out.min.x).toBeCloseTo(50, 3);
    expect(out.max.x).toBeCloseTo(100, 3);
  });

  it("returns false when the frustum misses the box", () => {
    const clip = orthoClip(1000, 1000, 10, 10);
    expect(frustumBoxIntersectionAabb(clip, [0, 0, -1], [100, 50, 1], out)).toBe(false);
    expect(out.isEmpty()).toBe(true);
  });

  it("handles a flat (zero-thickness) box", () => {
    const clip = orthoClip(50, 25, 30, 15);
    const hit = frustumBoxIntersectionAabb(clip, [0, 0, 0], [100, 50, 0], out);
    expect(hit).toBe(true);
    expect(out.min.x).toBeCloseTo(20, 3);
    expect(out.max.x).toBeCloseTo(80, 3);
    expect(out.min.z).toBeCloseTo(0, 6);
    expect(out.max.z).toBeCloseTo(0, 6);
  });

  it("perspective zoom-in yields a small box even though the far plane spans everything", () => {
    // 1000³ volume; camera 30 units above the center of the top face looking
    // straight down. The legacy double-AABB gave ~the whole volume (the
    // frustum's world AABB contains it); the exact clip must stay local:
    // footprint ≈ 2·(depth)·tan(fov/2)·aspect ≪ 1000 near the camera, growing
    // with depth — but bounded by the frustum cross-section at the far face.
    const clip = perspectiveClip(
      new THREE.Vector3(500, 500, 1030),
      new THREE.Vector3(500, 500, 0),
    );
    const hit = frustumBoxIntersectionAabb(clip, [0, 0, 0], [1000, 1000, 1000], out);
    expect(hit).toBe(true);
    // Frustum half-width at the BOTTOM of the volume (depth 1030) is
    // 1030·tan(25°) ≈ 480 → box stays within ~[20, 980], and the near half
    // is far tighter. The essential property: strictly smaller than the
    // volume, and centered.
    expect(out.min.x).toBeGreaterThan(15);
    expect(out.max.x).toBeLessThan(985);
    const cx = (out.min.x + out.max.x) / 2;
    expect(cx).toBeCloseTo(500, 0);
  });

  it("tilting does not blow the box up to the whole volume", () => {
    // Same close-up camera, now tilted 45°: the legacy AABB-of-AABB path
    // inflates under rotation; the exact clip stays bounded by the true
    // frustum-box intersection.
    const clip = perspectiveClip(
      new THREE.Vector3(500, 200, 1030),
      new THREE.Vector3(500, 800, 200),
    );
    const hit = frustumBoxIntersectionAabb(clip, [0, 0, 0], [1000, 1000, 1000], out);
    expect(hit).toBe(true);
    const volume =
      (out.max.x - out.min.x) * (out.max.y - out.min.y) * (out.max.z - out.min.z);
    // Must cover clearly less than the full volume (1e9); the legacy path
    // returned essentially all of it.
    expect(volume).toBeLessThan(0.8e9);
  });

  it("WebGPU-convention matrices clip identically to WebGL-convention ones", () => {
    const position = new THREE.Vector3(500, 500, 1030);
    const lookAt = new THREE.Vector3(500, 500, 0);
    const webgl = perspectiveClip(position, lookAt);
    const webgpu = perspectiveClip(
      position,
      lookAt,
      50,
      1,
      0.1,
      10000,
      THREE.WebGPUCoordinateSystem,
    );

    const a = new THREE.Box3();
    const b = new THREE.Box3();
    frustumBoxIntersectionAabb(webgl, [0, 0, 0], [1000, 1000, 1000], a, THREE.WebGLCoordinateSystem);
    frustumBoxIntersectionAabb(
      webgpu,
      [0, 0, 0],
      [1000, 1000, 1000],
      b,
      THREE.WebGPUCoordinateSystem,
    );

    expect(a.min.distanceTo(b.min)).toBeLessThan(0.6);
    expect(a.max.distanceTo(b.max)).toBeLessThan(0.6);
  });

  it("camera inside the box keeps the near region and clips behind the camera", () => {
    // Camera at the center looking toward +x: nothing behind the camera
    // (x < 500 − near-plane extent) may enter the box.
    const clip = perspectiveClip(
      new THREE.Vector3(500, 500, 500),
      new THREE.Vector3(1000, 500, 500),
      50,
      1,
      0.1,
      10000,
    );
    const hit = frustumBoxIntersectionAabb(clip, [0, 0, 0], [1000, 1000, 1000], out);
    expect(hit).toBe(true);
    expect(out.min.x).toBeGreaterThan(400); // frustum opens forward from x≈500
    expect(out.max.x).toBeCloseTo(1000, 3);
  });
});
