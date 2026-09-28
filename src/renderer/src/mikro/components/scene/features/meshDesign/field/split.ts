import type { SculptField } from "./sculptField";

/**
 * Two-seed SPLIT: assign every inside cell to the nearer seed by geodesic
 * distance WITHIN the inside region (a Dijkstra over the 6-neighbourhood,
 * spacing-weighted), and cut the field into two — each keeps its own cells,
 * the other's become outside. The watershed line falls along the narrowest
 * waist between the seeds, which is exactly where a merged blob should part.
 */
export function splitField(
  field: SculptField,
  seedA: readonly [number, number, number],
  seedB: readonly [number, number, number],
): { a: SculptField; b: SculptField } | null {
  const [nx, ny, nz] = field.size;
  const count = nx * ny * nz;
  const cellOf = (w: readonly [number, number, number]): number | null => {
    const x = Math.round((w[0] - field.min[0]) / field.spacing - 0.5);
    const y = Math.round((w[1] - field.min[1]) / field.spacing - 0.5);
    const z = Math.round((w[2] - field.min[2]) / field.spacing - 0.5);
    if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) return null;
    return x + y * nx + z * nx * ny;
  };
  const inside = (i: number) => field.data[i] < 0;
  const snapInside = (i: number | null): number | null => {
    if (i === null) return null;
    if (inside(i)) return i;
    // The click probed a hair off the core: accept a direct neighbour.
    for (const step of [1, -1, nx, -nx, nx * ny, -nx * ny]) {
      const j = i + step;
      if (j >= 0 && j < count && inside(j)) return j;
    }
    return null;
  };
  const a0 = snapInside(cellOf(seedA));
  const b0 = snapInside(cellOf(seedB));
  if (a0 === null || b0 === null || a0 === b0) return null;

  // Multi-source BFS (uniform spacing → plain queue is exact enough).
  const owner = new Int8Array(count).fill(0); // 0 unvisited, 1 = A, 2 = B
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  owner[a0] = 1; queue[tail++] = a0;
  owner[b0] = 2; queue[tail++] = b0;
  const steps = [1, -1, nx, -nx, nx * ny, -nx * ny];
  const xOf = (i: number) => i % nx;
  while (head < tail) {
    const i = queue[head++];
    for (const step of steps) {
      const j = i + step;
      if (j < 0 || j >= count || owner[j] !== 0 || !inside(j)) continue;
      // No x-wrap across rows.
      if ((step === 1 && xOf(i) === nx - 1) || (step === -1 && xOf(i) === 0)) continue;
      owner[j] = owner[i];
      queue[tail++] = j;
    }
  }

  const dataA = Float32Array.from(field.data);
  const dataB = Float32Array.from(field.data);
  let sizeA = 0;
  let sizeB = 0;
  for (let i = 0; i < count; i++) {
    if (!inside(i)) continue;
    if (owner[i] === 2) {
      dataA[i] = field.band;
      sizeB += 1;
    } else {
      // Unreached inside cells (disconnected crumbs) stay with A.
      dataB[i] = field.band;
      sizeA += 1;
    }
  }
  if (sizeA === 0 || sizeB === 0) return null;
  return { a: { ...field, data: dataA }, b: { ...field, data: dataB } };
}
