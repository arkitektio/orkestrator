import * as THREE from "three";

import type { PointEntry } from "./placedAnnotations";

/**
 * The imperative half of the instanced point annotations, pure enough to
 * unit-test against real three objects.
 *
 * `computeBoundingSphere()` after every matrix rewrite is LOAD-BEARING:
 * `InstancedMesh` computes its sphere lazily ONCE and `setMatrixAt` never
 * invalidates it, while both the frustum cull and `InstancedMesh.raycast`
 * trust the cached value. Without the recompute, scrubbing z to a different
 * subset of points left the sphere around the OLD ones — points outside it
 * vanished when their region left the frustum and never answered a click.
 */
const SCRATCH_MATRIX = new THREE.Matrix4();
const SCRATCH_COLOR = new THREE.Color();

export function syncPointMatrices(
  mesh: THREE.InstancedMesh,
  entries: readonly PointEntry[],
  scale: number,
): void {
  for (let i = 0; i < entries.length; i++) {
    const [x, y, z] = entries[i].position;
    SCRATCH_MATRIX.makeScale(scale, scale, scale).setPosition(x, y, z);
    mesh.setMatrixAt(i, SCRATCH_MATRIX);
  }
  mesh.count = entries.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
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
 * points survive the filter the rewrite — and the bounding-sphere pass — can
 * be skipped wholesale.
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
