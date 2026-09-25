/**
 * Per-frame GPU upload budget for `drainUploads` (P19).
 *
 * Byte/brick caps alone were calibrated on dedicated GPUs where a
 * `texSubImage3D` costs ≪1 ms; on integrated GPUs (measured: Apple M2 via
 * ANGLE-Metal at ~17.5 ms per 256²-brick upload) a 12-brick batch stalls the
 * main thread for >200 ms per streaming frame. The WALL-CLOCK cap is therefore
 * the binding constraint on such machines (they self-limit to ~1 brick per
 * frame and stay smooth), while fast GPUs still fit their full byte/brick
 * batch inside it. Pure module so the predicate is unit-testable.
 */

export type DrainBudget = {
  maxBytes: number;
  maxBricks: number;
  maxMs: number;
};

export type DrainProgress = {
  bytes: number;
  bricks: number;
  elapsedMs: number;
};

export const FRAME_UPLOAD_BUDGET: DrainBudget = {
  maxBytes: 6 * 1024 * 1024,
  maxBricks: 12,
  // ≈ ¼ of a 60 Hz frame: leaves headroom for the render itself.
  maxMs: 4,
};

/**
 * Whether the drain loop may upload another brick. The FIRST brick of a drain
 * always proceeds — even when a single upload exceeds the time budget,
 * streaming must make progress every frame.
 */
export function shouldContinueDrain(
  progress: DrainProgress,
  budget: DrainBudget = FRAME_UPLOAD_BUDGET,
): boolean {
  if (progress.bricks === 0) return true;
  return (
    progress.bytes < budget.maxBytes &&
    progress.bricks < budget.maxBricks &&
    progress.elapsedMs < budget.maxMs
  );
}

/**
 * Strict leftover-budget predicate for STALE (out-of-plan) uploads: no
 * first-brick free pass — the free pass exists so visible data always makes
 * progress, and a stale brick must never be the one that causes the >maxMs
 * hitch it permits. Every budget dimension binds.
 */
export function shouldContinueStaleDrain(
  progress: DrainProgress,
  budget: DrainBudget = FRAME_UPLOAD_BUDGET,
): boolean {
  return (
    progress.bytes < budget.maxBytes &&
    progress.bricks < budget.maxBricks &&
    progress.elapsedMs < budget.maxMs
  );
}

/**
 * Whether a pool may dispatch ANOTHER brick fetch right now.
 *
 * The manager starts fetching before the canvas has a renderer (see
 * `BrickResidencyManager.attachRenderer`), and nothing drains until one
 * attaches — so pre-attach the upload queue only grows. The in-flight caps
 * already bound it indirectly; this makes the bound explicit and testable.
 *
 * It withholds NEW dispatches only. It never touches an in-flight decode:
 * cancelling shared in-progress decodes is the 13× refetch amplification
 * (OCTREE_RENDERER.md P8), and this predicate is deliberately incapable of it.
 */
export function shouldDispatchFetch(input: {
  /** True while no renderer is bound — i.e. nothing can drain the queue. */
  detached: boolean;
  /** Bricks already decoded and waiting for a drain. */
  queuedBricks: number;
  /** Ceiling to hold while detached. */
  cap: number;
}): boolean {
  if (!input.detached) return true;
  return input.queuedBricks < input.cap;
}

/** Stale entries kept queued per pool awaiting leftover budget; beyond this
 * the oldest are dropped (their decoded chunks stay cached, so a flip-back
 * refetches cheaply — holding many ~MB repacked payloads is the real cost). */
export const MAX_STALE_QUEUE = 24;

/**
 * How the drain behaves for the current interaction state. While the camera
 * moves, uploads are what collide with gesture frames: the first-brick free
 * pass admits single >15 ms `writeTexture`s and the stale pass spends
 * leftover budget on out-of-plan bricks — the interacting policy suspends
 * both and shrinks the budget to a trickle.
 *
 * GPU-repack dispatch stays ALLOWED while interacting. Blocking it starved
 * gpu-path pools outright during any continuous gesture (measured: 110
 * decoded bricks stuck in the upload queue, 565 planDrops as replans turned
 * the undrained queue over — nothing rendered sharp until the camera fully
 * stopped). The trickle budget bounds the cost instead: GPU bricks are
 * charged their REAL flush bytes (source-chunk cache misses,
 * `gpuFlushUploadBytes`), so at most ~one cold-chunk `writeBuffer` lands per
 * frame and cache-hit bricks flow nearly free.
 */
export type DrainPolicy = {
  budget: DrainBudget;
  allowFreePass: boolean;
  allowStale: boolean;
  allowGpuDispatch: boolean;
};

/** Interacting caps: a trickle that never causes a felt hitch. */
const INTERACTING_MAX_BYTES = 2 * 1024 * 1024;
const INTERACTING_MAX_BRICKS = 4;
const INTERACTING_MAX_MS = 1.5;

