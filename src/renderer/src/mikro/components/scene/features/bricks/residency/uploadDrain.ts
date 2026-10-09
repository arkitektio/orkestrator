import { coldOpenTimeline } from "../../../platform/perf/coldOpenTimeline";
import type { SceneRenderer } from "../../../platform/gpu/sceneRenderer";
import {
  MAX_STALE_QUEUE,
  gpuFlushUploadBytes,
  partitionUploadQueue,
  shouldContinueDrain,
  shouldContinueStaleDrain,
  type DrainPolicy,
  type DrainProgress,
} from "../../../platform/quality/uploadBudget";
import { writeBrickToAtlas } from "../gpu/brickAtlas";
import type { GpuRepacker } from "../gpu/computeRepack";
import { setPageEntry } from "../gpu/pageTableTexture";
import { encodeEmptyTexel, encodeOccupancyTexel } from "../octree/brickEncoding";
import type { ProtectedKeys } from "../octree/brickPoolState";
import { brickFetchBox, nodeVoxelBox, parseNodeKey } from "../octree/nodeAddress";
import {
  PAGE_FLAG_EMPTY,
  PAGE_FLAG_RESIDENT,
  PAGE_FLAG_UNMAPPED,
} from "../octree/pageTableLayout";
import type { RepackDispatcher } from "../octree/repackDispatcher";
import { needsHaloRefine } from "./twoPhase";
import {
  accumulateOccRange,
  occEncodeRangeOf,
  recordMeasuredRange,
  slabTexelsOf,
} from "./rangeEncoding";
import type {
  BrickSystemStats,
  GpuBrickToken,
  LayerBrickPool,
  PendingBrick,
} from "./residencyTypes";

/**
 * The upload half of the residency manager's per-frame drain, split out of
 * it: `drainEntry` maps one queued brick (EMPTY page entry, CPU atlas write,
 * or GPU repack dispatch), and the LANES run the planned-first two-pass drain
 * over every pool's partitioned queue. The manager's `drainUploads` keeps the
 * orchestration around it (policy, page-table flushes, encode passes, GPU
 * flush, streaming flag, drained edge).
 */

/** What `drainEntry` needs from the manager. */
export type DrainEntryDeps = {
  stats: BrickSystemStats;
  repack: RepackDispatcher;
  renderer: SceneRenderer;
  gpuRepacker: GpuRepacker<GpuBrickToken> | null | undefined;
};

export type DrainEntryProgress = { bytes: number; bricks: number; uploadedAny: boolean };

/** Frames a planned brick waits for a free slot before being dropped. A
 * replan or eviction can free slots any moment, so retrying from the queue
 * is far cheaper than the old drop-and-refetch (which redid the fetch/repack
 * every 200 ms for as long as the plan overshot capacity). The planner's
 * coarsest reservation makes overshoot rare; this makes it cheap. */
const MAX_ACQUIRE_RETRIES = 30;

/** `acquire()` sentinel treating every occupant as protected: the acquisition
 * succeeds only into a FREE slot, never by eviction — how out-of-plan bricks
 * are allowed to land without displacing planned ones. */
const FREE_SLOTS_ONLY: ProtectedKeys = { has: () => true };

/**
 * Upload/map one queued brick. `planned` decides eviction rights (planned
 * bricks may evict unprotected occupants; stale ones take FREE slots only)
 * and the failure counter; `progress` accumulates the frame budget.
 * Returns "defer" when a PLANNED brick found every slot protected and
 * should stay queued for the next drain (slots free up via replans and
 * evictions) — the caller keeps it in the queue instead of dropping it
 * into a refetch loop.
 */
