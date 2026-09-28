/**
 * Smooth per-vertex normals for a triangle SOUP, without welding it.
 *
 * The live brush preview re-meshes at ~7 Hz and must not pay for a full weld
 * (string-keyed maps over 300k vertices) each round. Instead every corner is
 * hashed on its quantized position into a numeric-keyed map, the
 * area-weighted face normal is accumulated per hash, and each soup vertex
 * reads back the normalized sum — exactly `computeVertexNormals` on the
 * welded mesh, at soup layout.
 *
 * Quantization `precision` is the weld tolerance: marching emits shared
 * corners from the same interpolation, so they agree to float noise, and
 * 1e-4 of a level voxel is far below anything the extraction resolves.
 */
export function smoothSoupNormals(positions: Float32Array, precision = 1e-4): Float32Array {
  const vertexCount = Math.floor(positions.length / 3);
  const normals = new Float32Array(vertexCount * 3);
  if (vertexCount < 3) return normals;

  // Quantized coordinate → slot in the accumulation arrays.
  const slotOf = new Map<string, number>();
  const slot = new Int32Array(vertexCount);
  let slots = 0;
  const inv = 1 / precision;
  for (let v = 0; v < vertexCount; v++) {
    const i = v * 3;
    // Three rounded ints joined — a numeric pack would overflow for large
    // corridors; the string is short and the Map stays bounded by the number
    // of DISTINCT vertices, not corners.
    const key = `${Math.round(positions[i] * inv)},${Math.round(positions[i + 1] * inv)},${Math.round(positions[i + 2] * inv)}`;
    let s = slotOf.get(key);
    if (s === undefined) {
      s = slots++;
      slotOf.set(key, s);
    }
    slot[v] = s;
  }

  const sum = new Float64Array(slots * 3);
  for (let t = 0; t + 2 < vertexCount; t += 3) {
    const a = t * 3;
    const b = a + 3;
    const c = a + 6;
    const abx = positions[b] - positions[a];
    const aby = positions[b + 1] - positions[a + 1];
    const abz = positions[b + 2] - positions[a + 2];
    const acx = positions[c] - positions[a];
    const acy = positions[c + 1] - positions[a + 1];
    const acz = positions[c + 2] - positions[a + 2];
    // Unnormalized cross product = area-weighted (three's convention).
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    for (let k = 0; k < 3; k++) {
      const s = slot[t + k] * 3;
      sum[s] += nx;
      sum[s + 1] += ny;
      sum[s + 2] += nz;
    }
  }

  for (let v = 0; v < vertexCount; v++) {
    const s = slot[v] * 3;
    const x = sum[s];
    const y = sum[s + 1];
    const z = sum[s + 2];
    const length = Math.sqrt(x * x + y * y + z * z) || 1;
    normals[v * 3] = x / length;
    normals[v * 3 + 1] = y / length;
    normals[v * 3 + 2] = z / length;
  }
  return normals;
}
