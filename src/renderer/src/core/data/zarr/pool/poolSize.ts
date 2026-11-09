/**
 * How many zarr codec workers the shared pool may spawn.
 *
 * A worker overlaps several fetches (`maxInFlightPerWorker`), so HTTP
 * concurrency does not need one thread per request; what the count buys is
 * DECODE parallelism. It used to be every core up to 24, which leaves none
 * for the main thread, the GPU process and the repack and mesh workers that
 * run during the same streaming burst — and every worker keeps a wasm heap
 * sized for the largest chunk it ever decompressed, which never shrinks.
 */
const DEFAULT_MAX_ZARR_WORKERS = 12
const DEFAULT_MIN_ZARR_WORKERS = 4
const DEFAULT_FALLBACK_ZARR_WORKERS = 8
/** Cores left for everything that is not a codec worker. */
const RESERVED_CORES = 2

export function zarrWorkerPoolSize(hardwareConcurrency: number | undefined): number {
  const concurrency = hardwareConcurrency ?? DEFAULT_FALLBACK_ZARR_WORKERS
  return Math.max(
    DEFAULT_MIN_ZARR_WORKERS,
    Math.min(DEFAULT_MAX_ZARR_WORKERS, concurrency - RESERVED_CORES),
  )
}

export const ZARR_WORKER_POOL_SIZE =
  typeof navigator === 'undefined'
    ? DEFAULT_FALLBACK_ZARR_WORKERS
    : zarrWorkerPoolSize(navigator.hardwareConcurrency)
