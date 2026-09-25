import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { taubinSmooth } from "./smoothMesh";
import { weldIndexed } from "./weld";

const noisySphere = (seed = 1) => {
  const geometry = new THREE.SphereGeometry(10, 24, 24);
  // THREE's sphere duplicates its seam and pole vertices; weld first so the
  // adjacency is the real one (the designer's meshes arrive welded too).
  const welded = weldIndexed(
    {
      positions: new Float32Array(geometry.getAttribute("position").array),
      indices: Uint32Array.from(geometry.getIndex()!.array),
    },
    1e-3,
  );
  const positions = welded.positions;
  // Deterministic radial noise.
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let v = 0; v < positions.length; v += 3) {
    const r = Math.hypot(positions[v], positions[v + 1], positions[v + 2]) || 1;
    const bump = 1 + 0.08 * rand();
    positions[v] = (positions[v] / r) * 10 * bump;
    positions[v + 1] = (positions[v + 1] / r) * 10 * bump;
    positions[v + 2] = (positions[v + 2] / r) * 10 * bump;
  }
  return { positions, indices: welded.indices };
};

const radialStats = (positions: Float32Array) => {
  const radii: number[] = [];
  for (let v = 0; v < positions.length; v += 3) radii.push(Math.hypot(positions[v], positions[v + 1], positions[v + 2]));
  const mean = radii.reduce((a, b) => a + b, 0) / radii.length;
  const variance = radii.reduce((a, r) => a + (r - mean) ** 2, 0) / radii.length;
  return { mean, variance };
};

describe("taubinSmooth", () => {
  it("removes high-frequency noise without shrinking", () => {
    const noisy = noisySphere();
    const before = radialStats(noisy.positions);
    const smoothed = taubinSmooth(noisy, { iterations: 10 });
    const after = radialStats(smoothed.positions);
    expect(after.variance).toBeLessThan(before.variance * 0.3);
    expect(Math.abs(after.mean - 10) / 10).toBeLessThan(0.02);
    expect(smoothed.indices).toBe(noisy.indices);
  });

  it("pins boundary vertices", () => {
    // An open fan: the rim vertices have single-triangle edges.
    const positions = new Float32Array([0, 0, 0.5, 1, 0, 0, 0, 1, 0, -1, 0, 0, 0, -1, 0]);
    const indices = new Uint32Array([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
    const out = taubinSmooth({ positions, indices }, { iterations: 5 });
    for (let v = 1; v < 5; v++) {
      expect(out.positions[v * 3]).toBe(positions[v * 3]);
      expect(out.positions[v * 3 + 1]).toBe(positions[v * 3 + 1]);
    }
    expect(out.positions[2]).not.toBe(0.5); // the interior apex moved
  });

  it("is a no-op at zero iterations", () => {
    const mesh = noisySphere();
    expect(taubinSmooth(mesh, { iterations: 0 })).toBe(mesh);
  });
});
