import { atlasBytesPerVoxel, R16F_DATA_SCALE, type AtlasKind } from "./atlasFormat";
import { encodeHalfArray } from "./halfFloat";
import { repackBrick, type BrickArray, type RepackBrickInput, type RepackResult } from "./brickRepack";
import { interleaveSlabsRgba8, rgba8OutputBytes } from "./rgbaPack";
import type { RepackWorkerRequest, RepackWorkerResponse } from "./repack-worker";

/**
 * Dispatcher for brick repack: routes `repackBrick` jobs to a small Web Worker
 * pool so the dominant per-brick CPU cost (strided copy + edge replication +
 * min/max over a whole stored brick) stays off the UI thread during
 * panning-triggered streaming.
 *
 * Two implementations behind one interface:
 * - worker-backed (production) — chunks travel zero-copy when SAB-backed, the
 *   output brick returns as a transferable;
 * - synchronous — used when `Worker` is unavailable (vitest/jsdom) and as a
 *   construction-failure safety net; behaviorally identical because both call
 *   the same pure, golden-buffer-tested `repackBrick`.
 *
 * Scheduling: a job goes to an IDLE worker, else the least-loaded one under
 * `MAX_IN_FLIGHT_PER_WORKER`, else it waits in a FIFO here. Round-robin used
 * to post to the next worker regardless of load, so a brick could queue in a
 * busy worker's mailbox while a sibling sat idle (head-of-line blocking: the
 * measured 80 ms wall vs ~13 ms exec). Jobs in flight on a worker cannot be
 * recalled — jobs are a few ms and out-of-plan results are landed into free
 * slots (or counted as `planDrops`) by `drainUploads` — but a job still in
 * this dispatcher's queue is dropped, not posted, if its `signal` aborts.
 */

export type RepackJob = {
  kind: AtlasKind;
  /** storedX·storedY·storedZ·channelCount — the output brick's length. */
  elementCount: number;
  input: Omit<RepackBrickInput, "output">;
  /** Optional: abort while the job is still queued here drops it (rejects
   * with an AbortError) instead of posting it to a worker. Once posted the
   * worker runs it regardless, exactly as before. */
  signal?: AbortSignal;
};

export type RepackOutcome = RepackResult & { data: BrickArray };

/** Bytes of one finished output brick — what the worker allocates and the
 * free list is keyed by. rgba8 collapses the planar element count. */
export const repackOutputBytes = (job: Pick<RepackJob, "kind" | "elementCount" | "input">): number =>
  job.kind === "rgba8"
    ? rgba8OutputBytes(job.elementCount, job.input.spec.channelCount)
    : job.elementCount * atlasBytesPerVoxel(job.kind);

export interface RepackDispatcher {
  repack(job: RepackJob): Promise<RepackOutcome>;
  /**
   * Hand a finished output brick back for reuse. Call ONLY when the buffer is
   * provably dead (uploaded + mirrored, or dropped without upload) — a
   * released buffer is transferred to a worker and detached, so a live
   * reference elsewhere would read a zero-length array. Best-effort: unmatched
   * or overflowing buffers just fall to GC, exactly as before.
   */
  release(data: BrickArray): void;
  /**
   * Spawn the worker pool now rather than on the first brick.
   *
   * Workers are otherwise lazy, so the FIRST brick of a cold scene pays
   * `new Worker` + module evaluation on top of its own decode — right at the
   * moment the user is waiting for the first voxels. Optional: the sync
   * dispatcher has no workers to warm.
   */
  prewarm?(): void;
  dispose(): void;
}

/** Same math, same thread — for tests and as a fallback. */
export function createSyncRepackDispatcher(): RepackDispatcher {
  return {
    repack: (job) => {
      if (job.kind === "r16f") {
        // Raw repack into a float scratch (min/max and the uniform test must
        // see RAW values), then half-float-encode into the output — the same
        // two-step the worker path runs (repack-worker.ts, keep in lockstep).
        const scratch = new Float32Array(job.elementCount);
        const result = repackBrick({ ...job.input, output: scratch });
        const output = new Uint16Array(job.elementCount);
        encodeHalfArray(scratch, output, 1 / R16F_DATA_SCALE);
        return Promise.resolve({ ...result, data: output });
      }
      if (job.kind === "rgba8") {
        // Planar repack, then interleave — the worker's two-step (keep in lockstep).
        const scratch = new Uint8Array(job.elementCount);
        const result = repackBrick({ ...job.input, output: scratch });
        const output = new Uint8Array(repackOutputBytes(job));
        interleaveSlabsRgba8(
          scratch,
          job.elementCount / job.input.spec.channelCount,
          job.input.spec.channelCount,
          output,
        );
        return Promise.resolve({ ...result, data: output });
      }
      const output: BrickArray =
        job.kind === "r8"
          ? new Uint8Array(job.elementCount)
          : new Float32Array(job.elementCount);
      const result = repackBrick({ ...job.input, output });
      return Promise.resolve({ ...result, data: output });
    },
    release: () => {}, // same-thread outputs just fall to GC
    dispose: () => {},
  };
}

