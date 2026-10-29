import { buildTraceCost, type TraceWeights } from "./traceCost";
import { growTraceTree, type TraceNode } from "./traceSearch";

/**
 * One live-wire tree, as plain data: the window's sampled values in, the
 * back-pointer field out. Pure and hook-free so the worker
 * (`liveWire-worker.ts`) and the same-thread fallback run the very same code.
 *
 * The values are read on the main thread — `sampleResident` is the brick
 * system's, and it lives there — so the job carries them; the cost field and
 * the Dijkstra, which are the expensive part, run wherever the job lands.
 */
export type LiveWireJob = {
  /** Sampled values, x-fastest; `NaN` where nothing was resident. */
  values: Float32Array;
  size: readonly [number, number, number];
  spacing: readonly [number, number, number];
  weights: TraceWeights;
  seed: TraceNode;
};

/**
 * Expansion cap for one tree. The window is already capped by its node
 * budget, so this only stops a pathological field from pinning the worker.
 */
export const LIVE_WIRE_BUDGET = 4_000_000;

export function runLiveWireJob(job: LiveWireJob): Int32Array {
  const cost = buildTraceCost({
    values: job.values,
    size: job.size,
    spacing: job.spacing,
    // No goal yet, so no chord to be straight towards: the term is dropped
    // explicitly rather than left to the missing endpoints.
    weights: { ...job.weights, straightness: 0 },
  });
  return growTraceTree(
    { size: job.size, spacing: job.spacing, cost },
    job.seed,
    { budget: LIVE_WIRE_BUDGET },
  );
}
