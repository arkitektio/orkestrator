import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  createPointsRaycast,
  samePointEntries,
  syncPointColors,
  syncPointMatrices,
} from "./pointsInstancing";
import type { PointEntry } from "./placedAnnotations";

const entry = (id: string, position: [number, number, number], color = "#ff0000"): PointEntry =>
  ({ id, position, color, opacity: 1, roi: { id } }) as unknown as PointEntry;

const makeMesh = (capacity = 16) =>
  new THREE.InstancedMesh(new THREE.CircleGeometry(1, 8), new THREE.MeshBasicMaterial(), capacity);

describe("syncPointMatrices", () => {
  it("writes positions only: the size is the shader's", () => {
    const mesh = makeMesh();
    syncPointMatrices(mesh, [entry("a", [3, 4, 5])]);
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(0, matrix);
    expect(matrix.equals(new THREE.Matrix4().makeTranslation(3, 4, 5))).toBe(true);
  });

  it("trims the draw count to the entries", () => {
    const mesh = makeMesh();
    syncPointMatrices(mesh, [entry("a", [0, 0, 0]), entry("b", [1, 0, 0])]);
    expect(mesh.count).toBe(2);
    syncPointMatrices(mesh, [entry("a", [0, 0, 0])]);
    expect(mesh.count).toBe(1);
  });
});

describe("createPointsRaycast", () => {
  const SEGMENTS = 16;
  const pick = (mesh: THREE.InstancedMesh, raycaster: THREE.Raycaster, scale: number) => {
    const hits: THREE.Intersection[] = [];
    createPointsRaycast(() => scale).call(mesh, raycaster, hits);
    return hits;
  };

  it("finds a far point after a scrub swaps it in", () => {
    const mesh = makeMesh();
    syncPointMatrices(mesh, [entry("near", [0, 0, 0])]);
    syncPointMatrices(mesh, [entry("far", [4000, 4000, 40])]);
    mesh.updateMatrixWorld();
    const raycaster = new THREE.Raycaster(new THREE.Vector3(4000, 4000, 100), new THREE.Vector3(0, 0, -1));
    expect(pick(mesh, raycaster, 1).map((hit) => hit.instanceId)).toEqual([0]);
  });

  it("is silent before the first frame set a size", () => {
    const mesh = makeMesh();
    syncPointMatrices(mesh, [entry("a", [0, 0, 0])]);
    mesh.updateMatrixWorld();
    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, -1));
    expect(pick(mesh, raycaster, 0)).toHaveLength(0);
  });

  /**
   * Against what three found when the scale lived in the matrices. The discs
   * differ only in the sliver between the drawn 16-gon and its circle, under 2%
   * of the radius, a tenth of a pixel on a 5 px point: rays there are skipped.
   */
  it.each([
    ["identity", new THREE.Matrix4()],
    [
      "calibrated and rotated",
      new THREE.Matrix4()
        .makeRotationX(0.5)
        .multiply(new THREE.Matrix4().makeScale(0.5, 0.5, 5))
        .setPosition(20, -30, 10),
    ],
  ])("agrees with three's instanced raycast: %s", (_name, placement) => {
    const random = (() => {
      let seed = 7;
      return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    })();
    const entries = Array.from({ length: 200 }, (_, i) =>
      entry(`p${i}`, [random() * 100 - 50, random() * 100 - 50, random() * 20 - 10]),
    );
    const scale = 3;

    const geometry = new THREE.CircleGeometry(1, SEGMENTS);
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const ours = new THREE.InstancedMesh(geometry, material, 200);
    syncPointMatrices(ours, entries);
    const oracle = new THREE.InstancedMesh(geometry, material, 200);
    entries.forEach(({ position: [x, y, z] }, i) => {
      oracle.setMatrixAt(i, new THREE.Matrix4().makeScale(scale, scale, scale).setPosition(x, y, z));
    });
    for (const mesh of [ours, oracle]) {
      mesh.matrixAutoUpdate = false;
      mesh.matrixWorld.copy(placement);
    }
    oracle.computeBoundingSphere();

    const inverse = placement.clone().invert();
    const local = new THREE.Ray();
    let compared = 0;
    let hits = 0;
    for (let i = 0; i < 400; i++) {
      const target = entries[i % entries.length].position;
      const point = new THREE.Vector3(
        target[0] + (random() - 0.5) * 8,
        target[1] + (random() - 0.5) * 8,
        target[2],
      ).applyMatrix4(placement);
      const origin = point.clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, 1).multiplyScalar(60));
      const raycaster = new THREE.Raycaster(origin, point.clone().sub(origin).normalize());

      local.copy(raycaster.ray).applyMatrix4(inverse);
      const onRim = entries.some(({ position: [x, y, z] }) => {
        const t = (z - local.origin.z) / local.direction.z;
        const r = Math.hypot(
          local.origin.x + local.direction.x * t - x,
          local.origin.y + local.direction.y * t - y,
        );
        return r > scale * 0.97 && r < scale * 1.01;
      });
      if (onRim) continue;

      const expected: THREE.Intersection[] = [];
      oracle.raycast(raycaster, expected);
      const actual = pick(ours, raycaster, scale);
      const ids = (found: THREE.Intersection[]) =>
        found.map((hit) => hit.instanceId).sort((a, b) => a! - b!);
      expect(ids(actual)).toEqual(ids(expected));
      compared += 1;
      hits += expected.length;
    }
    expect(compared).toBeGreaterThan(50);
    expect(hits).toBeGreaterThan(20);
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
    syncPointMatrices(mesh, [entry("a", [0, 0, 0], "#00ff00")]);
    syncPointColors(mesh, [entry("a", [0, 0, 0], "#00ff00")]);
    const color = new THREE.Color();
    mesh.getColorAt(0, color);
    expect(color.g).toBeCloseTo(1);
    expect(color.r).toBeCloseTo(0);
  });
});