export function drainEntry(
  deps: DrainEntryDeps,
  pool: LayerBrickPool,
  pending: PendingBrick,
  planned: boolean,
  progress: DrainEntryProgress,
): "done" | "defer" {
  if (pending.uniformValue !== null) {
    // A halo refine of a resident brick cannot come back uniform (the
    // payload was not), but never leave a slot behind an EMPTY entry.
    if (pool.pool.has(pending.key)) {
      pool.pool.release(pending.key);
      pool.coarsestResident.delete(pending.key);
      pool.brickRanges.delete(pending.key);
      pool.brickSlabRanges.delete(pending.key);
    }
    pool.provisionalKeys.delete(pending.key);
    // Encode the uniform value 8-bit-quantized in R (see brickTraversal).
    // Mapped even when the plan moved on: EMPTY costs no slot and is
    // valid fallback data.
    const texel = encodeEmptyTexel(pending.uniformValue, pool, pool.emptyBits);
    setPageEntry(pool.pageTable, pending.level, pending.coords, texel, PAGE_FLAG_EMPTY);
    pool.emptyValues.set(pending.key, pending.uniformValue);
    // Uniform values fold into the occupancy OBSERVED range too — Phase D
    // aggregates union them, and an out-of-range uniform would otherwise
    // clamp its aggregate to the "unbounded" sentinel (lost discrimination
    // on mostly-uniform volumes).
    accumulateOccRange(pool, pending.uniformValue, pending.uniformValue);
    recordMeasuredRange(
      pool,
      deps.stats,
      pending.key,
      pending.level,
      pending.coords,
      pending.uniformValue,
      pending.uniformValue,
    );
    deps.stats.emptyBricks += 1;
    progress.uploadedAny = true;
    return "done";
  }

  const acquired = pool.pool.acquire(
    pending.key,
    planned ? pool.protectedKeys : FREE_SLOTS_ONLY,
  );
  if (!acquired) {
    if (planned && (pending.acquireRetries ?? 0) < MAX_ACQUIRE_RETRIES) {
      pending.acquireRetries = (pending.acquireRetries ?? 0) + 1;
      return "defer";
    }
    if (planned) deps.stats.acquireFailures += 1;
    else deps.stats.planDrops += 1;
    // Dropped without upload: the repacked payload is dead — recycle it.
    if (pending.data) deps.repack.release(pending.data);
    return "done";
  }

  if (acquired.evictedKey) {
    const evicted = parseNodeKey(acquired.evictedKey);
    setPageEntry(pool.pageTable, evicted.level, evicted.coords, null, PAGE_FLAG_UNMAPPED);
    pool.provisionalKeys.delete(acquired.evictedKey);
    pool.coarsestResident.delete(acquired.evictedKey);
    pool.brickRanges.delete(acquired.evictedKey);
    pool.brickSlabRanges.delete(acquired.evictedKey);
    deps.stats.evictions += 1;
  }
  if (pending.level === pool.geometry.levels.length - 1) {
    pool.coarsestResident.add(pending.key);
  }

  // What this brick actually costs the frame. CPU path: the atlas-slot
  // payload the writeTexture below uploads. GPU path: `flush()` must
  // writeBuffer every source chunk not already in the GPU chunk cache
  // (a plane chunk can be ~14 MB — far more than the slot bytes), and the
  // flush itself has no wall-clock gate, so the budget has to charge those
  // bytes HERE, at dispatch time. That bounds the flush's synchronous work
  // to the frame budget: one cold plane-chunk brick fills the byte budget
  // for the frame, while cache-hit bricks stay nearly free.
  const frameCostBytes = pending.gpu
    ? gpuFlushUploadBytes(
        pending.gpu.chunks.map((chunk) => ({
          cacheKey: chunk.cacheKey,
          byteLength: chunk.data.byteLength,
        })),
        (cacheKey) => deps.gpuRepacker?.hasChunk(cacheKey) ?? false,
      )
    : pending.bytes;

  if (pending.gpu) {
    // Compute repack straight into the slot. The page entry goes
    // RESIDENT optimistically — content is correct either way; the
    // min/max readback demotes uniform bricks to EMPTY a few frames
    // later (applyGpuOutcome).
    deps.gpuRepacker!.dispatch({
      atlas: pool.atlas,
      input: {
        spec: pool.spec,
        level: pool.geometry.levels[pending.level],
        axes: pool.geometry.axes,
        // Always plain channel slabs here: a phasor layer never reaches
        // the GPU kernel (it cannot reduce — see fetchBrick).
        slabs: pool.geometry.slabs,
        phasorBins: pool.geometry.phasorBins,
        brickBox: nodeVoxelBox(pool.geometry, pool.spec, pending.level, pending.coords),
        // Core phase: the kernel's border replication is a clamp to the
        // fetch box, so the payload box alone yields the replicated rind.
        fetchBox: brickFetchBox(
          pool.geometry,
          pool.spec,
          pending.level,
          pending.coords,
          pending.phase,
        ),
        fixedOffsets: pool.fixedOffsets[pending.level],
        chunks: pending.gpu.chunks,
      },
      chunkKeys: pending.gpu.chunks.map((chunk) => chunk.cacheKey),
      slotCoords: acquired.slot.coords,
      token: {
        pool,
        flushEpoch: pool.flushEpoch,
        key: pending.key,
        slotIndex: acquired.slot.index,
      },
    });
    deps.stats.gpuBricks += 1;
  } else {
    if (!writeBrickToAtlas(deps.renderer, pool.atlas, acquired.slot.coords, pending.data!)) {
      // Nothing reached the slot (no backend texture — a device that is
      // going or not yet there). Mapping it RESIDENT would draw whatever
      // the slot last held: give the slot back and retry, bounded like an
      // acquire. Unmapped too: a halo refine re-acquires its core's slot,
      // so an entry may already point here.
      pool.pool.release(pending.key);
      setPageEntry(pool.pageTable, pending.level, pending.coords, null, PAGE_FLAG_UNMAPPED);
      pool.coarsestResident.delete(pending.key);
      pool.provisionalKeys.delete(pending.key);
      if ((pending.acquireRetries ?? 0) < MAX_ACQUIRE_RETRIES) {
        pending.acquireRetries = (pending.acquireRetries ?? 0) + 1;
        return "defer";
      }
      deps.stats.fetchErrors += 1;
      if (pending.data) deps.repack.release(pending.data);
      return "done";
    }
    // The atlas upload copied the payload out — nothing else reads it
    // (there is no CPU mirror; probes read the decoded-chunk cache).
    if (pending.data) deps.repack.release(pending.data);
  }
  // Occupancy sidecar: the brick's conservative min/max bracket (skip
  // predicate for the raymarcher). GPU-path bricks have no range yet —
  // the default texel means "unknown, never skip" until the readback
  // continuation writes the real one (applyGpuOutcome). While a range
  // promotion is in flight (occReencodePending) new texels stay "unknown"
  // too: the shader's decode uniforms may not yet hold the new encode
  // range, and the re-encode pass writes the real texel from brickRanges.
  if (pending.range) {
    pool.brickRanges.set(pending.key, pending.range);
    if (pending.slabRanges) pool.brickSlabRanges.set(pending.key, pending.slabRanges);
    accumulateOccRange(pool, pending.range[0], pending.range[1]);
    recordMeasuredRange(
      pool,
      deps.stats,
      pending.key,
      pending.level,
      pending.coords,
      pending.range[0],
      pending.range[1],
      pending.slabRanges,
    );
  }
  setPageEntry(
    pool.pageTable,
    pending.level,
    pending.coords,
    acquired.slot.coords,
    PAGE_FLAG_RESIDENT,
    pending.range && !pool.occReencodePending
      ? encodeOccupancyTexel(pending.range[0], pending.range[1], occEncodeRangeOf(pool))
      : undefined,
    pending.range && !pool.occReencodePending ? slabTexelsOf(pool, pending.slabRanges) : undefined,
  );
  progress.bytes += frameCostBytes;
  progress.bricks += 1;
  deps.stats.bricksUploaded += 1;
  coldOpenTimeline.stamp("firstBrickUploaded");
  // Two-phase bookkeeping: a core upload leaves the brick provisional and
  // queues its halo refine; a full upload (primary or refine) settles it.
  if (needsHaloRefine({ phase: pending.phase, uniform: false })) {
    pool.provisionalKeys.add(pending.key);
    pool.pendingHalo.push({
      key: pending.key,
      level: pending.level,
      coords: pending.coords,
      role: "target",
      priority: 0,
      fetchScore: 0,
      fetchBand: 2,
    });
  } else {
    if (pool.provisionalKeys.delete(pending.key)) deps.stats.haloRefines += 1;
    coldOpenTimeline.stamp("firstBrickFull");
  }
  deps.stats.bytesUploaded += pending.bytes;
  if (!planned) deps.stats.staleUploads += 1;
  progress.uploadedAny = true;
  return "done";
}

