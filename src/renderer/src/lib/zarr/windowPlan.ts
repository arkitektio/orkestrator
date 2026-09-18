/**
 * Turning a strided window into a set of chunk reads.
 *
 * The old elektro reader handed a selection to zarrita's `get()`, which does the
 * whole job on the main thread. That is the wrong path twice over:
 *
 *  - **Sharding.** For a `sharding_indexed` v3 array the chunk you fetch is a
 *    SHARD, and the useful unit inside it is an inner chunk addressed through the
 *    shard index. The shared runner (`@/lib/zarr/runner`) unwraps that, caches
 *    shard indexes, and coalesces ranged reads within a shard. Going around it
 *    means fetching whole shards to read a 2000-sample window.
 *  - **The main thread.** Fetch and decode belong on the worker pool, or a zoom
 *    gesture stalls behind a codec.
 *
 * So elektro reads chunks through `getChunkGroupWorker` and assembles the window
 * itself — which is what this module plans. It is pure arithmetic over shapes, so
 * it is unit-testable without a store, a worker or a GPU.
 *
 * The plan is per-chunk hyper-rectangles rather than per-element mapping: each
 * touched chunk contributes one contiguous run of output indices per axis, so a
 * window of N samples costs N writes and no N divisions.
 *
 * **Chunk coordinates here are INNER-chunk coordinates** — divided by
 * `effectiveChunkShapeOf(arr)`, never by `arr.chunks`, which for a sharded array
 * is the shard shape. `resolveChunkLocation` takes inner coords and does the
 * shard lookup itself.
 */

/** A resolved, half-open, forward-strided range along one axis. */
export type ResolvedRange = {
  start: number;
  /** Exclusive. */
  stop: number;
  /** >= 1. Reversal is a property of the placement, never of the read. */
  step: number;
};

/** One axis' contribution of a chunk to the output. */
export type AxisRun = {
  /** First output index along this axis that this chunk supplies. */
  outStart: number;
  /** How many output indices it supplies. Always >= 1. */
  outCount: number;
  /** Index WITHIN the chunk of the sample at `outStart`. */
  chunkOffset: number;
};

export type ChunkRead = {
  /** Inner-chunk coordinates, one per axis. */
  coords: number[];
  /** Per-axis runs, in axis order. */
  runs: AxisRun[];
};

export type WindowPlan = {
  /** Output shape, in axis order. */
  outShape: number[];
  /** Total elements — the buffer length to allocate. */
  outLength: number;
  /** Chunks to read, in C order of their coordinates. */
  chunks: ChunkRead[];
};

/**
 * Clamp a requested range into an axis of length `extent`.
 *
 * Returns null when nothing is selected — an empty window is not an error, and
 * the caller renders nothing rather than reading chunk -1.
 */
export const resolveRange = (
  extent: number,
  range?: { start?: number | null; stop?: number | null; step?: number | null },
): ResolvedRange | null => {
  const step = Math.max(1, Math.floor(range?.step ?? 1));
  const start = Math.max(0, Math.floor(range?.start ?? 0));
  const stop = Math.min(extent, Math.ceil(range?.stop ?? extent));
  if (!(stop > start)) return null;
  return { start, stop, step };
};

/** How many samples a strided range yields. */
export const countOf = (range: ResolvedRange): number =>
  Math.ceil((range.stop - range.start) / range.step);

/**
 * The run of output indices along one axis that chunk `chunkIndex` supplies, or
 * null when the stride skips over that chunk entirely (a stride wider than the
 * chunk can do exactly that, and reading the chunk anyway would be pure waste).
 */
export const runFor = (
  range: ResolvedRange,
  extent: number,
  chunkSize: number,
  chunkIndex: number,
): AxisRun | null => {
  const lo = chunkIndex * chunkSize;
  const hi = Math.min(lo + chunkSize, extent);
  if (hi <= lo) return null;

  // Smallest i with start + i*step >= lo.
  const i0 = Math.max(0, Math.ceil((lo - range.start) / range.step));
  // Largest i with start + i*step <= hi - 1.
  const i1 = Math.min(
    countOf(range) - 1,
    Math.floor((hi - 1 - range.start) / range.step),
  );
  if (i1 < i0) return null;

  return {
    outStart: i0,
    outCount: i1 - i0 + 1,
    chunkOffset: range.start + i0 * range.step - lo,
  };
};