export function resolveDrainPolicy(
  tierBudget: DrainBudget,
  interacting: boolean,
): DrainPolicy {
  if (!interacting) {
    return { budget: tierBudget, allowFreePass: true, allowStale: true, allowGpuDispatch: true };
  }
  return {
    budget: {
      maxBytes: Math.min(tierBudget.maxBytes, INTERACTING_MAX_BYTES),
      maxBricks: Math.min(tierBudget.maxBricks, INTERACTING_MAX_BRICKS),
      maxMs: Math.min(tierBudget.maxMs, INTERACTING_MAX_MS),
    },
    allowFreePass: false,
    allowStale: false,
    allowGpuDispatch: true,
  };
}

/**
 * The REAL synchronous main-thread cost a GPU-repacked brick adds to the
 * frame: `flush()` must `writeBuffer` every source chunk not already resident
 * in the GPU chunk cache. On plane-chunked data a single chunk is ~14 MB —
 * far more than the atlas-slot bytes the CPU path pays — and the flush runs
 * with no wall-clock gate, so this is the number the drain budget has to
 * charge at dispatch time. Cached chunks cost nothing (the batch pins them).
 * A chunk referenced twice within one brick is charged once.
 */
export function gpuFlushUploadBytes(
  chunks: readonly { cacheKey: string; byteLength: number }[],
  isChunkCached: (cacheKey: string) => boolean,
): number {
  let bytes = 0;
  const seen = new Set<string>();
  for (const chunk of chunks) {
    if (seen.has(chunk.cacheKey)) continue;
    seen.add(chunk.cacheKey);
    if (!isChunkCached(chunk.cacheKey)) bytes += chunk.byteLength;
  }
  return bytes;
}

/**
 * Streaming render-cadence gate (gap 1a): whether a residency-driven wakeup
 * should RENDER a frame (`"invalidate"`) or merely keep the upload pipeline
 * pumping off-frame (`"pump"`).
 *
 * The demand frameloop used to free-run for the whole streaming burst — every
 * drained batch invalidated, and every resulting frame re-raymarched the
 * ENTIRE scene at full cost to display one batch of bricks (frame cost is
 * O(scene), not O(change)). But the invalidate was doing two jobs at once:
 * running the next drain (drainUploads lives in the provider's useFrame) and
 * showing progress. This gate splits them — uploads continue at full speed via
 * an off-frame pump timer; actual frames render at the residencyBumpMs
 * cadence the React residencyVersion bump already uses.
 *
 * Two unconditional bypasses, both load-bearing:
 *  - NOT streaming: the drained edge — the final settled-quality frame must
 *    always land immediately;
 *  - interacting: gesture frames flow regardless (camera invalidates), so the
 *    gate would only delay showing work the user is already paying frames for.
 */
export function resolveStreamFrameAction(input: {
  streaming: boolean;
  interacting: boolean;
  nowMs: number;
  lastInvalidateAtMs: number;
  cadenceMs: number;
}): "invalidate" | "pump" {
  if (!input.streaming || input.interacting) return "invalidate";
  if (input.nowMs - input.lastInvalidateAtMs >= input.cadenceMs) return "invalidate";
  return "pump";
}

/** Off-frame pump interval: ~a frame, so gated streaming drains as fast as
 * frame-driven streaming did — only the RENDERING is coalesced. */
export const DRAIN_PUMP_MS = 8;

export type QueueEntry = { key: string; uniformValue: number | null; level: number };

/**
 * Planned-first partition of an upload queue. Uniform (EMPTY) entries always
 * count as planned: they cost no slot and are valid fallback data regardless
 * of the current plan. FIFO order is preserved within each partition; stale
 * entries beyond `maxStale` (oldest first) are returned as `dropped`.
 *
 * `minUsefulLevel` drops out-of-plan entries the shader could never sample —
 * bricks FINER than every plan's target level, whose residency walk starts at
 * the desired level and moves coarser. Without it, the pool trim that reclaims
 * such slots would be undone on the very next drain: the freed headroom would
 * refill with the same unreachable bricks. Uniform entries are exempt (no slot
 * to compete for), as are protected ones (in some plan by definition).
 */
export function partitionUploadQueue<T extends QueueEntry>(
  queue: readonly T[],
  protectedKeys: { has(key: string): boolean },
  maxStale: number,
  minUsefulLevel = 0,
): { planned: T[]; stale: T[]; dropped: T[] } {
  const planned: T[] = [];
  const stale: T[] = [];
  const unreachable: T[] = [];
  for (const entry of queue) {
    if (entry.uniformValue !== null || protectedKeys.has(entry.key)) {
      planned.push(entry);
    } else if (entry.level < minUsefulLevel) {
      unreachable.push(entry);
    } else {
      stale.push(entry);
    }
  }
  const excess = Math.max(0, stale.length - Math.max(0, maxStale));
  return {
    planned,
    stale: stale.slice(excess),
    dropped: [...unreachable, ...stale.slice(0, excess)],
  };
}
