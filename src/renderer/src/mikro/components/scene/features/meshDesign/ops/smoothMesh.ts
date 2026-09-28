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

  // Adjacency (CSR) and boundary detection from undirected edge counts.
  const degree = new Uint32Array(vertexCount);
  const edgeUse = new Map<number, number>();
  const edgeKey = (a: number, b: number) => (a < b ? a * vertexCount + b : b * vertexCount + a);
  for (let t = 0; t + 2 < indices.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = indices[t + k];
      const b = indices[t + ((k + 1) % 3)];
      const key = edgeKey(a, b);
      const seen = edgeUse.get(key) ?? 0;
      edgeUse.set(key, seen + 1);
      if (seen === 0) {
        degree[a] += 1;
        degree[b] += 1;
      }
    }
  }
  const offsets = new Uint32Array(vertexCount + 1);
  for (let v = 0; v < vertexCount; v++) offsets[v + 1] = offsets[v] + degree[v];
  const neighbours = new Uint32Array(offsets[vertexCount]);
  const fill = new Uint32Array(vertexCount);
  const pinned = new Uint8Array(vertexCount);
  for (const [key, uses] of edgeUse) {
    const a = Math.floor(key / vertexCount);
    const b = key % vertexCount;
    neighbours[offsets[a] + fill[a]++] = b;
    neighbours[offsets[b] + fill[b]++] = a;
    if (uses === 1) {
      pinned[a] = 1;
      pinned[b] = 1;
    }
  }

  let current = Float32Array.from(geometry.positions);
  let next = new Float32Array(current.length);
  const pass = (factor: number) => {
    for (let v = 0; v < vertexCount; v++) {
      const i = v * 3;
      const n = degree[v];
      if (pinned[v] || n === 0) {
        next[i] = current[i];
        next[i + 1] = current[i + 1];
        next[i + 2] = current[i + 2];
        continue;
      }
      let mx = 0, my = 0, mz = 0;
      for (let k = offsets[v]; k < offsets[v + 1]; k++) {
        const j = neighbours[k] * 3;
        mx += current[j];
        my += current[j + 1];
        mz += current[j + 2];
      }
      next[i] = current[i] + factor * (mx / n - current[i]);
      next[i + 1] = current[i + 1] + factor * (my / n - current[i + 1]);
      next[i + 2] = current[i + 2] + factor * (mz / n - current[i + 2]);
    }
    [current, next] = [next, current];
  };
  for (let it = 0; it < iterations; it++) {
    pass(lambda);
    pass(mu);
  }
  return { positions: current, indices };
}
