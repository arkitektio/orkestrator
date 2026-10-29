import { runLiveWireJob, type LiveWireJob } from "./liveWireJob";
import type { LiveWireWorkerRequest, LiveWireWorkerResponse } from "./liveWire-worker";

/**
 * Dispatcher for live-wire trees: one Web Worker, LATEST WINS.
 *
 * Only the tree from the newest anchor is ever wanted — a click supersedes
 * the tree the previous click asked for — so there is no queue: a job that
 * arrives while another runs takes the single pending slot, and whatever it
 * displaced resolves to null without reaching the worker. The running job
 * cannot be recalled; its answer still resolves, and the caller's own
 * generation check drops it.
 *
 * Two implementations behind one interface (the `designDispatcher` pattern):
 * worker-backed in the app, same-thread where `Worker` does not exist
 * (vitest/node) or could not be constructed. Both call `runLiveWireJob`.
 */
export type LiveWireDispatcher = {
  /** Null = displaced by a newer job before it ran. */
  grow(job: LiveWireJob): Promise<Int32Array | null>;
  dispose(): void;
};

export function createSyncLiveWireDispatcher(): LiveWireDispatcher {
  return {
    grow: async (job) => runLiveWireJob(job),
    dispose: () => {},
  };
}

const spawnLiveWireWorker = (): Worker =>
  // Single-expression `new Worker(new URL(...))` so the bundler detects and
  // bundles the worker entry (same pattern as the design worker).
  new Worker(new URL("./liveWire-worker.js", import.meta.url), { type: "module" });

type Slot = {
  id: number;
  job: LiveWireJob;
  resolve: (cameFrom: Int32Array | null) => void;
  reject: (error: Error) => void;
};

/** Exported for the fake-worker tests; production goes through `liveWireDispatcher`. */
export function createWorkerLiveWireDispatcher(
  spawn: () => Worker = spawnLiveWireWorker,
): LiveWireDispatcher {
  let worker: Worker | null = null;
  let broken = false;
  let nextId = 1;
  let running: Slot | null = null;
  let pending: Slot | null = null;

  const finish = () => {
    running = null;
    pump();
  };

  const ensureWorker = (): Worker | null => {
    if (worker || broken) return worker;
    try {
      const created = spawn();
      created.onmessage = (event: MessageEvent<LiveWireWorkerResponse>) => {
        const current = running;
        if (!current || event.data.id !== current.id) return;
        if ("error" in event.data) current.reject(new Error(event.data.error));
        else current.resolve(event.data.cameFrom);
        finish();
      };
      created.onerror = (event) => {
        // A worker that failed to load (or died) answers nothing ever again:
        // retire it, and let every later tree grow on this thread instead of
        // the band silently never following the data.
        running?.reject(new Error(`live-wire worker error: ${event.message}`));
        created.terminate();
        worker = null;
        broken = true;
        finish();
      };
      worker = created;
    } catch {
      broken = true;
    }
    return worker;
  };

  const pump = () => {
    if (running || !pending) return;
    const next = pending;
    pending = null;
    const target = ensureWorker();
    if (!target) {
      // No worker to be had: grow it here rather than not at all.
      try {
        next.resolve(runLiveWireJob(next.job));
      } catch (error) {
        next.reject(error instanceof Error ? error : new Error(String(error)));
      }
      return;
    }
    running = next;
    const message: LiveWireWorkerRequest = { id: next.id, job: next.job };
    // The values are the main thread's to give away: nothing reads them after.
    target.postMessage(message, [next.job.values.buffer]);
  };

  return {
    grow: (job) =>
      new Promise((resolve, reject) => {
        pending?.resolve(null);
        pending = { id: nextId++, job, resolve, reject };
        pump();
      }),
    dispose: () => {
      pending?.resolve(null);
      pending = null;
      running?.resolve(null);
      running = null;
      worker?.terminate();
      worker = null;
    },
  };
}

let shared: LiveWireDispatcher | null = null;

/**
 * The app's one live-wire dispatcher, created on first use. Module-level
 * because the trees are tiny next to a worker's start-up cost, and one
 * drawer at a time ever asks for them.
 */
export const liveWireDispatcher = (): LiveWireDispatcher => {
  if (!shared) {
    shared =
      typeof Worker === "undefined"
        ? createSyncLiveWireDispatcher()
        : createWorkerLiveWireDispatcher();
  }
  return shared;
};
