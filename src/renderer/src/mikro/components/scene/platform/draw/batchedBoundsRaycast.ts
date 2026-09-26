import * as THREE from "three";

/**
 * A BROADPHASE-only raycast for a BatchedMesh: one ray/box test per active
 * instance against its geometry's bounding box, no triangles.
 *
 * It exists for layers that answer the precise "which object?" on the GPU
 * (`gpuPick.ts`) but still route pointer events through R3F: R3F raycasts
 * every object carrying a handler to decide who gets the event and in what
 * order, and three's own `BatchedMesh.raycast` is per instance, PER TRIANGLE,
 * with no BVH — the cost the GPU pick removes. This keeps the routing (nearest
 * first, `stopPropagation`, click-vs-drag) at a box test per mounted cell.
 *
 * The intersection it reports is the box ENTRY: `point`/`distance` are
 * approximate and there is no `face`. Consumers must not read either as the
 * surface — the GPU pick supplies that.
 */

const box = new THREE.Box3();
const instanceMatrix = new THREE.Matrix4();
const worldMatrix = new THREE.Matrix4();
const localRay = new THREE.Ray();
const hitPoint = new THREE.Vector3();
const inverse = new THREE.Matrix4();

type InstanceInfo = { active: boolean; visible: boolean; geometryIndex: number };

export function batchedBoundsRaycast(
  this: THREE.BatchedMesh,
  raycaster: THREE.Raycaster,
  intersects: THREE.Intersection[],
): void {
  // three r184's per-instance bookkeeping; public accessors throw on inactive
  // ids, so the loop reads the array they validate against.
  const infos = (this as unknown as { _instanceInfo?: InstanceInfo[] })._instanceInfo;
  if (!infos) return;
  for (let instanceId = 0; instanceId < infos.length; instanceId++) {
    const info = infos[instanceId];
    if (!info.active || !info.visible) continue;
    this.getBoundingBoxAt(info.geometryIndex, box);
    if (box.isEmpty()) continue;
    this.getMatrixAt(instanceId, instanceMatrix);
    worldMatrix.multiplyMatrices(this.matrixWorld, instanceMatrix);
    localRay.copy(raycaster.ray).applyMatrix4(inverse.copy(worldMatrix).invert());
    if (!localRay.intersectBox(box, hitPoint)) continue;
    hitPoint.applyMatrix4(worldMatrix);
    const distance = raycaster.ray.origin.distanceTo(hitPoint);
    if (distance < raycaster.near || distance > raycaster.far) continue;
    intersects.push({
      distance,
      point: hitPoint.clone(),
      object: this,
      batchId: instanceId,
    } as THREE.Intersection);
  }
}