/**
 * One pool's share of a drain: its queue partitioned into planned + stale,
 * and how many of each the passes consumed. Consumed entries are counted,
 * never `shift()`ed — a shift per brick was quadratic on a long backlog.
 * Lane objects are reused across drains (the manager keeps the array), so a
 * streaming frame allocates only the partition arrays themselves.
 */
export type DrainLane = {
  pool: LayerBrickPool | null;
  planned: PendingBrick[];
  stale: PendingBrick[];
  plannedTaken: number;
  staleTaken: number;
};

const NO_BRICKS: PendingBrick[] = [];

/**
 * The queue a pool keeps after a drain: the planned remainder, then the stale
 * remainder — the order the next drain's partition reads. Reuses `planned`
 * as the result (one splice, then appends), so it must be a fresh partition
 * array, never the live queue. Pure, exported for the vitest matrix.
 */
export function remainingUploadQueue<T>(
  planned: T[],
  plannedTaken: number,
  stale: readonly T[],
  staleTaken: number,
): T[] {
  if (plannedTaken > 0) planned.splice(0, plannedTaken);
  for (let i = staleTaken; i < stale.length; i++) planned.push(stale[i]);
  return planned;
}

/**
 * Partition every non-empty pool queue into `lanes[0..count)`, in pool
 * iteration order; returns `count`. Entries the partition drops (out of
 * plan and unreachable, or past the stale cap) leave the queue here — never
 * uploaded, so their repacked payload is recycled.
 *
 * The partition re-evaluates protectedKeys each drain, so a stale entry
 * whose plan flips back is automatically promoted to planned.
 */
