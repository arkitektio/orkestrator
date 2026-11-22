import WorkerPool from "@/core/data/zarr/pool/workerpool";
import { ZARR_IDLE_RELEASE_MS } from "@/core/data/zarr/caches/idleRelease";
import { createDefaultWorker } from "@/core/data/zarr/runner/get-worker";
import { disposeWorker } from "@/core/data/zarr/runner/worker-rpc";
import { ZARR_WORKER_POOL_SIZE } from "./poolSize";

// The pool owns its workers (spawns into empty slots on demand), and each
// worker overlaps a few fetches: a codec task is fetch → decode, and the
// fetch is pure socket wait, so exclusive checkout capped the app's HTTP
// concurrency at the worker count while residency asks for far more
// (`maxInflightBricks` × chunks per brick).
//
// 8 per worker (the pool's default is 4): with 6 workers that default allowed
// 24 requests, and a scene of four single-channel chunks per brick at 16
// bricks in flight wants 64 — a recording showed 24 of 24 in flight and the
// average brick waiting 545 ms. Requests are socket wait and the server is
// HTTP/2, so the cost of the extra ones is queued decodes on the same
// threads, not more threads.
export const ZARR_REQUESTS_PER_WORKER = 8;

export const workerPool = new WorkerPool(ZARR_WORKER_POOL_SIZE, {
  factory: createDefaultWorker,
  maxInFlightPerWorker: ZARR_REQUESTS_PER_WORKER,
  // Stopped after a quiet minute: the pool outlives every scene and chart,
  // and a worker's wasm heap never shrinks. `disposeWorker` also drops the
  // RPC dispatcher (its listeners and the metas it sent that worker).
  idleReleaseMs: ZARR_IDLE_RELEASE_MS,
  dispose: (worker) => disposeWorker(worker),
});
