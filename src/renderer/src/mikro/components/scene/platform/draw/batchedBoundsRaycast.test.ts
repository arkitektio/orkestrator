import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { batchedBoundsRaycast } from "./batchedBoundsRaycast";

const unitBox = () => new THREE.BoxGeometry(1, 1, 1);

const batchWith = (positions: [number, number, number][]) => {
  const batch = new THREE.BatchedMesh(8, 1000, 1000, new THREE.MeshBasicMaterial());
  const geometryId = batch.addGeometry(unitBox());
  const ids = positions.map((position) => {
    const id = batch.addInstance(geometryId);
    batch.setMatrixAt(id, new THREE.Matrix4().makeTranslation(...position));
    return id;
  });
  batch.updateMatrixWorld();
  return { batch, ids };
};

const cast = (batch: THREE.BatchedMesh, origin: THREE.Vector3, direction: THREE.Vector3) => {
  const raycaster = new THREE.Raycaster(origin, direction.normalize());
  const hits: THREE.Intersection[] = [];
  batchedBoundsRaycast.call(batch, raycaster, hits);
  return hits;
};

describe("batchedBoundsRaycast", () => {
  it("reports each instance box the ray crosses, at its entry", () => {
    const { batch, ids } = batchWith([
      [0, 0, 0],
      [0, 0, -5],
      [10, 0, 0],
    ]);
    const hits = cast(batch, new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, -1));
    expect(hits.map((hit) => hit.batchId).sort()).toEqual([ids[0], ids[1]].sort());
    const near = hits.find((hit) => hit.batchId === ids[0])!;
    expect(near.distance).toBeCloseTo(9.5); // the box's front face
    expect(near.object).toBe(batch);
    expect(near.face).toBeUndefined();
  });

  it("honours the batch's own placement and skips deleted/hidden instances", () => {
    const { batch, ids } = batchWith([
      [0, 0, 0],
      [3, 0, 0],
    ]);
    batch.position.set(100, 0, 0);
    batch.updateMatrixWorld();
    expect(cast(batch, new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, -1))).toHaveLength(0);
    expect(cast(batch, new THREE.Vector3(100, 0, 10), new THREE.Vector3(0, 0, -1))).toHaveLength(1);

    batch.setVisibleAt(ids[1], false);
    expect(cast(batch, new THREE.Vector3(103, 0, 10), new THREE.Vector3(0, 0, -1))).toHaveLength(0);
    batch.deleteInstance(ids[0]);
    expect(cast(batch, new THREE.Vector3(100, 0, 10), new THREE.Vector3(0, 0, -1))).toHaveLength(0);
  });

  it("respects the raycaster's near/far", () => {
    const { batch } = batchWith([[0, 0, 0]]);
    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, -1), 0, 5);
    const hits: THREE.Intersection[] = [];
    batchedBoundsRaycast.call(batch, raycaster, hits);
    expect(hits).toHaveLength(0);
  });
});
