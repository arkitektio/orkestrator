import { resultTransfers, runDesignJob, type DesignJob, type DesignJobResult } from "./designJob";

/**
 * Worker entry for the mesh designer's geometry: runs the pure `runDesignJob`
 * (voxelize / stamp / union / carve → march → polish → simplify) OFF the UI
 * thread. The job arrives as a structured clone — a field the session still
 * holds must not be detached under it — and the result's buffers go back in
 * the transfer list, zero-copy. The simplifier's WASM initialises here, on
 * the first job that needs it. See `designDispatcher.ts`.
 */

export type DesignWorkerRequest = { id: number; job: DesignJob };

export type DesignWorkerResponse = { id: number; result: DesignJobResult } | { id: number; error: string };

const ctx = self as unknown as Worker;

ctx.onmessage = async (event: MessageEvent<DesignWorkerRequest>) => {
  const { id, job } = event.data;
  try {
    const result = await runDesignJob(job);
    const response: DesignWorkerResponse = { id, result };
    ctx.postMessage(response, resultTransfers(result));
  } catch (error) {
    const response: DesignWorkerResponse = {
      id,
      error: error instanceof Error ? error.message : String(error),
    };
    ctx.postMessage(response);
  }
};
