import * as THREE from "three";
import { positionGeometry, positionLocal, uniform } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";

import type { PointEntry } from "./placedAnnotations";

/**
 * The imperative half of the instanced point annotations, pure enough to
 * unit-test against real three objects.
 *
 * An instance matrix holds a point's POSITION only. Its constant on-screen size
 * is one uniform in the vertex shader, so a zoom writes a number instead of
 * rewriting and re-uploading every matrix per frame. Nothing here reads a
 * bounding sphere (the mesh is not frustum-culled, and the raycast is ours), so
 * a z-scrub that swaps in a far subset of points cannot leave a stale one behind.
 */
const SCRATCH_MATRIX = new THREE.Matrix4();
const SCRATCH_COLOR = new THREE.Color();

export function syncPointMatrices(
  mesh: THREE.InstancedMesh,
  entries: readonly PointEntry[],
): void {
  for (let i = 0; i < entries.length; i++) {
    const [x, y, z] = entries[i].position;
    mesh.setMatrixAt(i, SCRATCH_MATRIX.makeTranslation(x, y, z));
  }
  mesh.count = entries.length;
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * The unit disc each instance draws, at `scale` around its position. `uScale`
 * drives the same number the raycast below reads.
 */
export function createPointMaterial(opacity: number): {
  material: MeshBasicNodeMaterial;
  uScale: ReturnType<typeof uniform<number>>;
} {
  const uScale = uniform(0);
  const material = new MeshBasicNodeMaterial({
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });
  // `positionLocal` already carries the instance's translation here; only the
  // geometry's own offset from it scales.
  material.positionNode = positionLocal.add(positionGeometry.mul(uScale.sub(1)));
  return { material, uScale };
}

const localRay = new THREE.Ray();
const inverseWorld = new THREE.Matrix4();
const localHit = new THREE.Vector3();

/**
 * A `raycast` for the points: the ray against each instance's disc, in the
 * collection's frame where the discs lie flat, as `InstancedMesh.raycast` found
 * them but without a mesh raycast per instance. On every pointer move while
 * hover is armed. Every disc hit is reported, nearest sorted by the event system.
 */
export function createPointsRaycast(
  scaleOf: () => number,
): (this: THREE.InstancedMesh, raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => void {
  return function raycast(raycaster, intersects) {
    const scale = scaleOf();
    if (scale <= 0) return;
    const radiusSq = scale * scale;
    localRay.copy(raycaster.ray).applyMatrix4(inverseWorld.copy(this.matrixWorld).invert());
    const { origin, direction } = localRay;
    if (direction.z === 0) return;
    const matrices = this.instanceMatrix.array;
    for (let i = 0; i < this.count; i++) {
      const at = i * 16;
      const t = (matrices[at + 14] - origin.z) / direction.z;
      if (t < 0) continue;
      const dx = origin.x + direction.x * t - matrices[at + 12];
      const dy = origin.y + direction.y * t - matrices[at + 13];
      if (dx * dx + dy * dy > radiusSq) continue;
      localHit.set(origin.x + direction.x * t, origin.y + direction.y * t, matrices[at + 14]);
      const point = localHit.clone().applyMatrix4(this.matrixWorld);
      const distance = raycaster.ray.origin.distanceTo(point);
      if (distance < raycaster.near || distance > raycaster.far) continue;
      intersects.push({ distance, point, object: this, instanceId: i } as THREE.Intersection);
    }
  };
}

export function syncPointColors(mesh: THREE.InstancedMesh, entries: readonly PointEntry[]): void {
  for (let i = 0; i < entries.length; i++) {
    mesh.setColorAt(i, SCRATCH_COLOR.set(entries[i].color));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/**
 * Do two entry lists demand the same instances? Value-compared (id, position,
 * color): a z-scrub recomputes the groups every tick, and when the same
 * points survive the filter the rewrite can be skipped wholesale.
 */
export function samePointEntries(
  a: readonly PointEntry[] | null,
  b: readonly PointEntry[],
): boolean {
  if (a === null || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    const q = b[i];
    if (
      p.id !== q.id ||
      p.color !== q.color ||
      p.position[0] !== q.position[0] ||
      p.position[1] !== q.position[1] ||
      p.position[2] !== q.position[2]
    ) {
      return false;
    }
  }
  return true;
}
