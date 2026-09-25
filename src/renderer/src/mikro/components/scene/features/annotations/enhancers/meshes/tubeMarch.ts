import type { CorridorBox } from "../shared/corridorPlan";
import { corridorIndex } from "../shared/corridorPlan";
import { TET_CORNERS, TET_TRIANGLE_TABLE, type TetEdge } from "./marchingTets";
import { CUBE_EDGES, MC_TRIANGLE_TABLE } from "./marchingCubes";

/**
 * CPU tube-surface extraction: the isosurface of the corridor cost field —
 * the parity truth for the GPU tube kernel and the runtime fallback when
 * compute is unavailable. Two marchers share ONE cell walk and differ only
 * in their case table (`CELL_TABLES`): marching tetrahedra
 * (`marchingTets.ts`) and marching cubes (`marchingCubes.ts`). Both tables
 * are keyed by the cell's 8-bit inside-mask and answer edge pairs, three per
 * triangle, so the interpolation, the vertex convention and the truncation
 * contract are identical by construction.
 *
 * "Inside" is `cost <= iso`: cost is monotone-decreasing in brightness
 * (`corridorCost.voxelCost`), so a threshold τ on normalized intensity IS a
 * threshold `voxelCost(τ)` on cost — the surface wraps the bright structure
 * the user painted over. Corridor walls and unresident voxels are INF, i.e.
 * outside, so the tube closes against them.
 *
 * Interpolation clamps corner values to `2·iso` (`tubeClampValue`): raw INF
 * would park every wall crossing at t≈0, collapsing wall triangles onto the
 * inside voxel centers (degenerate, zero-area); the clamp lands them
 * mid-edge instead. The clamp can never flip inside-ness — `min(v, 2·iso)`
 * preserves `v <= iso` exactly, since iso > 0 always (base cost floor).
 *
 * Output positions are ABSOLUTE level-voxel coordinates at the voxel-center
 * convention (k + 0.5, COORDINATE_SYSTEMS.md); the caller applies the
 * volume's own index→physical map, exactly like the centerline.
 */

/** What corner values clamp to before interpolating — shared with the WGSL
 * tube kernel so the two surfaces are the same surface. */
export const tubeClampValue = (iso: number): number => 2 * iso;

/** Cube corner id → cell-local offset (matches `tetTable` conventions). */
const CORNER_OFFSET: readonly (readonly [number, number, number])[] = Array.from(
  { length: 8 },
  (_, c) => [c & 1, (c >> 1) & 1, (c >> 2) & 1] as const,
);

export type TubeMarchResult = {
  /** xyz triplets, 3 vertices per triangle (non-indexed soup). */
  positions: Float32Array;
  triangles: number;
  /** The vertex cap was hit; the surface is incomplete. */
  truncated: boolean;
};

export type MarchOptions = {
  cost: Float32Array;
  box: CorridorBox;
  /** Cost-space iso value; inside = cost <= iso. */
  iso: number;
  maxVertices?: number;
};

/** A case table over the cell's 8-bit inside-mask: edge pairs, 3 per triangle. */
export type CellTable = readonly (readonly TetEdge[])[];

/** The tet decomposition folded to one table per CELL mask. */
export const TET_CELL_TABLE: CellTable = Array.from({ length: 256 }, (_, cellMask) => {
  const edges: TetEdge[] = [];
  for (let t = 0; t < TET_CORNERS.length; t += 1) {
    const corners = TET_CORNERS[t];
    let mask = 0;
    for (let i = 0; i < 4; i += 1) if (cellMask & (1 << corners[i])) mask |= 1 << i;
    edges.push(...TET_TRIANGLE_TABLE[t][mask]);
  }
  return edges;
});

/** Marching cubes, as corner-id edge pairs. */
export const MC_CELL_TABLE: CellTable = MC_TRIANGLE_TABLE.map((edges) => edges.map((e) => CUBE_EDGES[e]));

/** One cell walk for every marcher. */
export function marchSurface(opts: MarchOptions, table: CellTable): TubeMarchResult {
  const { cost, box, iso, maxVertices = Infinity } = opts;
  const [sx, sy, sz] = box.size;

  const out: number[] = [];
  let truncated = false;

  const clampValue = tubeClampValue(iso);
  const clamped = (x: number, y: number, z: number): number =>
    Math.min(cost[corridorIndex(box, x, y, z)], clampValue);

  const values = new Float64Array(8);

  for (let z = 0; z + 1 < sz && !truncated; z += 1) {
    for (let y = 0; y + 1 < sy && !truncated; y += 1) {
      for (let x = 0; x + 1 < sx; x += 1) {
        let cellMask = 0;
        for (let c = 0; c < 8; c += 1) {
          const [ox, oy, oz] = CORNER_OFFSET[c];
          values[c] = clamped(x + ox, y + oy, z + oz);
          if (values[c] <= iso) cellMask |= 1 << c;
        }
        if (cellMask === 0 || cellMask === 0xff) continue; // no crossing

        const edges = table[cellMask];
        for (let e = 0; e < edges.length; e += 3) {
          if (out.length / 3 + 3 > maxVertices) {
            truncated = true;
            break;
          }
          for (let k = 0; k < 3; k += 1) {
            const [p, q] = edges[e + k];
            const vp = values[p];
            const vq = values[q];
            const s = (iso - vp) / (vq - vp); // vp, vq straddle iso: vq != vp
            const [px, py, pz] = CORNER_OFFSET[p];
            const [qx, qy, qz] = CORNER_OFFSET[q];
            out.push(
              box.origin[0] + x + px + s * (qx - px) + 0.5,
              box.origin[1] + y + py + s * (qy - py) + 0.5,
              box.origin[2] + z + pz + s * (qz - pz) + 0.5,
            );
          }
        }
        if (truncated) break;
      }
    }
  }

  // Drop a trailing partial triangle from the truncation point.
  const vertices = Math.floor(out.length / 9) * 9;
  return {
    positions: Float32Array.from(out.slice(0, vertices)),
    triangles: vertices / 9,
    truncated,
  };
}

/** Marching tetrahedra over the corridor field. */
export const marchTube = (opts: MarchOptions): TubeMarchResult => marchSurface(opts, TET_CELL_TABLE);

/** Marching cubes over the corridor field. */
export const marchCubes = (opts: MarchOptions): TubeMarchResult => marchSurface(opts, MC_CELL_TABLE);
