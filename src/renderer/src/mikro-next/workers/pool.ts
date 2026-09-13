import WorkerPool from "@/lib/zarr/pool/workerpool";
import { createDefaultWorker } from "@/lib/zarr/runner/get-worker";
import { ZARR_WORKER_POOL_SIZE } from "./config";

// The pool owns its workers (spawns into empty slots on demand), and each
// worker overlaps a few fetches: a codec task is fetch → decode, and the
// fetch is pure socket wait, so exclusive checkout capped the app's HTTP
// concurrency at the worker count while residency asks for far more
// (`maxInflightBricks` × chunks per brick).
export const workerPool = new WorkerPool(ZARR_WORKER_POOL_SIZE, {
  factory: createDefaultWorker,
});
