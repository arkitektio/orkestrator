import type { MeshoptDecoderLike } from "./fabriksDecode";
import {
  decodeRowGroupSpan,
  type FabriksDecodeRequest,
  type FabriksDecodedCell,
} from "./fabriksDecodeCore";
import type {
  FabriksDecodeWorkerRequest,
  FabriksDecodeWorkerResponse,
} from "./fabriksDecode-worker";

/**
 * Dispatcher for fabriks geometry decode: routes `decodeRowGroupSpan` jobs to
 * a small Web Worker pool so the dominant streaming CPU cost — hyparquet
 * parse, meshopt decode, per-vertex dequantize — stays off the UI thread
 * while row groups arrive (`CONCURRENT_FETCHES` of them interleaved).
 *
 * Two implementations behind one interface (the `repackDispatcher` pattern):
 * - worker-backed (production) — the span structured-clones IN (it is owned
 *   by the S3ParquetStore byte cache and must never be transferred/detached);
 *   the decoded typed arrays transfer OUT zero-copy;
 * - synchronous — used when `Worker` is unavailable (vitest/node) and as a
 *   construction-failure safety net; behaviorally identical because both call
 *   the same pure, fixture-tested `decodeRowGroupSpan`.
 *
 * This is fabriks's OWN pool, not the shared zarr `WorkerPool`: pool slots are
 * untyped and a recycled zarr codec worker cannot answer fabriks messages
 * (README, "Known gaps").
 *
 * Scheduling: a job goes to an IDLE worker, else it waits in a FIFO here until
 * one frees up (`MAX_IN_FLIGHT_PER_WORKER` is 1 — see there). Round-robin used
 * to post to the next worker regardless of load, so a small row group could
 * sit in a busy worker's mailbox behind a large one while the other worker
 * idled. A job in flight on a worker cannot be recalled — a stale result is
 * discarded by the manager's generation check, exactly like a stale fetch —
 * but a job still queued here is dropped, not posted, if its `signal` aborts.
 *
 * `loadDecoder` travels PER CALL, not per dispatcher: the worker path ignores
 * it (each worker initializes its own meshopt WASM), and the sync path uses
 * the caller's — so the module-level shared dispatcher never bakes in one
 * manager's decoder loader.
 */

export type FabriksDecodeOptions = {
  /** Optional: abort while the job is still queued here drops it (rejects
   * with an AbortError) instead of posting it to a worker. Once posted the
   * worker runs it regardless, exactly as before. */
  signal?: AbortSignal;
};

export type FabriksDecodeDispatcher = {
  decode(
    request: FabriksDecodeRequest,
    loadDecoder: () => Promise<MeshoptDecoderLike | null>,
    options?: FabriksDecodeOptions,
  ): Promise<FabriksDecodedCell[]>;
  dispose(): void;
};

/** Same decode, same thread — for tests and as a fallback. */
export function createSyncFabriksDecodeDispatcher(): FabriksDecodeDispatcher {
  return {
    decode: async (request, loadDecoder) => {
      const decoder = request.encoding.codec === "MESHOPT" ? await loadDecoder() : null;
      return decodeRowGroupSpan(request, decoder);
    },
    dispose: () => {},
  };
}

/** Decode workers per dispatcher. Two suffice: decode is CPU-bound and the
 * fetch pipeline (CONCURRENT_FETCHES = 4) hides latency ahead of it, so the
 * pool needs to keep up with arrival, not multiply it. */
export const FABRIKS_DECODE_WORKER_COUNT = 2;

/**
 * Jobs a worker may hold at once. ONE: a row-group decode is heavy (hyparquet
 * parse + meshopt + dequantize, tens of ms for a dense group) and sizes vary
 * widely, so a second job queued at the worker is exactly the head-of-line
 * blocking being removed. The main-thread hop between a completion and the
 * next post is small against a job that size, and the fetch pipeline
 * (CONCURRENT_FETCHES = 4 against 2 workers) keeps the dispatcher queue fed.
 */
export const MAX_IN_FLIGHT_PER_WORKER = 1;

type WorkerSlot = { worker: Worker; inFlight: number };

type Pending = {
  resolve: (cells: FabriksDecodedCell[]) => void;
  reject: (error: Error) => void;
  slot: WorkerSlot;
};

