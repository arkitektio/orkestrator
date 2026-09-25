import { tetTableWGSL } from "./marchingTets";
import { mcTableWGSL } from "./marchingCubes";
import { marchCubes, marchTube, type MarchOptions, type TubeMarchResult } from "./tubeMarch";

/**
 * The pluggable isosurface marcher — one entry per algorithm, carrying BOTH
 * halves: the CPU march (`tubeMarch.ts`) and the pieces the WGSL tube
 * kernel needs (`shared/gpu/skeletonKernel.ts` `tubeWgslFor`). The kernel's
 * prologue (bindings, corner values, inside-mask, the interpolation and the
 * capped atomic append) is shared; a marcher contributes its case table as
 * WGSL constants and the loop that turns a cell's mask into triangles by
 * calling `emit_triangle(e, values, cell)` over its packed edge list.
 *
 * Adding a marcher = one entry here (+ its table module). Everything else —
 * the engines, the store, the panel toggle, the parity tests — is keyed off
 * `MarcherId`.
 */

export type MarcherId = "tets" | "cubes";

export type SurfaceMarcher = {
  id: MarcherId;
  label: string;
  description: string;
  /** The CPU march. */
  march: (opts: MarchOptions) => TubeMarchResult;
  /** WGSL `const` tables the kernel body reads. */
  wgslTables: () => string;
  /**
   * WGSL statements run per crossing cell with `cell_mask: u32`,
   * `values: array<f32, 8>` and `cell: vec3<f32>` in scope. Emits triangles
   * through `emit_triangle(e: u32, values, cell)`, where `e` indexes a
   * packed edge table (`p | (q << 3)`) of the marcher's own name.
   */
  wgslEmit: string;
};

const TETS: SurfaceMarcher = {
  id: "tets",
  label: "Tets",
  description: "Marching tetrahedra — six tets per voxel; robust, but 4–12 triangles a cell with a diagonal grain",
  march: marchTube,
  wgslTables: tetTableWGSL,
  wgslEmit: /* wgsl */ `
  for (var t = 0u; t < 6u; t = t + 1u) {
    var mask = 0u;
    for (var i = 0u; i < 4u; i = i + 1u) {
      if ((cell_mask & (1u << TET_MASK_CORNERS[t * 4u + i])) != 0u) {
        mask = mask | (1u << i);
      }
    }
    let edge_begin = TET_TRI_OFFSETS[t * 16u + mask];
    let edge_end = TET_TRI_OFFSETS[t * 16u + mask + 1u];
    for (var e = edge_begin; e < edge_end; e = e + 3u) {
      emit_triangle(TET_TRI_EDGES[e], TET_TRI_EDGES[e + 1u], TET_TRI_EDGES[e + 2u], values, cell);
    }
  }`,
};

const CUBES: SurfaceMarcher = {
  id: "cubes",
  label: "Cubes",
  description: "Marching cubes — one case per voxel; 1–4 triangles a cell, no diagonal grain",
  march: marchCubes,
  wgslTables: mcTableWGSL,
  wgslEmit: /* wgsl */ `
  let edge_begin = MC_TRI_OFFSETS[cell_mask];
  let edge_end = MC_TRI_OFFSETS[cell_mask + 1u];
  for (var e = edge_begin; e < edge_end; e = e + 3u) {
    emit_triangle(MC_TRI_EDGES[e], MC_TRI_EDGES[e + 1u], MC_TRI_EDGES[e + 2u], values, cell);
  }`,
};

export const MARCHERS: Record<MarcherId, SurfaceMarcher> = { tets: TETS, cubes: CUBES };

export const MARCHER_IDS: readonly MarcherId[] = ["cubes", "tets"];

export const DEFAULT_MARCHER: MarcherId = "cubes";

export const marcherFor = (id: MarcherId | undefined): SurfaceMarcher => MARCHERS[id ?? DEFAULT_MARCHER];
