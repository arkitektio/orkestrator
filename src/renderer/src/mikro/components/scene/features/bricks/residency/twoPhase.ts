/**
 * Two-phase bricks (`orkestrator.twoPhaseBricks`, default ON).
 *
 * A 3D brick's fetch box is payload ± 1 border, so with brick-aligned chunks
 * an interior brick touches 3 chunks per axis = 27 chunks — all awaited before
 * the repack can start, for a 1-voxel rind. Two-phase splits that:
 *
 * - **core**: fetch only the chunks touching the PAYLOAD box (one, when chunks
 *   are brick-aligned), repack with the border edge-replicated from the
 *   payload (`replicateEdges` / the kernel's clamp already do this for
 *   level-edge bricks), upload → the brick is RESIDENT and *provisional*.
 * - **halo** (`full`): re-fetch with the border box at prefetch priority
 *   (behind every planned core fetch), re-repack, overwrite the same slot.
 *   Under the shared decode cache this costs no extra bytes once the
 *   neighbours are planned; only the 1-voxel rind changes on screen.
 *
 * Pure policy lives here so it is unit-testable without a manager.
 */

import type { Vec3 } from "../../../platform/coords/levelGeometry";
import { nodeKey, type FetchPhase } from "../octree/nodeAddress";

/** Two-phase bricks on/off (compile-time; the residency manager and the
 * planner's chunk ledger must agree, so both read it from here). */
export const TWO_PHASE_BRICKS = true;

/**
 * R11 (compile-time kill switch): the plan pays for a brick's CORE chunks —
 * what its first fetch actually requests — and a halo is refined only where
 * the plan pays for its border chunks anyway.
 *
 * Before, the chunk ledger charged every brick its ±1 border too. With
 * brick-sized chunks that reaches all 26 neighbouring chunks, so a compact
 * region of k³ bricks was charged (k+2)³ chunks — 512 for 216 at k = 6 — and
 * the chunk budget held less than half the fine bricks it could. The idle
 * halo pass then really did decode that shell: a whole chunk per out-of-plan
 * neighbour, for one voxel layer of rind, on the far side of a boundary where
 * the neighbour is drawn coarser (or not at all) and the seam is a LOD seam
 * whatever the rind holds.
 *
 * Off: the ledger charges the full phase and every core upload queues its
 * halo — the previous behaviour.
 */
export const CORE_CHARGED_PLAN = true;

/** The phase the planner's chunk ledger charges a brick in. */
export function planChargePhase(border: number): FetchPhase {
  return CORE_CHARGED_PLAN
    ? initialFetchPhase({ enabled: TWO_PHASE_BRICKS, border })
    : "full";
}

/**
 * Whether a brick's halo can be refined from chunks the plan holds anyway:
 * every neighbour inside the level's brick grid (the 26 around it) is planned.
 *
 * Exact, not a heuristic: a brick's border voxels lie in its neighbours'
 * PAYLOADS, and a planned neighbour's core fetch covers every chunk touching
 * its payload — so the halo's extra chunks are a subset of chunks the plan
 * fetches for its own sake (decoded already, in flight, or about to be).
 */
export function haloCoveredByPlan(
  level: number,
  coords: Vec3,
  grid: Vec3,
  isPlanned: (key: string) => boolean,
): boolean {
  if (!CORE_CHARGED_PLAN) return true;
  for (let dz = -1; dz <= 1; dz++) {
    const z = coords[2] + dz;
    if (z < 0 || z >= grid[2]) continue;
    for (let dy = -1; dy <= 1; dy++) {
      const y = coords[1] + dy;
      if (y < 0 || y >= grid[1]) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        const x = coords[0] + dx;
        if (x < 0 || x >= grid[0]) continue;
        if (!isPlanned(nodeKey(level, [x, y, z]))) return false;
      }
    }
  }
  return true;
}



/**
 * The phase a brick's FIRST fetch runs in. Core only pays off when there is a
 * border to defer; a 2D brick (border 0) or a disabled flag fetches full in
 * one pass, bit-for-bit the legacy behaviour.
 */
export function initialFetchPhase(input: {
  enabled: boolean;
  border: number;
}): FetchPhase {
  return input.enabled && input.border > 0 ? "core" : "full";
}

/**
 * Whether a brick that just landed from a `core` fetch needs a halo refine.
 * Uniform (EMPTY) bricks never do: EMPTY holds no slot to refine, and a
 * uniform payload's replicated rind is exact.
 */
export function needsHaloRefine(input: {
  phase: FetchPhase;
  uniform: boolean;
}): boolean {
  return input.phase === "core" && !input.uniform;
}

/**
 * Whether a queued halo refine is still worth dispatching: the brick must be
 * planned, resident (a slot to overwrite) and still provisional, with nothing
 * else in flight or queued for the key.
 */
export function haloStillWanted(input: {
  planned: boolean;
  resident: boolean;
  provisional: boolean;
  inFlight: boolean;
  queued: boolean;
}): boolean {
  return input.planned && input.resident && input.provisional && !input.inFlight && !input.queued;
}
