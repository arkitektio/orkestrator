import type { Vec3 } from "./strokeModel";
import { corridorIndex, corridorVoxelCount, type CorridorBox } from "./corridorPlan";
import { INF_COST } from "./corridorCost";
import { MinHeap } from "./binaryHeap";

/**
 * The geodesic distance field over a corridor cost field — the CPU reference
 * the GPU relaxation kernel is pinned against, and the runtime fallback when
 * WebGPU compute is unavailable.
 *
 * Dijkstra here, Bellman–Ford ping-pong on the GPU: on the same graph both
 * converge to the SAME field (and the same shortest-path tree under the
 * deterministic tie-break below), which is what makes the parity self-test a
 * plain voxel-wise compare instead of a fuzzy one.
 *
 * Steps are world lengths (`spacing`), edge weight = length × mean endpoint
 * cost — the exact metric `features/annotations/enhancers/paths/vectorTrace/traceSearch` uses, restated over a
 * corridor instead of an A* box because Phases 2–3 need the WHOLE field, not
 * one path.
 */

export const NO_PRED = 0xffffffff;

export type GeodesicField = {
  /** Geodesic distance from the seed; `>= INF_COST` = unreached. x-fastest. */
  dist: Float32Array;
  /** Flat index of each voxel's predecessor; `NO_PRED` at the seed/unreached. */
  pred: Uint32Array;
};

/** The 26 neighbour offsets, in a FIXED order shared with the WGSL kernel. */
export const NEIGHBOUR_OFFSETS: readonly Vec3[] = (() => {
  const offsets: Vec3[] = [];
  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        offsets.push([dx, dy, dz]);
      }
    }
  }
  return offsets;
})();
/**
 * The full distance field from `seed` (BOX-relative voxel coordinates).
 *
 * Tie-break: on equal distance the LOWER predecessor index wins. The GPU
 * relaxation adopts the same rule, so the shortest-path trees — and therefore
 * the backtracked centerlines — match exactly, not just the distances.
 */
export function geodesicField(opts: {
  cost: Float32Array;
  box: CorridorBox;
  /** World length of one level voxel per axis. */
  spacing: Vec3;
  seed: Vec3;
}): GeodesicField {
  const { cost, box, spacing, seed } = opts;
  const total = corridorVoxelCount(box);
  const dist = new Float32Array(total).fill(INF_COST);
  const pred = new Uint32Array(total).fill(NO_PRED);

  const seedIndex = corridorIndex(box, seed[0], seed[1], seed[2]);
  if (cost[seedIndex] >= INF_COST) return { dist, pred };

  const stepLengths = NEIGHBOUR_OFFSETS.map(([dx, dy, dz]) =>
    Math.hypot(dx * spacing[0], dy * spacing[1], dz * spacing[2]),
  );

  const settled = new Uint8Array(total);
  const heap = new MinHeap(Math.min(total, 1 << 16));
  dist[seedIndex] = 0;
  heap.push(0, seedIndex);

  const [sx, sy] = [box.size[0], box.size[1]];
  const sz = box.size[2];

  while (heap.size > 0) {
    const current = heap.pop();
    if (settled[current]) continue;
    settled[current] = 1;

    const x = current % sx;
    const y = Math.floor(current / sx) % sy;
    const z = Math.floor(current / (sx * sy));
    const currentCost = cost[current];
    const currentDist = dist[current];

    for (let k = 0; k < NEIGHBOUR_OFFSETS.length; k += 1) {
      const [dx, dy, dz] = NEIGHBOUR_OFFSETS[k];
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (nx < 0 || ny < 0 || nz < 0 || nx >= sx || ny >= sy || nz >= sz) {
        continue;
      }
      const neighbour = current + dx + dy * sx + dz * sx * sy;
      if (settled[neighbour]) continue;
      const neighbourCost = cost[neighbour];
      if (neighbourCost >= INF_COST) continue;

      const tentative =
        currentDist + stepLengths[k] * ((currentCost + neighbourCost) / 2);
      if (
        tentative < dist[neighbour] ||
        (tentative === dist[neighbour] && current < pred[neighbour])
      ) {
        dist[neighbour] = tentative;
        pred[neighbour] = current;
        heap.push(tentative, neighbour);
      }
    }
  }

  return { dist, pred };
}

/**
 * The path from the seed to `target` (BOX-relative), read off the predecessor
 * field, as LEVEL-voxel CENTERS — voxel k spans [k, k+1), centre k + 0.5
 * (COORDINATE_SYSTEMS.md), so the line runs through the middle of its voxels.
 * Null when the target was never reached. Shared by the GPU and CPU paths:
 * both produce the same (dist, pred) layout.
 */
export function backtrackPath(
  field: GeodesicField,
  box: CorridorBox,
  target: Vec3,
): Vec3[] | null {
  const targetIndex = corridorIndex(box, target[0], target[1], target[2]);
  if (field.dist[targetIndex] >= INF_COST) return null;

  const path: Vec3[] = [];
  let current = targetIndex;
  const cap = corridorVoxelCount(box) + 1;
  for (let guard = 0; guard < cap; guard += 1) {
    const x = current % box.size[0];
    const y = Math.floor(current / box.size[0]) % box.size[1];
    const z = Math.floor(current / (box.size[0] * box.size[1]));
    path.push([
      box.origin[0] + x + 0.5,
      box.origin[1] + y + 0.5,
      box.origin[2] + z + 0.5,
    ]);
    const next = field.pred[current];
    if (next === NO_PRED) return path.reverse();
    current = next;
  }
  // A predecessor cycle is a bug upstream, never valid data.
  return null;
}
