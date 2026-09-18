const DEFAULT_MAX_ZARR_WORKERS = 24
const DEFAULT_MIN_ZARR_WORKERS = 4
const DEFAULT_FALLBACK_ZARR_WORKERS = 8

export const ZARR_WORKER_POOL_SIZE = (() => {
  if (typeof navigator === 'undefined') {
    return DEFAULT_FALLBACK_ZARR_WORKERS
  }

  const concurrency = navigator.hardwareConcurrency ?? DEFAULT_FALLBACK_ZARR_WORKERS
  return Math.max(
    DEFAULT_MIN_ZARR_WORKERS,
    Math.min(DEFAULT_MAX_ZARR_WORKERS, concurrency),
  )
})()