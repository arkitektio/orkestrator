/**
 * The marching-cubes case table — GENERATED, not transcribed (the same
 * stance as `marchingTets.ts`: a page of hand-copied constants is easy to
 * corrupt and impossible to review; a derivation is small and its
 * invariants are proved by the watertightness/volume tests).
 *
 * For each of the 256 inside-masks the surface inside the cell is one or
 * more closed LOOPS of crossing edges. A loop is walked across the cube's
 * faces: on a face with two crossings they pair; on an AMBIGUOUS face (two
 * diagonally-inside corners, four crossings) each inside corner pairs its
 * own two crossings — the "separate" resolution, applied identically by the
 * two cells sharing the face, so the surface stays watertight across cells
 * (the classic MC hole comes from resolving the same face two ways). Each
 * loop is fan-triangulated and wound so `cross(v1-v0, v2-v0)` points OUT of
 * the inside region — the convention `tubeMarch.ts` and the WGSL kernel
 * share with the tet table.
 *
 * Typically 1–4 triangles per crossing cell, against the tets' 4–12, with no
 * diagonal bias: the ridges the tet decomposition leaves along the 0–7
 * diagonal simply do not exist here.
 *
 * Conventions (identical to `marchingTets.ts`):
 * - corner `c` (0..7) sits at offset `(c&1, c>>1&1, c>>2&1)`;
 * - "inside" = cost <= iso; mask bit `c` set ⟺ corner `c` inside.
 */

/** Cube corner id → cell-local offset. */
export const CUBE_CORNER_OFFSET: readonly (readonly [number, number, number])[] = Array.from(
  { length: 8 },
  (_, c) => [c & 1, (c >> 1) & 1, (c >> 2) & 1] as const,
);

/** The 12 cube edges as corner-id pairs (x-edges, then y, then z). */
export const CUBE_EDGES: readonly (readonly [number, number])[] = [
  [0, 1], [2, 3], [4, 5], [6, 7], // along x
  [0, 2], [1, 3], [4, 6], [5, 7], // along y
  [0, 4], [1, 5], [2, 6], [3, 7], // along z
];

/** The 6 faces as corner ids in cyclic order (so consecutive pairs are edges). */
const FACES: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 3, 2], // z = 0
  [4, 6, 7, 5], // z = 1
  [0, 4, 5, 1], // y = 0
  [2, 3, 7, 6], // y = 1
  [0, 2, 6, 4], // x = 0
  [1, 5, 7, 3], // x = 1
];

const edgeId = (a: number, b: number): number => {
  const index = CUBE_EDGES.findIndex(([p, q]) => (p === a && q === b) || (p === b && q === a));
  if (index === -1) throw new Error(`no cube edge ${a}-${b}`);
  return index;
};

/** Per face: its four edges as edge ids, in the face's cyclic order. */
const FACE_EDGES: readonly (readonly number[])[] = FACES.map((corners) =>
  corners.map((c, i) => edgeId(c, corners[(i + 1) % 4])),
);

const inside = (mask: number, corner: number): boolean => ((mask >> corner) & 1) === 1;

/** The inside endpoint of a crossing edge. */
const insideEnd = (mask: number, edge: number): number => {
  const [p, q] = CUBE_EDGES[edge];
  return inside(mask, p) ? p : q;
};

/**
 * For every crossing edge, its two partner edges (one per adjacent face).
 * `partners.get(e)` is exactly two entries; walking them yields the loops.
 */
const pairCrossings = (mask: number): Map<number, number[]> => {
  const partners = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    (partners.get(a) ?? partners.set(a, []).get(a)!).push(b);
    (partners.get(b) ?? partners.set(b, []).get(b)!).push(a);
  };
  for (let f = 0; f < FACES.length; f += 1) {
    const corners = FACES[f];
    const edges = FACE_EDGES[f];
    const crossing = edges.filter((e) => {
      const [p, q] = CUBE_EDGES[e];
      return inside(mask, p) !== inside(mask, q);
    });
    if (crossing.length === 2) {
      link(crossing[0], crossing[1]);
    } else if (crossing.length === 4) {
      // Ambiguous face: two diagonal inside corners. Each inside corner pairs
      // the two face edges that meet at it — the "separate" resolution.
      for (let i = 0; i < 4; i += 1) {
        const c = corners[i];
        if (!inside(mask, c)) continue;
        link(edges[(i + 3) % 4], edges[i]); // the edges before and after corner i
      }
    }
  }
  return partners;
};

