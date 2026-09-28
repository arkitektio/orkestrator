import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

import {
  decodeRowGroupSpan,
  type FabriksDecodeRequest,
  type FabriksDecodedCell,
} from "./fabriksDecodeCore";
import type { MeshoptDecoderLike } from "./fabriksDecode";

/**
 * Worker entry for fabriks geometry decode: runs the pure `decodeRowGroupSpan`
 * (hyparquet parse + per-blob decompress + meshopt decode + per-vertex
 * dequantize + ordinal expansion) OFF the UI thread. This is the whole reason
 * the core is a separate module — the worker holds no transport, no caches
 * and no three.js scene types, only bytes in and typed arrays out.
 *
 * The request's `spanBytes` arrives as a structured-clone copy (the original
 * belongs to the main thread's S3ParquetStore byte cache). The decoded cells'
 * position/index/ordinal buffers are freshly allocated here and returned in
 * the TRANSFER list — zero-copy back to the main thread, where they are
 * wrapped in BufferAttributes.
 *
 * Meshopt: the worker owns its own WASM instance, initialized lazily on the
 * first MESHOPT request — a collection with codec NONE/ZSTD never pays for
 * it. See `fabriksDecodeDispatcher.ts` for the main-thread side.
 */

export type FabriksDecodeWorkerRequest = {
  id: number;
  request: FabriksDecodeRequest;
};

export type FabriksDecodeWorkerResponse =
  | { id: number; cells: FabriksDecodedCell[] }
  | { id: number; error: string };

const ctx = self as unknown as Worker;

let decoderPromise: Promise<MeshoptDecoderLike> | null = null;
const ensureDecoder = (): Promise<MeshoptDecoderLike> => {
  if (!decoderPromise) {
    decoderPromise = MeshoptDecoder.ready.then(() => MeshoptDecoder as MeshoptDecoderLike);
  }
  return decoderPromise;
};

ctx.onmessage = async (event: MessageEvent<FabriksDecodeWorkerRequest>) => {
  const { id, request } = event.data;
  try {
    const decoder = request.encoding.codec === "MESHOPT" ? await ensureDecoder() : null;
    const cells = await decodeRowGroupSpan(request, decoder);
    const transfers: ArrayBuffer[] = [];
    for (const cell of cells) {
      transfers.push(
        cell.positions.buffer as ArrayBuffer,
        cell.indices.buffer as ArrayBuffer,
        cell.objectOrdinals.buffer as ArrayBuffer,
      );
      if (cell.normals) transfers.push(cell.normals.buffer as ArrayBuffer);
    }
    const response: FabriksDecodeWorkerResponse = { id, cells };
    ctx.postMessage(response, transfers);
  } catch (error) {
    const response: FabriksDecodeWorkerResponse = {
      id,
      error: error instanceof Error ? error.message : String(error),
    };
    ctx.postMessage(response);
  }
};
