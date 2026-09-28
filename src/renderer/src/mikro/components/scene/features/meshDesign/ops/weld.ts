import type { DesignGeometry } from "../store/meshDesignStore";

/**
 * Triangle soup → indexed geometry, by welding corners that agree to within
 * float noise.
 *
 * Marching tets emits a vertex per triangle corner, and the corners that meet
 * at a shared edge are computed from the same interpolation — so they agree
 * to within float noise rather than exactly. Welding on the raw bits would
 * find almost no duplicates and keep the soup under a different name. A
 * micron of a scene unit is far below anything the extraction resolves and
 * far above that noise.
 *
 * Degenerate triangles — ones whose corners weld to fewer than three distinct
 * vertices — are dropped: marching tets produces them wherever the isosurface
 * clips a tetrahedron exactly through a corner, and they render as nothing.
 */
export const WELD_PRECISION = 1e-6;

export function weldSoup(positions: Float32Array, precision = WELD_PRECISION): DesignGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const seen = new Map<string, number>();

  const indexOf = (x: number, y: number, z: number): number => {
    const key = `${Math.round(x / precision)},${Math.round(y / precision)},${Math.round(z / precision)}`;
    const existing = seen.get(key);
    if (existing !== undefined) return existing;
    const index = vertices.length / 3;
    vertices.push(x, y, z);
    seen.set(key, index);
    return index;
  };

  for (let i = 0; i + 8 < positions.length; i += 9) {
    const a = indexOf(positions[i], positions[i + 1], positions[i + 2]);
    const b = indexOf(positions[i + 3], positions[i + 4], positions[i + 5]);
    const c = indexOf(positions[i + 6], positions[i + 7], positions[i + 8]);
    if (a === b || b === c || a === c) continue;
    indices.push(a, b, c);
  }

  return { positions: Float32Array.from(vertices), indices: Uint32Array.from(indices) };
}

/**
 * Weld an ALREADY indexed geometry — the edit-existing path, where a fabriks
 * collection's cells each carry their own copy of a border vertex (LOCKED
 * boundaries) and the pieces must become one mesh again.
 */
export function weldIndexed(geometry: DesignGeometry, precision = WELD_PRECISION): DesignGeometry {
  const { positions, indices } = geometry;
  const remap = new Uint32Array(positions.length / 3);
  const vertices: number[] = [];
  const seen = new Map<string, number>();
  for (let v = 0; v < remap.length; v++) {
    const x = positions[v * 3];
    const y = positions[v * 3 + 1];
    const z = positions[v * 3 + 2];
    const key = `${Math.round(x / precision)},${Math.round(y / precision)},${Math.round(z / precision)}`;
    let index = seen.get(key);
    if (index === undefined) {
      index = vertices.length / 3;
      vertices.push(x, y, z);
      seen.set(key, index);
    }
    remap[v] = index;
  }
  const out: number[] = [];
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = remap[indices[t]];
    const b = remap[indices[t + 1]];
    const c = remap[indices[t + 2]];
    if (a === b || b === c || a === c) continue;
    out.push(a, b, c);
  }
  return { positions: Float32Array.from(vertices), indices: Uint32Array.from(out) };
}
