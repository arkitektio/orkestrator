import type { GpuFlushOutcome } from "../gpu/computeRepack";
import { setPageEntry } from "../gpu/pageTableTexture";
import { encodeEmptyTexel, encodeOccupancyTexel } from "../octree/brickEncoding";
import { parseNodeKey } from "../octree/nodeAddress";
import { normalizeSlabRanges } from "../octree/occupancySlabs";
import type { PlannedNode } from "../octree/nodePlanning";
import {
  PAGE_FLAG_EMPTY,
  PAGE_FLAG_RESIDENT,
  PAGE_FLAG_UNMAPPED,
} from "../octree/pageTableLayout";
import {
  accumulateOccRange,
  occEncodeRangeOf,
  recordMeasuredRange,
  slabTexelsOf,
} from "./rangeEncoding";
import type { BrickSystemStats, GpuBrickToken, LayerBrickPool } from "./residencyTypes";

/**
 * The GPU-repack readback continuation, split out of the residency manager:
 * token validation and the per-brick page-table bookkeeping a flush outcome
 * implies. The manager keeps the scheduling around it (the throttled
 * residency bump and the streaming frame), and lends the two operations that
 * are its own — the auto-range fold and the fetch requeue.
 */

/**
 * One-time diagnostic per brick key for the GPU-repack "no dispatches" case.
 * Capped so a pathological dataset cannot grow it without bound (past the cap
 * it degrades to warn-never, which is acceptable for a diagnostics channel —
 * the same trade `transformGraph`'s warnOnce makes).
 */
const GPU_INELIGIBLE_WARN_CAP = 64;
const gpuIneligibleWarned = new Set<string>();
const warnOnceGpuIneligible = (key: string, message: string): void => {
  if (gpuIneligibleWarned.has(key) || gpuIneligibleWarned.size >= GPU_INELIGIBLE_WARN_CAP) return;
  gpuIneligibleWarned.add(key);
  console.warn(message);
};

/** The pool for a GPU token, iff the brick still occupies the slot it was
 * dispatched into (nothing evicted, remapped, flushed, or disposed since). */
export function resolveGpuToken(
  pools: ReadonlyMap<string, LayerBrickPool>,
  token: GpuBrickToken,
): LayerBrickPool | null {
  const pool = token.pool;
  // Disposed (no longer registered under its CURRENT key) or flushed since.
  if (pools.get(pool.poolKey) !== pool) return null;
  if (pool.flushEpoch !== token.flushEpoch) return null;
  const slot = pool.pool.slotOf(token.key);
  if (!slot || slot.index !== token.slotIndex) return null;
  return pool;
}

export type GpuOutcomeContext = {
  pools: ReadonlyMap<string, LayerBrickPool>;
  stats: BrickSystemStats;
  /** The manager's auto-contrast fold (pool fields + its bump scheduling). */
  accumulateAutoRange: (pool: LayerBrickPool, brickMin: number, brickMax: number) => void;
  /** Requeue a still-planned brick whose dispatch never wrote its slot: wake
   * the drain, push it at the fetch queue's tail, and dispatch. */
  requeueFetch: (pool: LayerBrickPool, node: PlannedNode) => void;
};

/**
 * Min/max-readback continuation for a GPU repack batch: EMPTY demotion of
 * uniform bricks and unmapping of failed dispatches. Lands a few frames
 * after the dispatch, so every token re-validates against the CURRENT slot
 * mapping — an evicted/remapped/flushed brick is silently skipped. Returns
 * whether any pool's page table was touched (the caller then bumps and
 * requests a frame).
 */
