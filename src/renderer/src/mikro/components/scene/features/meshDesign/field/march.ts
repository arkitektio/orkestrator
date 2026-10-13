import { CUBE_EDGES, MC_TRIANGLE_TABLE } from "../../annotations/enhancers/meshes/marchingCubes";
import type { DesignGeometry } from "../store/meshDesignStore";
import type { SculptField } from "./sculptField";

/**
 * The field's own march: marching cubes that emits an INDEXED mesh directly.
 *
 * Every design edit ends here, so this is the designer's hot loop. The
 * brush's marcher (`annotations/enhancers/meshes/tubeMarch.ts`) is built for a
 * corridor of raw data and answers a triangle soup that then has to be welded;
 * a field wants neither. Two things make this one cheap:
 *
 *  - **It walks the content, not the grid.** A field is mostly empty margin
 *    and, after a few additions, mostly empty space between pieces. One pass
 *    notes where each row is inside at all; a row of cells none of whose four
 *    grid rows holds an inside value cannot cross the surface and is skipped,
 *    and the rest are walked only across the span that does.
 *  - **A vertex belongs to a grid EDGE**, so the two-to-four cells around an
 *    edge find the same vertex in a two-plane cache instead of each emitting
 *    their own copy for a hash table to reunite. The result is a closed
 *    manifold by construction — it never depended on float noise agreeing.
 *
 * Same case table as the brush's cubes marcher (`MC_TRIANGLE_TABLE`), same
 * conventions: inside is `value <= 0`, corner `c` sits at `(c&1, c>>1&1,
 * c>>2&1)`, and a triangle's normal points out of the inside.
 */

/** Per cube edge: its lower corner's offset and the axis it runs along. */
const EDGE_CORNER_P = Uint8Array.from(CUBE_EDGES.map(([p]) => p));
const EDGE_CORNER_Q = Uint8Array.from(CUBE_EDGES.map(([, q]) => q));
const EDGE_AXIS = Uint8Array.from(CUBE_EDGES.map((_, e) => e >> 2));

/** The case table, flattened: `TRI_OFFSETS[mask] .. TRI_OFFSETS[mask + 1]` into `TRI_EDGES`. */
const TRI_OFFSETS = new Uint16Array(257);
const TRI_EDGES = (() => {
  const edges: number[] = [];
  MC_TRIANGLE_TABLE.forEach((triangles, mask) => {
    edges.push(...triangles);
    TRI_OFFSETS[mask + 1] = edges.length;
  });
  return Uint8Array.from(edges);
})();

/**
 * How close to a grid point a vertex may sit, as a fraction of the edge. A
 * value of exactly 0 on a corner (a cut through a cell centre, a box stamp on
 * the lattice) would put every vertex of the edges leaving that corner at the
 * same point: zero-area triangles. Held a hair off it they are merely small,
 * and the simplifier removes them.
 */
const EDGE_EPSILON = 1e-3;

