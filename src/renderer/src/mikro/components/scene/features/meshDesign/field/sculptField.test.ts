import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { createField, marchField, meshToField, subtractCapsule, unionMesh } from "./sculptField";
import type { DesignGeometry } from "../store/meshDesignStore";
import { weldIndexed } from "../ops/weld";

const sphereMesh = (radius: number, centre: [number, number, number]): DesignGeometry => {
  const geometry = new THREE.SphereGeometry(radius, 24, 24);
  geometry.translate(...centre);
  return weldIndexed(
    {
      positions: new Float32Array(geometry.getAttribute("position").array),
      indices: Uint32Array.from(geometry.getIndex()!.array),
    },
    1e-3,
  );
};

const signedVolume = (g: DesignGeometry): number => {
  let volume = 0;
  const p = g.positions;
  for (let t = 0; t + 2 < g.indices.length; t += 3) {
    const a = g.indices[t] * 3, b = g.indices[t + 1] * 3, c = g.indices[t + 2] * 3;
    volume +=
      (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
        p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
        p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
  }
  return volume;
};

/** Every undirected edge shared by exactly two triangles. */
const isWatertight = (g: DesignGeometry): boolean => {
  const counts = new Map<number, number>();
  const n = g.positions.length / 3;
  for (let t = 0; t + 2 < g.indices.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = g.indices[t + e];
      const b = g.indices[t + ((e + 1) % 3)];
      const key = a < b ? a * n + b : b * n + a;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  for (const [, count] of counts) if (count !== 2) return false;
  return counts.size > 0;
};

describe("sculptField", () => {
  const SPHERE_VOLUME = (r: number) => (4 / 3) * Math.PI * r ** 3;

  it("round-trips one closed mesh through the field within the grid's fidelity", () => {
    const sphere = sphereMesh(6, [0, 0, 0]);
    const field = meshToField(sphere, 0.5);
    const out = marchField(field, "cubes");
    expect(isWatertight(out)).toBe(true);
    expect(Math.abs(signedVolume(out) - SPHERE_VOLUME(6)) / SPHERE_VOLUME(6)).toBeLessThan(0.1);
  });

  it("unions overlapping pieces into ONE watertight surface with no interior faces", () => {
    const a = sphereMesh(5, [0, 0, 0]);
    const b = sphereMesh(5, [4, 0, 0]);
    let field = meshToField(a, 0.5);
    field = unionMesh(field, b);
    const out = marchField(field, "cubes");
    expect(isWatertight(out)).toBe(true);
    const volume = signedVolume(out);
    // Union < sum (they overlap), > either alone.
    expect(volume).toBeLessThan(2 * SPHERE_VOLUME(5) * 0.98);
    expect(volume).toBeGreaterThan(SPHERE_VOLUME(5) * 1.2);
    // No interior faces: every vertex lies on the OUTER union surface, so
    // none sits deep inside both spheres at once.
    const p = out.positions;
    for (let v = 0; v < p.length; v += 3) {
      const dA = Math.hypot(p[v], p[v + 1], p[v + 2]);
      const dB = Math.hypot(p[v] - 4, p[v + 1], p[v + 2]);
      expect(Math.min(dA, dB) < 5.6 && Math.max(dA, dB) > 4.2).toBe(true);
      expect(dA > 4.2 || dB > 4.2).toBe(true);
    }
  });

  it("grows the field when a piece lands outside it", () => {
    const a = sphereMesh(3, [0, 0, 0]);
    const b = sphereMesh(3, [20, 0, 0]);
    let field = meshToField(a, 0.5);
    const before = field.size[0];
    field = unionMesh(field, b);
    expect(field.size[0]).toBeGreaterThan(before);
    const out = marchField(field, "cubes");
    expect(isWatertight(out)).toBe(true);
    expect(Math.abs(signedVolume(out) - 2 * SPHERE_VOLUME(3)) / (2 * SPHERE_VOLUME(3))).toBeLessThan(0.15);
  });

  it("carves a capsule out and the surface CLOSES over the cut", () => {
    const sphere = sphereMesh(6, [0, 0, 0]);
    const field = meshToField(sphere, 0.5);
    const carved = subtractCapsule(field, [[-8, 0, 0], [8, 0, 0]], 2);
    expect(carved).not.toBe(field);
    const out = marchField(carved, "cubes");
    expect(isWatertight(out)).toBe(true);
    expect(signedVolume(out)).toBeLessThan(signedVolume(marchField(field, "cubes")) * 0.95);
    // The axis is now outside the surface: no vertex remains near the core.
    const p = out.positions;
    for (let v = 0; v < p.length; v += 3) {
      if (Math.abs(p[v]) < 4) {
        expect(Math.hypot(p[v + 1], p[v + 2])).toBeGreaterThan(1.0);
      }
    }
  });

  it("answers the same field when an erase touches nothing", () => {
    const field = meshToField(sphereMesh(4, [0, 0, 0]), 0.5);
    expect(subtractCapsule(field, [[40, 40, 40]], 2)).toBe(field);
  });

  it("coarsens the spacing instead of exceeding the voxel ceiling", () => {
    const field = createField([0, 0, 0], [10_000, 10_000, 10_000], 1);
    expect(field.size[0] * field.size[1] * field.size[2]).toBeLessThanOrEqual(8_000_000);
    expect(field.spacing).toBeGreaterThan(1);
  });
});