export function partitionDrainLanes(
  pools: Iterable<LayerBrickPool>,
  lanes: DrainLane[],
  deps: Pick<DrainEntryDeps, "stats" | "repack">,
): number {
  let count = 0;
  for (const pool of pools) {
    if (pool.queue.length === 0) continue; // no per-frame partition alloc for idle pools
    const { planned, stale, dropped } = partitionUploadQueue(
      pool.queue,
      pool.protectedKeys,
      MAX_STALE_QUEUE,
      pool.minTargetLevel,
    );
    for (const entry of dropped) {
      pool.queuedKeys.delete(entry.key);
      deps.stats.planDrops += 1;
      // Never uploaded: the repacked payload is dead — recycle it.
      if (entry.data) deps.repack.release(entry.data);
    }
    let lane = lanes[count];
    if (!lane) {
      lane = { pool: null, planned: NO_BRICKS, stale: NO_BRICKS, plannedTaken: 0, staleTaken: 0 };
      lanes.push(lane);
    }
    lane.pool = pool;
    lane.planned = planned;
    lane.stale = stale;
    lane.plannedTaken = 0;
    lane.staleTaken = 0;
    count += 1;
  }
  return count;
}

/**
 * Planned-first two-pass drain, ordered GLOBALLY across pools: visible
 * (planned) bricks from every pool spend the budget first — with the
 * first-brick free pass so streaming always makes progress (P19: on
 * integrated GPUs a single texSubImage3D can cost >15 ms; the ms cap is
 * tier-scaled). Stale (out-of-plan) bricks upload only on genuinely
 * leftover budget, into FREE slots, and never under the free pass — a
 * stale brick must never be the one causing the >maxMs hitch it permits.
 */
export function runDrainLanes(
  deps: DrainEntryDeps,
  lanes: readonly DrainLane[],
  count: number,
  policy: DrainPolicy,
  progress: DrainEntryProgress,
  progressOf: () => DrainProgress,
): void {
  const budget = policy.budget;
  // The free pass exists so streaming always progresses; while interacting
  // it is exactly the >maxMs hitch we are avoiding, so the strict predicate
  // applies to planned bricks too.
  const continuePlanned = policy.allowFreePass
    ? shouldContinueDrain
    : shouldContinueStaleDrain;
  for (let i = 0; i < count; i++) {
    const lane = lanes[i];
    const pool = lane.pool!;
    const planned = lane.planned;
    while (lane.plannedTaken < planned.length && continuePlanned(progressOf(), budget)) {
      const pending = planned[lane.plannedTaken];
      // A GPU-path brick commits flush() to its source-chunk writeBuffers
      // this frame — deferred while interacting (stays queued; the decoded
      // chunks stay cached, so it lands at cache-hit cost on settle).
      if (pending.gpu && !policy.allowGpuDispatch) break;
      const outcome = drainEntry(
        deps,
        pool,
        pending,
        pool.protectedKeys.has(pending.key),
        progress,
      );
      if (outcome === "defer") break; // no free slot this frame; retry next drain
      lane.plannedTaken += 1;
      pool.queuedKeys.delete(pending.key);
    }
  }
  if (policy.allowStale) {
    for (let i = 0; i < count; i++) {
      const lane = lanes[i];
      const pool = lane.pool!;
      const stale = lane.stale;
      while (lane.staleTaken < stale.length && shouldContinueStaleDrain(progressOf(), budget)) {
        const pending = stale[lane.staleTaken];
        lane.staleTaken += 1;
        pool.queuedKeys.delete(pending.key);
        drainEntry(deps, pool, pending, false, progress);
      }
    }
  }
}

/** The lane holding `pool` this drain, or null (its queue was empty). Linear:
 * pools are few, and it keeps the drain free of a per-frame Map. */
export function laneOf(
  lanes: readonly DrainLane[],
  count: number,
  pool: LayerBrickPool,
): DrainLane | null {
  for (let i = 0; i < count; i++) {
    if (lanes[i].pool === pool) return lanes[i];
  }
  return null;
}

/** Write a lane's undrained remainder back to its pool, and let go of the
 * lane's references until the next drain reuses it. */
export function writeBackLane(lane: DrainLane): void {
  lane.pool!.queue = remainingUploadQueue(
    lane.planned,
    lane.plannedTaken,
    lane.stale,
    lane.staleTaken,
  );
  clearLane(lane);
}

/** Drop every lane reference still held after a drain's write-backs. */
export function releaseDrainLanes(lanes: readonly DrainLane[], count: number): void {
  for (let i = 0; i < count; i++) {
    if (lanes[i].pool !== null) clearLane(lanes[i]);
  }
}

function clearLane(lane: DrainLane): void {
  lane.pool = null;
  lane.planned = NO_BRICKS;
  lane.stale = NO_BRICKS;
}
