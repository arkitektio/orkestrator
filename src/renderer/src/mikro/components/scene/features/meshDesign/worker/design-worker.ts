import { bakeDesign, bakeTransfers, type DesignBake, type DesignBakeMesh } from "../commit/bakeDesign";
import { resultTransfers, runDesignJob, type DesignJob, type DesignJobResult } from "./designJob";

/**
 * Worker entry for the mesh designer's heavy work, OFF the UI thread:
 *
 *  - a geometry JOB — the pure `runDesignJob` (voxelize / stamp / union /
 *    carve → march → polish → simplify);
 *  - a BAKE — the session's meshes clipped, quantized and encoded into the
 *    files of a fabriks prefix (`commit/bakeDesign.ts`), when it commits.
 *
 * A request arrives as a structured clone — a field or a mesh the session
 * still holds must not be detached under it — and the answer's buffers go
 * back in the transfer list, zero-copy. The simplifier's WASM initialises
 * here, on the first job that needs it. See `designDispatcher.ts`.
 */

export type DesignWorkerRequest = { id: number; job: DesignJob } | { id: number; bake: DesignBakeMesh[] };

export type DesignWorkerResponse =
  | { id: number; result: DesignJobResult }
  | { id: number; baked: DesignBake }
  | { id: number; error: string };

const ctx = self as unknown as Worker;

ctx.onmessage = async (event: MessageEvent<DesignWorkerRequest>) => {
  const request = event.data;
  try {
    if ("bake" in request) {
      const baked = bakeDesign(request.bake);
      const response: DesignWorkerResponse = { id: request.id, baked };
      ctx.postMessage(response, bakeTransfers(baked));
      return;
    }
    const result = await runDesignJob(request.job);
    const response: DesignWorkerResponse = { id: request.id, result };
    ctx.postMessage(response, resultTransfers(result));
  } catch (error) {
    const response: DesignWorkerResponse = {
      id: request.id,
      error: error instanceof Error ? error.message : String(error),
    };
    ctx.postMessage(response);
  }
};
