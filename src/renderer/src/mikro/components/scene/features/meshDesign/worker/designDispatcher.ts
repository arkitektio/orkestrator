import { runDesignJob, type DesignJob, type DesignJobResult } from "./designJob";
import type { DesignWorkerRequest, DesignWorkerResponse } from "./design-worker";

/**
 * Dispatcher for the designer's geometry jobs: one Web Worker, so a
 * reconstruction's field / march / polish / simplify never blocks a frame.
 *
 * ONE worker, one job at a time, on purpose. A session's jobs are a chain —
 * each edit starts from the field the previous one produced — so running two
 * at once would only race them; and the work is memory-bound (a field is up
 * to 32 MB), not something to multiply. Jobs queue here in order.
 *
 * `superseded` is how a caller withdraws: it is asked just before a queued
 * job is posted, and a job nobody wants any more resolves to null without
 * ever reaching the worker. A job already running cannot be recalled — the
 * caller drops its result (the `stale()` idiom) — but it also cannot pile
 * up: the queue behind it is what gets pruned.
 *
 * Two implementations behind one interface (the `fabriksDecodeDispatcher`
 * pattern): worker-backed in the app, same-thread where `Worker` does not
 * exist (vitest/node) or could not be constructed. Both call `runDesignJob`.
 */

export type DesignJobOptions = {
  /** True when the job is no longer wanted; checked while it is queued. */
  superseded?: () => boolean;
};

export type DesignDispatcher = {
  /** Null = dropped while queued (`superseded`). Rejects on a worker error. */
  run(job: DesignJob, options?: DesignJobOptions): Promise<DesignJobResult | null>;
  dispose(): void;
};

/** Same work, same thread — for tests and as a fallback. */
export function createSyncDesignDispatcher(): DesignDispatcher {
  return {
    run: async (job, options) => (options?.superseded?.() ? null : runDesignJob(job)),
    dispose: () => {},
  };
}

const spawnDesignWorker = (): Worker =>
  // Single-expression `new Worker(new URL(...))` so the bundler detects and
  // bundles the worker entry (same pattern as the fabriks decode worker).
  new Worker(new URL("./design-worker.js", import.meta.url), { type: "module" });

type Queued = {
  id: number;
  job: DesignJob;
  superseded: (() => boolean) | undefined;
  resolve: (result: DesignJobResult | null) => void;
  reject: (error: Error) => void;
};

/** Exported for the fake-worker tests; production goes through `designDispatcher`. */
export function createWorkerDesignDispatcher(spawn: () => Worker = spawnDesignWorker): DesignDispatcher {
  let worker: Worker | null = null;
  let broken = false;
  let disposed = false;
  let nextId = 1;
  let running: Queued | null = null;
  const queue: Queued[] = [];

  const finish = () => {
    running = null;
    pump();
  };

  const ensureWorker = (): Worker | null => {
    if (worker || broken) return worker;
    try {
      const created = spawn();
      created.onmessage = (event: MessageEvent<DesignWorkerResponse>) => {
        const current = running;
        if (!current || event.data.id !== current.id) return;
        if ("error" in event.data) current.reject(new Error(event.data.error));
        else current.resolve(event.data.result);
        finish();
      };
      created.onerror = (event) => {
        running?.reject(new Error(`design worker error: ${event.message}`));
        finish();
      };
      worker = created;
    } catch {
      broken = true;
    }
    return worker;
  };

  const pump = () => {
    while (!running && queue.length > 0) {
      const next = queue.shift()!;
      if (next.superseded?.()) {
        next.resolve(null);
        continue;
      }
      const target = ensureWorker();
      if (!target) {
        // No worker to be had: do it here rather than not at all.
        running = next;
        void runDesignJob(next.job)
          .then(next.resolve, (error) => next.reject(error instanceof Error ? error : new Error(String(error))))
          .finally(finish);
        return;
      }
      running = next;
      const message: DesignWorkerRequest = { id: next.id, job: next.job };
      // NO transfer list: the job's field and geometry still belong to the
      // session (and to its undo snapshots). The clone is the price.
      target.postMessage(message);
    }
  };

  return {
    run: (job, options) =>
      new Promise<DesignJobResult | null>((resolve, reject) => {
        if (disposed) {
          reject(new Error("design dispatcher disposed"));
          return;
        }
        queue.push({ id: nextId++, job, superseded: options?.superseded, resolve, reject });
        pump();
      }),
    dispose: () => {
      disposed = true;
      worker?.terminate();
      worker = null;
      for (const queued of queue.splice(0)) queued.resolve(null);
      running?.reject(new Error("design dispatcher disposed"));
      running = null;
    },
  };
}

let shared: DesignDispatcher | null = null;

/** The app's one design dispatcher, created on first use. */
export const designDispatcher = (): DesignDispatcher => {
  if (!shared) {
    shared = typeof Worker === "undefined" ? createSyncDesignDispatcher() : createWorkerDesignDispatcher();
  }
  return shared;
};
