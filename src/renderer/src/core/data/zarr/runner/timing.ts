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

/**
 * How the store is actually being reached, always on (two integers and a
 * string, updated per ranged GET — not per chunk). The question it answers
 * is "is loading serialized by the transport?": `http/1.1` means the browser
 * holds at most six requests per origin on the wire however many are started.
 */
export const zarrTransportStats = {
  /** `nextHopProtocol` of the latest ranged GET (`h2`, `http/1.1`, …). */
  protocol: null as string | null,
  /** Ranged GETs started and not yet answered. */
  requestsInFlight: 0,
  peakRequestsInFlight: 0,
}

export function resetZarrTransportStats(): void {
  zarrTransportStats.protocol = null
  zarrTransportStats.requestsInFlight = 0
  zarrTransportStats.peakRequestsInFlight = 0
}