type Queued = {
  id: number;
  request: FabriksDecodeRequest;
  resolve: (cells: FabriksDecodedCell[]) => void;
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

export type WorkerFabriksDecodeDispatcherOptions = {
  /** Worker factory — production spawns the bundled `fabriksDecode-worker`;
   * tests inject fakes. Must throw when workers are unavailable. */
  spawn?: () => Worker;
  workerCount?: number;
  maxInFlightPerWorker?: number;
};

const spawnFabriksDecodeWorker = (): Worker =>
  // Single-expression `new Worker(new URL(...))` so the bundler detects
  // and bundles the worker entry (same pattern as the repack worker).
  new Worker(new URL("./fabriksDecode-worker.js", import.meta.url), { type: "module" });

/** Exported for the fake-worker scheduling tests; production goes through
 * `createFabriksDecodeDispatcher`. */
export function createWorkerFabriksDecodeDispatcher(
  options: WorkerFabriksDecodeDispatcherOptions = {},
): FabriksDecodeDispatcher {
  const spawn = options.spawn ?? spawnFabriksDecodeWorker;
  const workerCount = Math.max(1, options.workerCount ?? FABRIKS_DECODE_WORKER_COUNT);
  const maxInFlight = Math.max(1, options.maxInFlightPerWorker ?? MAX_IN_FLIGHT_PER_WORKER);

  // Lazy: no worker exists until the first row group decodes.
  const slots: WorkerSlot[] = [];
  const pending = new Map<number, Pending>();
  const queue: Queued[] = [];
  let nextId = 1;
  let disposed = false;
  /** Set once `spawn` throws: no further attempts, the live pool (if any)
   * carries on, and with no pool at all jobs decode inline. */
  let spawnBroken = false;

  const handleMessage = (event: MessageEvent<FabriksDecodeWorkerResponse>) => {
    const response = event.data;
    const entry = pending.get(response.id);
    if (!entry) return;
    pending.delete(response.id);
    entry.slot.inFlight -= 1;
    if ("error" in response) entry.reject(new Error(response.error));
    else entry.resolve(response.cells);
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
        // A worker-level error fails every job in flight — simplest correct
        // behavior; the manager counts each as a fetch error and the drain's
        // retry round (or the next replan) re-requests the group. Queued jobs
        // are untouched and go out on the next pump.
        failAllInFlight(new Error(`fabriks decode worker error: ${event.message}`));
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
    pending.set(queued.id, { resolve: queued.resolve, reject: queued.reject, slot });
    slot.inFlight += 1;
    const message: FabriksDecodeWorkerRequest = { id: queued.id, request: queued.request };
    // NO transfer list: `request.spanBytes` belongs to the FabriksStore
    // byte cache — transferring it would detach the cached bytes under
    // every other reader. The clone is the price of the shared cache.
    slot.worker.postMessage(message);
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
    decode: (request, loadDecoder, options) => {
      if (disposed) return Promise.reject(new Error("fabriks decode dispatcher disposed"));
      if (options?.signal?.aborted) return Promise.reject(abortError());
      if (slots.length === 0 && !trySpawn()) {
        // Worker construction failed (the constructor is lazy, so this is
        // where a missing/blocked Worker surfaces) — decode inline instead.
        return createSyncFabriksDecodeDispatcher().decode(request, loadDecoder);
      }
      const id = nextId++;
      return new Promise<FabriksDecodedCell[]>((resolve, reject) => {
        const queued: Queued = { id, request, resolve, reject, unlisten: null };
        const slot = queue.length === 0 ? pickSlot() : null;
        if (slot) {
          post(slot, queued);
          return;
        }
        const signal = options?.signal;
        if (signal) {
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
    dispose: () => {
      disposed = true;
      const error = new Error("fabriks decode dispatcher disposed");
      failAllInFlight(error);
      for (const queued of queue.splice(0)) {
        queued.unlisten?.();
        queued.reject(error);
      }
      for (const slot of slots) slot.worker.terminate();
      slots.length = 0;
    },
  };
}

/** Worker-backed when possible, synchronous otherwise. */
export function createFabriksDecodeDispatcher(): FabriksDecodeDispatcher {
  if (typeof Worker === "undefined") return createSyncFabriksDecodeDispatcher();
  try {
    return createWorkerFabriksDecodeDispatcher();
  } catch {
    return createSyncFabriksDecodeDispatcher();
  }
}

/** One pool for every mesh layer (the `workers/pool.ts` idiom): decode work
 * is fungible across collections, and per-manager pools would multiply WASM
 * instances and idle workers per layer. Never disposed — it lives as long as
 * the renderer. */
let shared: FabriksDecodeDispatcher | null = null;
export function sharedFabriksDecodeDispatcher(): FabriksDecodeDispatcher {
  if (!shared) shared = createFabriksDecodeDispatcher();
  return shared;
}