export function applyGpuOutcomeToPools(
  outcome: GpuFlushOutcome<GpuBrickToken>,
  ctx: GpuOutcomeContext,
): boolean {
  const { pools, stats } = ctx;
  let touched = false;

  for (const result of outcome.results) {
    const pool = resolveGpuToken(pools, result.token);
    if (!pool) continue;
    // Fold every brick's range into the layer auto-contrast, uniform or not.
    ctx.accumulateAutoRange(pool, result.min, result.max);
    if (result.uniformValue === null) {
      // Non-uniform GPU brick: its occupancy texel was written as "unknown"
      // at dispatch — backfill the real min/max bracket now that the
      // readback delivered it (resolveGpuToken already validated the slot).
      const { level, coords } = parseNodeKey(result.token.key);
      const slot = pool.pool.slotOf(result.token.key);
      if (slot) {
        pool.brickRanges.set(result.token.key, [result.min, result.max]);
        const slabRanges =
          pool.occSlabs > 1
            ? normalizeSlabRanges(result.slabRanges, pool.spec.channelCount)
            : null;
        if (slabRanges) pool.brickSlabRanges.set(result.token.key, slabRanges);
        accumulateOccRange(pool, result.min, result.max);
        recordMeasuredRange(
          pool,
          stats,
          result.token.key,
          level,
          coords,
          result.min,
          result.max,
          slabRanges,
        );
        setPageEntry(
          pool.pageTable,
          level,
          coords,
          slot.coords,
          PAGE_FLAG_RESIDENT,
          // "Unknown" while a promotion is in flight — see drainEntry.
          pool.occReencodePending
            ? undefined
            : encodeOccupancyTexel(result.min, result.max, occEncodeRangeOf(pool)),
          pool.occReencodePending ? undefined : slabTexelsOf(pool, slabRanges),
        );
        touched = true;
      }
      continue;
    }
    const { level, coords } = parseNodeKey(result.token.key);
    // Uniform brick: the same EMPTY demotion the CPU path applies before
    // acquiring a slot — just deferred to the readback; the slot frees up.
    const texel = encodeEmptyTexel(result.uniformValue, pool, pool.emptyBits);
    setPageEntry(pool.pageTable, level, coords, texel, PAGE_FLAG_EMPTY);
    pool.pool.release(result.token.key);
    pool.provisionalKeys.delete(result.token.key);
    pool.coarsestResident.delete(result.token.key);
    pool.brickRanges.delete(result.token.key);
    pool.brickSlabRanges.delete(result.token.key);
    pool.emptyValues.set(result.token.key, result.uniformValue);
    // See the CPU EMPTY-demotion site: uniforms feed the observed range.
    accumulateOccRange(pool, result.uniformValue, result.uniformValue);
    recordMeasuredRange(
      pool,
      stats,
      result.token.key,
      level,
      coords,
      result.uniformValue,
      result.uniformValue,
    );
    stats.emptyBricks += 1;
    touched = true;
  }

  // Bricks the GPU repacker can NEVER produce. Marked BEFORE the shared
  // unmap/requeue below so the retry this schedules already sees the key as
  // GPU-ineligible and takes the CPU path. Skipping this is what made the
  // requeue an infinite loop: `broken` is only set by a BATCH failure, so a
  // per-job failure left the repacker healthy and the retry came straight
  // back here.
  for (const token of outcome.unsupported) {
    const pool = resolveGpuToken(pools, token);
    if (!pool) continue;
    pool.gpuIneligibleKeys.add(token.key);
    const { level, coords } = parseNodeKey(token.key);
    warnOnceGpuIneligible(
      token.key,
      `[bricks] gpu repack produced no dispatches for brick ${level}:${coords.join(",")} ` +
        `(no chunk overlaps it); falling back to CPU repack for this brick. ` +
        `This usually means the planner asked for a brick the level geometry does not cover.`,
    );
  }

  for (const token of [...outcome.failed, ...outcome.unsupported]) {
    const pool = resolveGpuToken(pools, token);
    if (!pool) continue;
    const { level, coords } = parseNodeKey(token.key);
    // The dispatch never wrote the slot: unmap it and requeue the fetch.
    // A failed BATCH marks the repacker broken, so that retry repacks on the
    // CPU path; an `unsupported` job is diverted per-key just above.
    setPageEntry(pool.pageTable, level, coords, null, PAGE_FLAG_UNMAPPED);
    pool.pool.release(token.key);
    pool.provisionalKeys.delete(token.key);
    pool.coarsestResident.delete(token.key);
    pool.brickRanges.delete(token.key);
    pool.brickSlabRanges.delete(token.key);
    stats.fetchErrors += 1;
    if (pool.protectedKeys.has(token.key)) {
      // Tail = next to dispatch (pendingFetch is in reverse dispatch order
      // and never re-sorted after reconcile, so score/band are inert here).
      ctx.requeueFetch(pool, {
        key: token.key,
        level,
        coords,
        role: "target",
        priority: 0,
        fetchScore: 0,
        fetchBand: 0,
      });
    }
    touched = true;
  }

  return touched;
}
