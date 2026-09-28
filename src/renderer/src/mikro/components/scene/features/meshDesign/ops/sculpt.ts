import type { DesignGeometry } from "../store/meshDesignStore";

/**
 * The additive/subtractive brush on a design mesh.
 *
 * A designed mesh ACCUMULATES: every C/V stroke's extracted surface is
 * appended, every X stroke removes what lies within the brush of the
 * stroke. Both are plain triangle-list operations — no CSG. Overlapping
 * pieces keep their interior faces (a union would need a remesh, which is
 * the server-side consolidation job's business); erasing removes every
 * triangle whose centroid lies within `radius` of the stroke polyline, from
 * every piece at once, so a brushed-over region comes off cleanly.
 */

export type Vec3 = readonly [number, number, number];

/** Concatenate two indexed geometries (indices of `b` offset past `a`). */
export function mergeGeometry(a: DesignGeometry, b: DesignGeometry): DesignGeometry {
  const positions = new Float32Array(a.positions.length + b.positions.length);
  positions.set(a.positions, 0);
  positions.set(b.positions, a.positions.length);
  const indices = new Uint32Array(a.indices.length + b.indices.length);
  indices.set(a.indices, 0);
  const base = a.positions.length / 3;
  for (let i = 0; i < b.indices.length; i++) indices[a.indices.length + i] = b.indices[i] + base;
  return { positions, indices };
}

/** Squared distance from `p` to segment `ab`. */
const segmentDistanceSq = (p: Vec3, a: Vec3, b: Vec3): number => {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const abz = b[2] - a[2];
  const apx = p[0] - a[0];
  const apy = p[1] - a[1];
  const apz = p[2] - a[2];
  const len = abx * abx + aby * aby + abz * abz;
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, (apx * abx + apy * aby + apz * abz) / len));
  const dx = apx - abx * t;
  const dy = apy - aby * t;
  const dz = apz - abz * t;
  return dx * dx + dy * dy + dz * dz;
};

/** Squared distance from `p` to a polyline (a single point counts as one). */
export const polylineDistanceSq = (p: Vec3, points: readonly Vec3[]): number => {
  if (points.length === 0) return Infinity;
  if (points.length === 1) return segmentDistanceSq(p, points[0], points[0]);
  let best = Infinity;
  for (let i = 0; i + 1 < points.length; i++) {
    const d = segmentDistanceSq(p, points[i], points[i + 1]);
    if (d < best) best = d;
  }
  return best;
};

/**
 * Remove every triangle whose centroid lies within `radius` of the stroke.
 * Unreferenced vertices are dropped. Returns the input untouched when nothing
 * was hit, so callers can identity-compare.
 */
export function eraseNearPolyline(geometry: DesignGeometry, stroke: readonly Vec3[], radius: number): DesignGeometry {
  const { positions, indices } = geometry;
  const r2 = radius * radius;
  const kept: number[] = [];
  let removed = 0;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = indices[t] * 3;
    const b = indices[t + 1] * 3;
    const c = indices[t + 2] * 3;
    const centroid: Vec3 = [
      (positions[a] + positions[b] + positions[c]) / 3,
      (positions[a + 1] + positions[b + 1] + positions[c + 1]) / 3,
      (positions[a + 2] + positions[b + 2] + positions[c + 2]) / 3,
    ];
    if (polylineDistanceSq(centroid, stroke) <= r2) {
      removed += 1;
      continue;
    }
    kept.push(indices[t], indices[t + 1], indices[t + 2]);
  }
  if (removed === 0) return geometry;

  const remap = new Int32Array(positions.length / 3).fill(-1);
  let next = 0;
  for (const v of kept) if (remap[v] === -1) remap[v] = next++;
  const out = new Float32Array(next * 3);
  for (let v = 0; v < remap.length; v++) {
    const target = remap[v];
    if (target === -1) continue;
    out[target * 3] = positions[v * 3];
    out[target * 3 + 1] = positions[v * 3 + 1];
    out[target * 3 + 2] = positions[v * 3 + 2];
  }
  return { positions: out, indices: Uint32Array.from(kept, (v) => remap[v]) };
}