export function marchField(field: SculptField): DesignGeometry {
  const { data, band, spacing } = field;
  const [nx, ny, nz] = field.size;
  const plane = nx * ny;

  // Where each grid row is inside: [lo, hi] in x, or lo > hi when nowhere.
  const rowLo = new Int32Array(ny * nz).fill(nx);
  const rowHi = new Int32Array(ny * nz).fill(-1);
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      const base = y * nx + z * plane;
      let lo = nx;
      let hi = -1;
      for (let x = 0; x < nx; x++) {
        if (data[base + x] <= 0) {
          if (lo === nx) lo = x;
          hi = x;
        }
      }
      rowLo[y + z * ny] = lo;
      rowHi[y + z * ny] = hi;
    }
  }

  let positions = new Float32Array(3 * 4096);
  let vertexCount = 0;
  let indices = new Uint32Array(3 * 8192);
  let indexCount = 0;

  // The vertex of each grid edge, by the plane the edge's lower corner is in:
  // x- and y-edges of the lower and the upper plane of the slab being walked,
  // and the z-edges between them.
  let lower = new Int32Array(plane * 2).fill(-1);
  let upper = new Int32Array(plane * 2).fill(-1);
  const between = new Int32Array(plane).fill(-1);
  let lowerDirty = false;
  let upperDirty = false;

  const values = new Float32Array(8);
  const corner = new Int32Array(8);

  for (let z = 0; z + 1 < nz; z++) {
    let betweenDirty = false;

    for (let y = 0; y + 1 < ny; y++) {
      const r00 = y + z * ny;
      const r10 = r00 + 1;
      const r01 = r00 + ny;
      const r11 = r01 + 1;
      const lo = Math.min(rowLo[r00], rowLo[r10], rowLo[r01], rowLo[r11]);
      const hi = Math.max(rowHi[r00], rowHi[r10], rowHi[r01], rowHi[r11]);
      if (lo > hi) continue; // nothing inside on any of the four rows
      const from = Math.max(0, lo - 1);
      const to = Math.min(nx - 2, hi);
      const base = y * nx + z * plane;
      for (let x = from; x <= to; x++) {
        const i = base + x;
        corner[0] = i;
        corner[1] = i + 1;
        corner[2] = i + nx;
        corner[3] = i + nx + 1;
        corner[4] = i + plane;
        corner[5] = i + plane + 1;
        corner[6] = i + plane + nx;
        corner[7] = i + plane + nx + 1;
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const value = data[corner[c]];
          values[c] = value < -band ? -band : value > band ? band : value;
          if (value <= 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 0xff) continue;

        for (let e = TRI_OFFSETS[mask]; e < TRI_OFFSETS[mask + 1]; e++) {
          const edge = TRI_EDGES[e];
          const p = EDGE_CORNER_P[edge];
          const axis = EDGE_AXIS[edge];
          const px = x + (p & 1);
          const py = y + ((p >> 1) & 1);
          const upperPlane = (p >> 2) & 1;
          const cache = axis === 2 ? between : upperPlane ? upper : lower;
          const slot = axis === 2 ? px + py * nx : (px + py * nx) * 2 + axis;
          let vertex = cache[slot];
          if (vertex === -1) {
            const vp = values[p];
            const vq = values[EDGE_CORNER_Q[edge]];
            // vp and vq straddle 0, so vq != vp.
            const s = Math.min(1 - EDGE_EPSILON, Math.max(EDGE_EPSILON, -vp / (vq - vp)));
            if (vertexCount * 3 === positions.length) {
              const grown = new Float32Array(positions.length * 2);
              grown.set(positions);
              positions = grown;
            }
            const o = vertexCount * 3;
            positions[o] = field.min[0] + (px + (axis === 0 ? s : 0) + 0.5) * spacing;
            positions[o + 1] = field.min[1] + (py + (axis === 1 ? s : 0) + 0.5) * spacing;
            positions[o + 2] = field.min[2] + (z + upperPlane + (axis === 2 ? s : 0) + 0.5) * spacing;
            vertex = vertexCount++;
            cache[slot] = vertex;
            if (axis === 2) betweenDirty = true;
            else if (upperPlane) upperDirty = true;
            else lowerDirty = true;
          }
          if (indexCount === indices.length) {
            const grown = new Uint32Array(indices.length * 2);
            grown.set(indices);
            indices = grown;
          }
          indices[indexCount++] = vertex;
        }
      }
    }
    if (betweenDirty) between.fill(-1);
    // This slab's upper plane is the next one's lower plane; the plane left
    // behind is recycled, cleared only if anything was written to it.
    const recycled = lower;
    const recycledDirty = lowerDirty;
    lower = upper;
    lowerDirty = upperDirty;
    upper = recycled;
    if (recycledDirty) upper.fill(-1);
    upperDirty = false;
  }

  return { positions: positions.slice(0, vertexCount * 3), indices: indices.slice(0, indexCount) };
}
