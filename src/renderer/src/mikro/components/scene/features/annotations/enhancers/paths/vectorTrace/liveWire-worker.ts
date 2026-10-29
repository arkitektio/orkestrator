import { runLiveWireJob, type LiveWireJob } from "./liveWireJob";

/**
 * Worker entry for the vector enhancer's live-wire: builds the cost field and
 * grows the Dijkstra tree OFF the UI thread, so placing an anchor never
 * stalls the frame that drew it. The values arrive transferred (the main
 * thread has no further use for them) and the tree goes back the same way.
 * See `liveWireDispatcher.ts` for the main-thread side.
 */

export type LiveWireWorkerRequest = { id: number; job: LiveWireJob };

export type LiveWireWorkerResponse =
  | { id: number; cameFrom: Int32Array }
  | { id: number; error: string };

const ctx = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<LiveWireWorkerRequest>) => {
  const { id, job } = event.data;
  try {
    const cameFrom = runLiveWireJob(job);
    const response: LiveWireWorkerResponse = { id, cameFrom };
    ctx.postMessage(response, [cameFrom.buffer]);
  } catch (error) {
    const response: LiveWireWorkerResponse = {
      id,
      error: error instanceof Error ? error.message : String(error),
    };
    ctx.postMessage(response);
  }
};