/** Free-list bound: at 12 in-flight bricks (~1.1 MB each for a 66³ r32f
 * brick) this caps retained memory at ~26 MB across every active size class
 * while still covering the steady-state streaming pipeline. */
export const MAX_FREE_BUFFERS = 24;

/**
 * Size-classed ArrayBuffer free list for repack outputs. The worker path used
 * to allocate a fresh ~1.1 MB output per brick, transfer it out and drop it
 * after the atlas upload — sustained multi-MB/frame garbage while streaming.
 * Buffers are keyed by exact byteLength (pool specs differ per pool) and
 * handed back to the worker via the request's `recycled` transfer.
 * Pure and exported for unit tests.
 */
export function createBufferFreeList(maxBuffers: number = MAX_FREE_BUFFERS) {
  const bySize = new Map<number, ArrayBuffer[]>();
  let count = 0;
  return {
    size: () => count,
    put(buffer: ArrayBuffer): void {
      if (buffer.byteLength === 0 || count >= maxBuffers) return; // detached or full
      const bucket = bySize.get(buffer.byteLength);
      if (bucket) bucket.push(buffer);
      else bySize.set(buffer.byteLength, [buffer]);
      count += 1;
    },
    take(byteLength: number): ArrayBuffer | undefined {
      const bucket = bySize.get(byteLength);
      const buffer = bucket?.pop();
      if (buffer !== undefined) count -= 1;
      return buffer;
    },
    clear(): void {
      bySize.clear();
      count = 0;
    },
  };
}

/** Repack workers per dispatcher — repack is memory-bandwidth-bound, so a
 * small pool suffices; but the fetch pipeline (12 in-flight bricks) queues
 * here, and an undersized pool inflates per-brick WALL time (measured 80 ms
 * wall vs ~13 ms exec on an M2 with 2 workers). Scale mildly with cores. */
export const REPACK_WORKER_COUNT = Math.min(
  4,
  Math.max(
    2,
    Math.floor(
      ((typeof navigator !== "undefined" ? navigator.hardwareConcurrency : undefined) ?? 4) / 2,
    ) - 1,
  ),
);

/**
 * Jobs a worker may hold at once. Two, not one: a repack is a few ms, and
 * with exactly one in flight the worker idles for a main-thread hop (the
 * completion message, then the next post — behind whatever frame work the UI
 * thread is doing) between every brick. A second job queued at the worker
 * covers that gap; a third would just reintroduce head-of-line blocking. The
 * fetch pipeline keeps up to 12 bricks in flight, so the dispatcher's own
 * queue still absorbs the rest and hands each out to the first worker that
 * comes under the cap.
 */
export const MAX_IN_FLIGHT_PER_WORKER = 2;

type Pending = {
  resolve: (outcome: RepackOutcome) => void;
  reject: (error: Error) => void;
  kind: AtlasKind;
  slot: WorkerSlot;
};

type WorkerSlot = { worker: Worker; inFlight: number };

type Queued = {
  id: number;
  job: RepackJob;
  resolve: (outcome: RepackOutcome) => void;
  reject: (error: Error) => void;
  /** Detaches the abort listener; set when the job carries a signal. */
  unlisten: (() => void) | null;
};

const abortError = (): Error => {
  if (typeof DOMException !== "undefined") return new DOMException("Aborted", "AbortError");
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
};

export type WorkerRepackDispatcherOptions = {
  /** Worker factory — production spawns the bundled `repack-worker`; tests
   * inject fakes. Must throw when workers are unavailable. */
  spawn?: () => Worker;
  workerCount?: number;
  maxInFlightPerWorker?: number;
};

const spawnRepackWorker = (): Worker =>
  // Single-expression `new Worker(new URL(...))` so the bundler detects
  // and bundles the worker entry (same pattern as the zarr codec worker).
  new Worker(new URL("./repack-worker.js", import.meta.url), { type: "module" });

/** Exported for the fake-worker scheduling tests; production goes through
 * `createRepackDispatcher`. */
