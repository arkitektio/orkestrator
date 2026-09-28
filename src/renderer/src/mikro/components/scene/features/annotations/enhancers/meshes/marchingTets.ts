/**
 * The marching-tetrahedra case table — GENERATED, not transcribed.
 *
 * The tube surface (`tubeMarch.ts`, `skeletonKernel.SKELETON_TUBE_WGSL`)
 * extracts the isosurface of the corridor cost field. Marching tetrahedra
 * rather than classic 256-case marching cubes on purpose: the MC tables are
 * a page of hand-copied constants that are easy to corrupt and hard to
 * verify, while the tet decomposition below is small enough to DERIVE — and
 * its orientation invariants are proved by the watertightness/volume tests
 * on `tubeMarch`. The WGSL kernel consumes `tetTableWGSL()`, so the GPU can
 * never drift from the tested table. Classic MC (fewer triangles per cell)
 * is a drop-in refinement later.
 *
 * Conventions:
 * - Cube corner id `c` (0..7) is the voxel at offset `(c&1, c>>1&1, c>>2&1)`
 *   from the cell's min corner.
 * - The 6 tets share the main diagonal 0–7, walking the edge cycle
 *   1→3→2→6→4→5→1; every tet in that construction is POSITIVELY oriented
 *   (det > 0), which is what makes one orientation rule serve all six.
 * - "Inside" = below the iso value (the tube interior — LOW cost is bright).
 *   Emitted triangles wind so `cross(v1-v0, v2-v0)` points OUT of the
 *   inside region.
 */

/** The 6 positively-oriented tets sharing the 0–7 diagonal. */
export const TET_CORNERS: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 3, 7],
  [0, 3, 2, 7],
  [0, 2, 6, 7],
  [0, 6, 4, 7],
  [0, 4, 5, 7],
  [0, 5, 1, 7],
];

/** An edge of a tet, as the CUBE corner ids of its two endpoints. The
 * isosurface vertex sits where the iso value crosses this edge. */
export type TetEdge = readonly [number, number];

const parityOf = (perm: readonly number[]): 0 | 1 => {
  let inversions = 0;
  for (let i = 0; i < perm.length; i += 1) {
    for (let j = i + 1; j < perm.length; j += 1) {
      if (perm[i] > perm[j]) inversions += 1;
    }
  }
  return (inversions % 2) as 0 | 1;
};

/**
 * Triangles for one tet under one inside-mask, as edge pairs (3 per
 * triangle). Mask bit `i` = tet-local corner `i` is inside. Derivation of
 * the orientation rules is in the module comment of the test file.
 */
function tetTriangles(
  corners: readonly [number, number, number, number],
  mask: number,
): TetEdge[] {
  const inside: number[] = [];
  const outside: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    (mask & (1 << i) ? inside : outside).push(i);
  }
  const edge = (p: number, q: number): TetEdge => [corners[p], corners[q]];

  if (inside.length === 0 || inside.length === 4) return [];

  if (inside.length === 1) {
    const [v0] = inside;
    let [j, k, l] = outside;
    if (parityOf([v0, j, k, l]) === 1) [k, l] = [l, k];
    return [edge(v0, j), edge(v0, k), edge(v0, l)];
  }

  if (inside.length === 3) {
    // One outside corner: the inside=1 triangle with reversed winding —
    // the outward normal now points TOWARD the lone outside corner.
    const [v0] = outside;
    let [j, k, l] = inside;
    if (parityOf([v0, j, k, l]) === 1) [k, l] = [l, k];
    return [edge(v0, j), edge(v0, l), edge(v0, k)];
  }

  // Two inside, two outside: a quad, cycled ac→ad→bd→bc (each consecutive
  // pair shares a tet face), split into two triangles.
  const [i0, i1] = inside;
  let [o0, o1] = outside;
  if (parityOf([i0, i1, o0, o1]) === 1) [o0, o1] = [o1, o0];
  return [
    edge(i0, o0),
    edge(i0, o1),
    edge(i1, o1),
    edge(i0, o0),
    edge(i1, o1),
    edge(i1, o0),
  ];
}

/**
 * The full table: `[tet][mask]` → flat triangle edge list. Built once at
 * module load; both the CPU march and the WGSL serialization read it.
 */
export const TET_TRIANGLE_TABLE: readonly (readonly (readonly TetEdge[])[])[] =
  TET_CORNERS.map((corners) =>
    Array.from({ length: 16 }, (_, mask) => tetTriangles(corners, mask)),
  );

/**
 * The table as WGSL constants: `TET_TRI_OFFSETS[t * 16 + mask]` indexes into
 * `TET_TRI_EDGES`, whose entries pack an edge's cube corner ids as
 * `p | (q << 3)`. Also emits `TET_MASK_CORNERS`, the per-tet cube corner
 * ids the kernel builds its mask from.
 */
export function tetTableWGSL(): string {
  const offsets: number[] = [0];
  const edges: number[] = [];
  for (const perMask of TET_TRIANGLE_TABLE) {
    for (const triangles of perMask) {
      for (const [p, q] of triangles) edges.push(p | (q << 3));
      offsets.push(edges.length);
    }
  }
  const corners = TET_CORNERS.flat();
  return /* wgsl */ `
const TET_MASK_CORNERS = array<u32, ${corners.length}>(${corners.join("u, ")}u);
const TET_TRI_OFFSETS = array<u32, ${offsets.length}>(${offsets.join("u, ")}u);
const TET_TRI_EDGES = array<u32, ${edges.length}>(${edges.join("u, ")}u);
`;
}
