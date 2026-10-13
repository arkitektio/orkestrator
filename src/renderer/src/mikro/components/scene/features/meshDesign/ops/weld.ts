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

/**
 * The welded vertices, found by an open-addressing table over the quantized
 * coordinates. A surface is hundreds of thousands of corners, and a `Map`
 * keyed by a string per corner spent more time building keys than welding.
 * The quantized coordinates are kept as doubles (a scene coordinate over a
 * micron does not fit 32 bits) and compared exactly; only the HASH folds them.
 */
const createVertexTable = (capacityHint: number, precision: number) => {
  let capacity = 16;
  while (capacity < capacityHint * 2) capacity *= 2;
  let slots = new Int32Array(capacity).fill(-1);
  let keys = new Float64Array(Math.max(3, capacityHint * 3));
  let positions = new Float32Array(Math.max(3, capacityHint * 3));
  let count = 0;

  const hash = (qx: number, qy: number, qz: number): number =>
    (Math.imul(qx | 0, 73856093) ^ Math.imul(qy | 0, 19349663) ^ Math.imul(qz | 0, 83492791)) >>> 0;

  const grow = () => {
    capacity *= 2;
    slots = new Int32Array(capacity).fill(-1);
    for (let v = 0; v < count; v++) {
      let slot = hash(keys[v * 3], keys[v * 3 + 1], keys[v * 3 + 2]) & (capacity - 1);
      while (slots[slot] !== -1) slot = (slot + 1) & (capacity - 1);
      slots[slot] = v;
    }
  };

  return {
    indexOf(x: number, y: number, z: number): number {
      const qx = Math.round(x / precision);
      const qy = Math.round(y / precision);
      const qz = Math.round(z / precision);
      let slot = hash(qx, qy, qz) & (capacity - 1);
      for (;;) {
        const found = slots[slot];
        if (found === -1) break;
        if (keys[found * 3] === qx && keys[found * 3 + 1] === qy && keys[found * 3 + 2] === qz) return found;
        slot = (slot + 1) & (capacity - 1);
      }
      if (count * 3 === keys.length) {
        const nextKeys = new Float64Array(keys.length * 2);
        nextKeys.set(keys);
        keys = nextKeys;
        const nextPositions = new Float32Array(positions.length * 2);
        nextPositions.set(positions);
        positions = nextPositions;
      }
      const index = count++;
      keys[index * 3] = qx;
      keys[index * 3 + 1] = qy;
      keys[index * 3 + 2] = qz;
      // The FIRST corner seen at a point is the vertex, unquantized.
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
      slots[slot] = index;
      if (count * 2 > capacity) grow();
      return index;
    },
    positions: (): Float32Array => positions.slice(0, count * 3),
  };
};

export function weldSoup(positions: Float32Array, precision = WELD_PRECISION): DesignGeometry {
  const corners = Math.floor(positions.length / 9) * 3;
  // A closed surface has about half as many vertices as triangles.
  const table = createVertexTable(Math.ceil(corners / 4), precision);
  const indices = new Uint32Array(corners);
  let written = 0;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const a = table.indexOf(positions[i], positions[i + 1], positions[i + 2]);
    const b = table.indexOf(positions[i + 3], positions[i + 4], positions[i + 5]);
    const c = table.indexOf(positions[i + 6], positions[i + 7], positions[i + 8]);
    if (a === b || b === c || a === c) continue;
    indices[written++] = a;
    indices[written++] = b;
    indices[written++] = c;
  }
  return { positions: table.positions(), indices: indices.slice(0, written) };
}

/**
 * Weld an ALREADY indexed geometry — the edit-existing path, where a fabriks
 * collection's cells each carry their own copy of a border vertex (LOCKED
 * boundaries) and the pieces must become one mesh again.
 */
export function weldIndexed(geometry: DesignGeometry, precision = WELD_PRECISION): DesignGeometry {
  const { positions, indices } = geometry;
  const vertexCount = positions.length / 3;
  const table = createVertexTable(vertexCount, precision);
  const remap = new Uint32Array(vertexCount);
  for (let v = 0; v < vertexCount; v++) {
    remap[v] = table.indexOf(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
  }
  const out = new Uint32Array(indices.length);
  let written = 0;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = remap[indices[t]];
    const b = remap[indices[t + 1]];
    const c = remap[indices[t + 2]];
    if (a === b || b === c || a === c) continue;
    out[written++] = a;
    out[written++] = b;
    out[written++] = c;
  }
  return { positions: table.positions(), indices: out.slice(0, written) };
}
