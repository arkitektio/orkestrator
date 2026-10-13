import type { DesignGeometry } from "../store/meshDesignStore";

/**
 * Taubin (λ|μ) smoothing on an indexed mesh — Laplacian smoothing without
 * the shrinkage. Each iteration moves every vertex toward the mean of its
 * neighbours by λ, then away by μ (|μ| slightly > λ), which damps the
 * high-frequency marching artefacts (tet ridges, voxel stair-steps) while
 * the low frequencies — the shape — stay where they were.
 *
 * BOUNDARY vertices are pinned: an edge with a single incident triangle is
 * the corridor's clipped border, and moving it would open a seam against
 * the next stroke and defeat the simplifier's `LockBorder`.
 *
 * No adjacency structure is built. A pass walks the TRIANGLES and hands each
 * corner its two partners; on a closed surface every neighbour arrives
 * exactly twice (once from each triangle on their shared edge), so the
 * average is the neighbours' average. The border falls out of the same walk:
 * around an interior vertex every neighbour is reached once along an edge
 * leaving it and once along an edge arriving at it, so the two (hashed) sums
 * agree — where they do not, an edge has one triangle only. This runs on the
 * whole surface after every edit; an edge map per call cost more than the
 * smoothing itself.
 */
export type TaubinOptions = {
  iterations: number;
  lambda?: number;
  mu?: number;
};

export function taubinSmooth(geometry: DesignGeometry, options: TaubinOptions): DesignGeometry {
  const iterations = Math.max(0, Math.floor(options.iterations));
  if (iterations === 0 || geometry.indices.length < 3) return geometry;
  const lambda = options.lambda ?? 0.5;
  const mu = options.mu ?? -0.53;
  const { indices } = geometry;
  const vertexCount = geometry.positions.length / 3;

  // Border detection: per vertex, the hashed sum of the neighbours its
  // outgoing edges lead to against that of the neighbours its incoming edges
  // come from (uint32 arithmetic; the hash keeps two different neighbour
  // sets from summing alike).
  const leaving = new Uint32Array(vertexCount);
  const arriving = new Uint32Array(vertexCount);
  const weight = new Uint32Array(vertexCount);
  const hashOf = (v: number) => Math.imul(v + 1, 0x9e3779b1) >>> 0;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = indices[t + k];
      const b = indices[t + ((k + 1) % 3)];
      leaving[a] += hashOf(b);
      arriving[b] += hashOf(a);
      weight[a] += 1;
      weight[b] += 1;
    }
  }
  const pinned = new Uint8Array(vertexCount);
  for (let v = 0; v < vertexCount; v++) if (leaving[v] !== arriving[v]) pinned[v] = 1;

  let current = Float32Array.from(geometry.positions);
  let next = new Float32Array(current.length);
  const sums = new Float64Array(current.length);
  const pass = (factor: number) => {
    sums.fill(0);
    for (let t = 0; t + 2 < indices.length; t += 3) {
      const a = indices[t] * 3;
      const b = indices[t + 1] * 3;
      const c = indices[t + 2] * 3;
      for (let axis = 0; axis < 3; axis++) {
        const pa = current[a + axis];
        const pb = current[b + axis];
        const pc = current[c + axis];
        sums[a + axis] += pb + pc;
        sums[b + axis] += pa + pc;
        sums[c + axis] += pa + pb;
      }
    }
    for (let v = 0; v < vertexCount; v++) {
      const i = v * 3;
      const n = weight[v];
      if (pinned[v] || n === 0) {
        next[i] = current[i];
        next[i + 1] = current[i + 1];
        next[i + 2] = current[i + 2];
        continue;
      }
      next[i] = current[i] + factor * (sums[i] / n - current[i]);
      next[i + 1] = current[i + 1] + factor * (sums[i + 1] / n - current[i + 1]);
      next[i + 2] = current[i + 2] + factor * (sums[i + 2] / n - current[i + 2]);
    }
    [current, next] = [next, current];
  };
  for (let it = 0; it < iterations; it++) {
    pass(lambda);
    pass(mu);
  }
  return { positions: current, indices };
}