export function createWorkerRepackDispatcher(
  options: WorkerRepackDispatcherOptions = {},
): RepackDispatcher {
  const spawn = options.spawn ?? spawnRepackWorker;
  const workerCount = Math.max(1, options.workerCount ?? REPACK_WORKER_COUNT);
  const maxInFlight = Math.max(1, options.maxInFlightPerWorker ?? MAX_IN_FLIGHT_PER_WORKER);

  // Lazy: no worker exists until the first brick repacks.
  const slots: WorkerSlot[] = [];
  const pending = new Map<number, Pending>();
  const queue: Queued[] = [];
  const freeList = createBufferFreeList();
  let nextId = 1;
  let disposed = false;
  /** Set once `spawn` throws: no further attempts, the live pool (if any)
   * carries on, and with no pool at all jobs run inline. */
  let spawnBroken = false;

  const settle = (id: number): Pending | undefined => {
    const entry = pending.get(id);
    if (!entry) return undefined;
    pending.delete(id);
    entry.slot.inFlight -= 1;
    return entry;
  };

  const handleMessage = (event: MessageEvent<RepackWorkerResponse>) => {
    const response = event.data;
    const entry = settle(response.id);
    if (!entry) return;
    if ("error" in response) {
      entry.reject(new Error(response.error));
    } else {
      const data: BrickArray =
        entry.kind === "r8" || entry.kind === "rgba8"
          ? new Uint8Array(response.buffer)
          : entry.kind === "r16f"
            ? new Uint16Array(response.buffer)
            : new Float32Array(response.buffer);
      entry.resolve({
        min: response.min,
        max: response.max,
        uniformValue: response.uniformValue,
        slabRanges: response.slabMin.map((lo, s) => [lo, response.slabMax[s]] as const),
        data,
      });
    }
    pump();
  };

  const failAllInFlight = (error: Error) => {
    for (const [id, entry] of [...pending]) {
      pending.delete(id);
      entry.reject(error);
    }
    for (const slot of slots) slot.inFlight = 0;
  };

  const trySpawn = (): WorkerSlot | null => {
    if (spawnBroken || slots.length >= workerCount) return null;
    try {
      const worker = spawn();
      worker.onmessage = handleMessage;
      worker.onerror = (event) => {
        // A worker-level error fails every job in flight on this dispatcher —
        // simplest correct behavior; callers count it as a fetch error and the
        // brick is re-planned like any other failed fetch. Queued jobs are
        // untouched and go out on the next pump.
        failAllInFlight(new Error(`repack worker error: ${event.message}`));
        pump();
      };
      const slot = { worker, inFlight: 0 };
      slots.push(slot);
      return slot;
    } catch {
      spawnBroken = true;
      return null;
    }
  };

  /** An idle worker, else a fresh one while the pool is under size, else the
   * least-loaded one under the cap, else null (queue). */
  const pickSlot = (): WorkerSlot | null => {
    let best: WorkerSlot | null = null;
    for (const slot of slots) {
      if (slot.inFlight === 0) return slot;
      if (slot.inFlight < maxInFlight && (best === null || slot.inFlight < best.inFlight)) best = slot;
    }
    return trySpawn() ?? best;
  };

  const post = (slot: WorkerSlot, queued: Queued) => {
    const { id, job } = queued;
    pending.set(id, { resolve: queued.resolve, reject: queued.reject, kind: job.kind, slot });
    slot.inFlight += 1;
    // The free-list buffer is taken at POST time, not enqueue time, so a
    // queued job never pins one.
    const recycled = freeList.take(repackOutputBytes(job));
    const request: RepackWorkerRequest = {
      id,
      kind: job.kind,
      elementCount: job.elementCount,
      input: job.input,
      recycled,
    };
    // Only `recycled` transfers; SAB-backed chunks stay shared and the
    // rare non-SAB chunk structured-clones, exactly as before.
    slot.worker.postMessage(request, recycled ? [recycled] : []);
  };

  const pump = () => {
    if (disposed) return;
    while (queue.length > 0) {
      const slot = pickSlot();
      if (!slot) return;
      const queued = queue.shift()!;
      queued.unlisten?.();
      post(slot, queued);
    }
  };

  return {
    prewarm: () => {
      if (disposed) return;
      // Idempotent: trySpawn only creates while the pool is under size, and
      // gives up for good once construction fails.
      while (trySpawn()) {
        /* fill the pool */
      }
    },
    repack: (job) => {
      if (disposed) return Promise.reject(new Error("repack dispatcher disposed"));
      if (job.signal?.aborted) return Promise.reject(abortError());
      if (slots.length === 0 && !trySpawn()) {
        // Worker construction failed (the constructor is lazy, so this is
        // where a missing/blocked Worker surfaces) — run the same pure repack
        // inline.
        return createSyncRepackDispatcher().repack(job);
      }
      const id = nextId++;
      return new Promise<RepackOutcome>((resolve, reject) => {
        const queued: Queued = { id, job, resolve, reject, unlisten: null };
        const slot = queue.length === 0 ? pickSlot() : null;
        if (slot) {
          post(slot, queued);
          return;
        }
        if (job.signal) {
          const signal = job.signal;
          const onAbort = () => {
            const index = queue.indexOf(queued);
            if (index === -1) return; // already posted
            queue.splice(index, 1);
            queued.unlisten?.();
            reject(abortError());
          };
          signal.addEventListener("abort", onAbort, { once: true });
          queued.unlisten = () => signal.removeEventListener("abort", onAbort);
        }
        queue.push(queued);
      });
    },
    release: (data) => {
      if (disposed) return;
      freeList.put(data.buffer as ArrayBuffer);
    },
    dispose: () => {
      disposed = true;
      const error = new Error("repack dispatcher disposed");
      failAllInFlight(error);
      for (const queued of queue.splice(0)) {
        queued.unlisten?.();
        queued.reject(error);
      }
      for (const slot of slots) slot.worker.terminate();
      slots.length = 0;
      freeList.clear();
    },
  };
}

/** Worker-backed when possible, synchronous otherwise. */
export function createRepackDispatcher(): RepackDispatcher {
  if (typeof Worker === "undefined") return createSyncRepackDispatcher();
  try {
    return createWorkerRepackDispatcher();
  } catch {
    return createSyncRepackDispatcher();
  }
}
