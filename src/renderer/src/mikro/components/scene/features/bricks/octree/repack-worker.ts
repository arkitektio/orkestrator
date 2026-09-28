import { encodeHalfArray } from "./halfFloat";
import { R16F_DATA_SCALE } from "./atlasFormat";
import { repackBrick, type BrickArray, type RepackBrickInput } from "./brickRepack";
import { interleaveSlabsRgba8, rgba8OutputBytes } from "./rgbaPack";

/**
 * Worker entry for brick repack: runs the pure `repackBrick` (strided copy +
 * edge replication + min/max scan over a whole stored brick) OFF the UI
 * thread. The input chunks arrive as SAB-backed typed arrays (zero-copy —
 * they stay in the main-side chunk cache) or, for the rare non-SAB chunk
 * (fill-value chunks), as structured-clone copies. The output brick is
 * allocated here and returned as a transferable ArrayBuffer.
 *
 * Protocol: `{ id, kind, elementCount, input }` → `{ id, buffer, min, max,
 * uniformValue }` (buffer transferred) or `{ id, error }`. See
 * `repackDispatcher.ts` for the main-thread side.
 */

export type RepackWorkerRequest = {
  id: number;
  kind: "r8" | "r16f" | "r32f" | "rgba8";
  elementCount: number;
  input: Omit<RepackBrickInput, "output">;
  /** A previously returned output buffer, transferred back for reuse (the
   * dispatcher's free list). Used only when its byteLength matches exactly;
   * a mismatch (pool spec changed) falls back to a fresh allocation. */
  recycled?: ArrayBuffer;
};

export type RepackWorkerResponse =
  | {
      id: number;
      buffer: ArrayBuffer;
      min: number;
      max: number;
      uniformValue: number | null;
      /** Per-slab [min, max], flattened (`RepackResult.slabRanges`). */
      slabMin: number[];
      slabMax: number[];
    }
  | { id: number; error: string };

const ctx = self as unknown as Worker;

/** Reusable raw-value scratch for the R16F path: `repackBrick` writes RAW
 * floats (its min/max scan and the uniform test must see raw values), the
 * half-float encode happens after, into the transferable output. Grow-only
 * and worker-local — repacks are serialized per worker. */
let r16fScratch = new Float32Array(0);
/** Same for the RGBA8 path: planar bytes before the interleave. */
let rgba8Scratch = new Uint8Array(0);

ctx.onmessage = (event: MessageEvent<RepackWorkerRequest>) => {
  const { id, kind, elementCount, input, recycled } = event.data;
  try {
    const bytesNeeded =
      kind === "rgba8"
        ? rgba8OutputBytes(elementCount, input.spec.channelCount)
        : elementCount * (kind === "r8" ? 1 : kind === "r16f" ? 2 : 4);
    let backing: ArrayBuffer;
    if (recycled && recycled.byteLength === bytesNeeded) {
      backing = recycled;
      // The phasor path accumulates += into the output and RELIES on it
      // arriving zeroed (reduceChunks); a fresh ArrayBuffer is zero by spec,
      // a recycled one is not. A 1 MB fill is microseconds against the
      // repack itself — the win is skipping the allocation + GC, not the fill.
      new Uint8Array(backing).fill(0);
    } else {
      backing = new ArrayBuffer(bytesNeeded);
    }
    let output: BrickArray;
    let result;
    if (kind === "r16f") {
      // Repack raw into the scratch, THEN encode `raw / 65535` half floats
      // into the half-sized transferable (see halfFloat.ts). A phasor layer
      // never reaches r16f (atlasKindForGeometry forces r32f), so the
      // zeroed-arrival contract concerns only the untouched output tail.
      if (r16fScratch.length < elementCount) r16fScratch = new Float32Array(elementCount);
      else r16fScratch.fill(0, 0, elementCount);
      const scratch = r16fScratch.subarray(0, elementCount);
      result = repackBrick({ ...input, output: scratch });
      output = new Uint16Array(backing);
      encodeHalfArray(scratch, output as Uint16Array, 1 / R16F_DATA_SCALE, elementCount);
    } else if (kind === "rgba8") {
      // Planar repack into a byte scratch (min/max per slab on the planar
      // layout), then interleave four slabs per texel into the output.
      if (rgba8Scratch.length < elementCount) rgba8Scratch = new Uint8Array(elementCount);
      const scratch = rgba8Scratch.subarray(0, elementCount);
      result = repackBrick({ ...input, output: scratch });
      output = new Uint8Array(backing);
      interleaveSlabsRgba8(
        scratch,
        elementCount / input.spec.channelCount,
        input.spec.channelCount,
        output as Uint8Array,
      );
    } else {
      output = kind === "r8" ? new Uint8Array(backing) : new Float32Array(backing);
      result = repackBrick({ ...input, output });
    }
    const response: RepackWorkerResponse = {
      id,
      buffer: output.buffer as ArrayBuffer,
      min: result.min,
      max: result.max,
      uniformValue: result.uniformValue,
      slabMin: result.slabRanges.map((r) => r[0]),
      slabMax: result.slabRanges.map((r) => r[1]),
    };
    ctx.postMessage(response, [output.buffer as ArrayBuffer]);
  } catch (error) {
    const response: RepackWorkerResponse = {
      id,
      error: error instanceof Error ? error.message : String(error),
    };
    ctx.postMessage(response);
  }
};