/** Cross product of the loop's fan about a reference point (0.5 = mid-edge). */
const loopNormal = (loop: readonly number[]): [number, number, number] => {
  const point = (e: number): [number, number, number] => {
    const [p, q] = CUBE_EDGES[e];
    const a = CUBE_CORNER_OFFSET[p];
    const b = CUBE_CORNER_OFFSET[q];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  };
  const n: [number, number, number] = [0, 0, 0];
  const v0 = point(loop[0]);
  for (let i = 1; i + 1 < loop.length; i += 1) {
    const v1 = point(loop[i]);
    const v2 = point(loop[i + 1]);
    const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
    const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
    n[0] += ay * bz - az * by;
    n[1] += az * bx - ax * bz;
    n[2] += ax * by - ay * bx;
  }
  return n;
};

/** Every closed loop of one mask, wound so the fan normal points OUT of the inside. */
function cubeLoops(mask: number): number[][] {
  const partners = pairCrossings(mask);
  const seen = new Set<number>();
  const loops: number[][] = [];
  for (const start of [...partners.keys()].sort((a, b) => a - b)) {
    if (seen.has(start)) continue;
    const loop: number[] = [];
    let previous = -1;
    let current = start;
    do {
      loop.push(current);
      seen.add(current);
      const [a, b] = partners.get(current)!;
      const next = a === previous ? b : a;
      previous = current;
      current = next;
    } while (current !== start);

    // Orientation: the normal must point away from the loop's inside corners.
    const insideCorners = loop.map((e) => insideEnd(mask, e));
    const insideCentroid = [0, 0, 0];
    for (const c of insideCorners) {
      insideCentroid[0] += CUBE_CORNER_OFFSET[c][0] / insideCorners.length;
      insideCentroid[1] += CUBE_CORNER_OFFSET[c][1] / insideCorners.length;
      insideCentroid[2] += CUBE_CORNER_OFFSET[c][2] / insideCorners.length;
    }
    const centroid = [0, 0, 0];
    for (const e of loop) {
      const [p, q] = CUBE_EDGES[e];
      centroid[0] += (CUBE_CORNER_OFFSET[p][0] + CUBE_CORNER_OFFSET[q][0]) / 2 / loop.length;
      centroid[1] += (CUBE_CORNER_OFFSET[p][1] + CUBE_CORNER_OFFSET[q][1]) / 2 / loop.length;
      centroid[2] += (CUBE_CORNER_OFFSET[p][2] + CUBE_CORNER_OFFSET[q][2]) / 2 / loop.length;
    }
    const n = loopNormal(loop);
    const outward = [centroid[0] - insideCentroid[0], centroid[1] - insideCentroid[1], centroid[2] - insideCentroid[2]];
    if (n[0] * outward[0] + n[1] * outward[1] + n[2] * outward[2] < 0) loop.reverse();
    loops.push(loop);
  }
  return loops;
}

/**
 * `MC_TRIANGLE_TABLE[mask]` = the triangles of that inside-mask as EDGE ids,
 * three per triangle, fan-triangulated per loop. Computed once at module
 * load; the CPU march and the WGSL serialization both read it.
 */
export const MC_TRIANGLE_TABLE: readonly (readonly number[])[] = Array.from({ length: 256 }, (_, mask) => {
  if (mask === 0 || mask === 255) return [];
  const triangles: number[] = [];
  for (const loop of cubeLoops(mask)) {
    for (let i = 1; i + 1 < loop.length; i += 1) triangles.push(loop[0], loop[i], loop[i + 1]);
  }
  return triangles;
});

/**
 * The table as WGSL constants, in the tet table's packing: `MC_TRI_OFFSETS
 * [mask]` indexes into `MC_TRI_EDGES`, whose entries pack an edge's cube
 * corner ids as `p | (q << 3)` — so the kernel's interpolation code is the
 * same for both marchers.
 */
export function mcTableWGSL(): string {
  const offsets: number[] = [0];
  const edges: number[] = [];
  for (const triangles of MC_TRIANGLE_TABLE) {
    for (const e of triangles) {
      const [p, q] = CUBE_EDGES[e];
      edges.push(p | (q << 3));
    }
    offsets.push(edges.length);
  }
  return /* wgsl */ `
const MC_TRI_OFFSETS = array<u32, ${offsets.length}>(${offsets.join("u, ")}u);
const MC_TRI_EDGES = array<u32, ${edges.length}>(${edges.join("u, ")}u);
`;
}