/**
 * Plan the chunk reads for a strided window.
 *
 * `chunkShape` must be the EFFECTIVE (inner) chunk shape. Returns null when the
 * window selects nothing, or when the shapes disagree in rank — a rank mismatch
 * is a programming error that would otherwise read a plausible wrong region.
 */
export const planWindowRead = (
  shape: readonly number[],
  chunkShape: readonly number[],
  ranges: readonly (ResolvedRange | null)[],
): WindowPlan | null => {
  if (shape.length !== chunkShape.length) return null;
  if (ranges.length !== shape.length) return null;
  if (ranges.some((r) => r === null)) return null;
  const resolved = ranges as readonly ResolvedRange[];
  if (chunkShape.some((c) => !(c > 0))) return null;

  const outShape = resolved.map(countOf);
  const outLength = outShape.reduce((a, b) => a * b, 1);

  // Per axis, the chunk indices the window touches.
  const perAxisChunks = resolved.map((range, d) => {
    const first = Math.floor(range.start / chunkShape[d]);
    const last = Math.floor((range.stop - 1) / chunkShape[d]);
    const indices: number[] = [];
    for (let c = first; c <= last; c++) indices.push(c);
    return indices;
  });

  // Cartesian product, C order (last axis varies fastest).
  const chunks: ChunkRead[] = [];
  const build = (axis: number, coords: number[], runs: AxisRun[]): void => {
    if (axis === shape.length) {
      chunks.push({ coords: [...coords], runs: [...runs] });
      return;
    }
    for (const c of perAxisChunks[axis]) {
      const run = runFor(resolved[axis], shape[axis], chunkShape[axis], c);
      // A stride wider than the chunk can skip a chunk entirely.
      if (!run) continue;
      coords.push(c);
      runs.push(run);
      build(axis + 1, coords, runs);
      coords.pop();
      runs.pop();
    }
  };
  build(0, [], []);

  return { outShape, outLength, chunks };
};

/** Row-major strides for a shape, in elements. */
export const stridesFor = (shape: readonly number[]): number[] => {
  const strides = new Array<number>(shape.length);
  let acc = 1;
  for (let d = shape.length - 1; d >= 0; d--) {
    strides[d] = acc;
    acc *= shape[d];
  }
  return strides;
};

/**
 * Copy one chunk's contribution into the output buffer.
 *
 * `chunk` is zarrita's own decoded-chunk shape — `{ data, stride }`, with the
 * strides under the SINGULAR name — taken as-is so the store can hand a decoded
 * chunk straight through with no mapping. That mapping is where this broke once:
 * it was cast to `{ strides }`, which typechecked, read `undefined`, and threw
 * "Cannot read properties of undefined (reading '0')" on every tile, so no trace
 * ever drew.
 *
 * The strides come from the chunk, not from its shape: they are not necessarily
 * row-major over the chunk's extent, and assuming so is how a partial edge chunk
 * gets read skewed.
 */
export const copyChunkInto = (
  out: { data: { [i: number]: number | bigint }; strides: readonly number[] },
  chunk: {
    data: ArrayLike<number | bigint>;
    stride: readonly number[];
  },
  read: ChunkRead,
  step: readonly number[],
): void => {
  const rank = read.runs.length;
  const counter = new Array<number>(rank).fill(0);
  // An exact int64 read lands in a BigInt64Array, which only takes bigints;
  // every other output takes numbers.
  const bigintOut =
    typeof BigInt64Array !== "undefined" &&
    (out.data instanceof BigInt64Array || out.data instanceof BigUint64Array);

  for (;;) {
    let outIndex = 0;
    let chunkIndex = 0;
    for (let d = 0; d < rank; d++) {
      const run = read.runs[d];
      outIndex += (run.outStart + counter[d]) * out.strides[d];
      chunkIndex += (run.chunkOffset + counter[d] * step[d]) * chunk.stride[d];
    }
    // Number(): a bigint dtype (int64 counts) would otherwise poison a float buffer.
    const value = chunk.data[chunkIndex];
    out.data[outIndex] = (bigintOut ? value : Number(value)) as number;

    // Odometer over the run extents, last axis fastest.
    let d = rank - 1;
    while (d >= 0) {
      counter[d] += 1;
      if (counter[d] < read.runs[d].outCount) break;
      counter[d] = 0;
      d -= 1;
    }
    if (d < 0) return;
  }
};
