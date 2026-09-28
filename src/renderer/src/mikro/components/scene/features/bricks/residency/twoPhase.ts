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

import type { FetchPhase } from "../octree/nodeAddress";



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
