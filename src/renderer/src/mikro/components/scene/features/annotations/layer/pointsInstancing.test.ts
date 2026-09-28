import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { samePointEntries, syncPointColors, syncPointMatrices } from "./pointsInstancing";
import type { PointEntry } from "./placedAnnotations";

const entry = (id: string, position: [number, number, number], color = "#ff0000"): PointEntry =>
  ({ id, position, color, opacity: 1, roi: { id } }) as unknown as PointEntry;

const makeMesh = (capacity = 16) =>
  new THREE.InstancedMesh(new THREE.CircleGeometry(1, 8), new THREE.MeshBasicMaterial(), capacity);

describe("syncPointMatrices", () => {
  it("recomputes the bounding sphere so far points stay visible and pickable", () => {
    const mesh = makeMesh();
    syncPointMatrices(mesh, [entry("near", [0, 0, 0])], 1);
    const nearSphere = mesh.boundingSphere!.clone();
    // The z-scrub swaps in a far point; the sphere must follow it.
    syncPointMatrices(mesh, [entry("far", [4000, 4000, 40])], 1);
    expect(mesh.boundingSphere!.center.distanceTo(nearSphere.center)).toBeGreaterThan(1000);
    // And the raycast (which trusts the sphere) now hits the far point.
    const raycaster = new THREE.Raycaster(new THREE.Vector3(4000, 4000, 100), new THREE.Vector3(0, 0, -1));
    mesh.updateMatrixWorld();
    expect(mesh.raycast.length).toBeGreaterThanOrEqual(0);
    const hits: THREE.Intersection[] = [];
    mesh.raycast(raycaster, hits);
    expect(hits.length).toBeGreaterThan(0);
  });

  it("trims the draw count to the entries", () => {
    const mesh = makeMesh();
    syncPointMatrices(mesh, [entry("a", [0, 0, 0]), entry("b", [1, 0, 0])], 2);
    expect(mesh.count).toBe(2);
    syncPointMatrices(mesh, [entry("a", [0, 0, 0])], 2);
    expect(mesh.count).toBe(1);
  });
});

describe("samePointEntries", () => {
  it("value-compares id, color and position", () => {
    const a = [entry("a", [0, 0, 0])];
    expect(samePointEntries(a, [entry("a", [0, 0, 0])])).toBe(true);
    expect(samePointEntries(a, [entry("a", [0, 0, 1])])).toBe(false);
    expect(samePointEntries(a, [entry("a", [0, 0, 0], "#00ff00")])).toBe(false);
    expect(samePointEntries(null, a)).toBe(false);
  });
});

describe("syncPointColors", () => {
  it("writes per-instance colors", () => {
    const mesh = makeMesh();
    syncPointMatrices(mesh, [entry("a", [0, 0, 0], "#00ff00")], 1);
    syncPointColors(mesh, [entry("a", [0, 0, 0], "#00ff00")]);
    const color = new THREE.Color();
    mesh.getColorAt(0, color);
    expect(color.g).toBeCloseTo(1);
    expect(color.r).toBeCloseTo(0);
  });
});
