import { bakeDesign, type DesignBake, type DesignBakeMesh } from "../commit/bakeDesign";
import { runDesignJob, type DesignJob, type DesignJobResult } from "./designJob";
import type { DesignWorkerRequest, DesignWorkerResponse } from "./design-worker";

/**
 * Dispatcher for the designer's heavy work: one Web Worker, so neither a
 * reconstruction's field / march / polish / simplify nor a commit's bake
 * ever blocks a frame.
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
  /** Bake the meshes into a fabriks prefix (a commit). Queues behind the jobs. */
  bake(meshes: DesignBakeMesh[]): Promise<DesignBake>;
  dispose(): void;
};

/** Same work, same thread — for tests and as a fallback. */
export function createSyncDesignDispatcher(): DesignDispatcher {
  return {
    run: async (job, options) => (options?.superseded?.() ? null : runDesignJob(job)),
    bake: async (meshes) => bakeDesign(meshes),
    dispose: () => {},
  };
}

const spawnDesignWorker = (): Worker =>
  // Single-expression `new Worker(new URL(...))` so the bundler detects and
  // bundles the worker entry (same pattern as the fabriks decode worker).
  new Worker(new URL("./design-worker.js", import.meta.url), { type: "module" });

/** `Omit` that keeps the request a union of its two shapes. */
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

type Queued = {
  id: number;
  request: WithoutId<DesignWorkerRequest>;
  superseded: (() => boolean) | undefined;
  /** The same work on this thread, when there is no worker to be had. */
  local: () => Promise<DesignJobResult | DesignBake>;
  resolve: (result: DesignJobResult | DesignBake | null) => void;
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
        else current.resolve("baked" in event.data ? event.data.baked : event.data.result);
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
        void next
          .local()
          .then(next.resolve, (error) => next.reject(error instanceof Error ? error : new Error(String(error))))
          .finally(finish);
        return;
      }
      running = next;
      const message = { id: next.id, ...next.request } as DesignWorkerRequest;
      // NO transfer list: the request's field and geometry still belong to
      // the session (and to its undo snapshots). The clone is the price.
      target.postMessage(message);
    }
  };

  const enqueue = <T extends DesignJobResult | DesignBake>(
    request: Queued["request"],
    local: () => Promise<T>,
    superseded?: () => boolean,
  ) =>
    new Promise<T | null>((resolve, reject) => {
      if (disposed) {
        reject(new Error("design dispatcher disposed"));
        return;
      }
      queue.push({ id: nextId++, request, superseded, local, resolve: resolve as Queued["resolve"], reject });
      pump();
    });

  return {
    run: (job, options) => enqueue({ job }, () => runDesignJob(job), options?.superseded),
    bake: async (meshes) => {
      const baked = await enqueue({ bake: meshes }, async () => bakeDesign(meshes));
      // Only a disposed dispatcher answers null to a bake: nothing supersedes one.
      if (!baked) throw new Error("design dispatcher disposed");
      return baked;
    },
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
