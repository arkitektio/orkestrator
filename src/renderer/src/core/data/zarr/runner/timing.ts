/**
 * Per-chunk timing logs are opt-in: they fire per chunk and are a measurable
 * cost when hundreds of chunks stream in. Enable at runtime (main thread) with
 * `globalThis.__ZARR_TIMING__ = true`.
 *
 * Call sites MUST guard with this before building the timing record, so that
 * nothing (object literals, `roundTiming` calls, array spreads) is allocated
 * on the hot path when logging is off. The flag also rides each worker
 * request (`timing: true`) so the codec worker only consults Resource Timing
 * entries when someone is actually looking.
 */
export function zarrTimingEnabled(): boolean {
  return (globalThis as { __ZARR_TIMING__?: boolean }).__ZARR_TIMING__ === true
}
