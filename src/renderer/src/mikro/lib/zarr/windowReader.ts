import { ByteBudgetChunkCache } from "@/core/data/zarr/caches/byteBudgetChunkCache";
import { openZarrArray, type OpenedZarrArray } from "@/core/data/zarr/openArray";
import { INTERACTIVE_FETCH_PRIORITY } from "@/core/data/zarr/pool/types";
import { workerPool } from "@/core/data/zarr/pool/sharedWorkerPool";
import { readArrayWindow, type WindowRange } from "@/core/data/zarr/readArrayWindow";
import { ConfiguredS3Store } from "@/core/data/zarr/store/s3Store";
import type { MikroClient } from "@/core/data/zarr/store/types";
import { buildS3FetchConfig, getGeneralAccess } from "./access";

/**
 * Reading a WINDOW of a mikro zarr store: positional ranges in, a row-major
 * buffer out.
 *
 * The scene reads bricks through its residency engine; this is for a consumer
 * that wants a slab of an array as numbers — a chart tracing a lens along one
 * axis. It goes through the shared worker runner (`readArrayWindow`), never
 * zarrita's main-thread `get()`, and opens stores with the same general zarr
 * grant every other datalayer consumer uses.
 *
 * Its own decoded-chunk caches, one per fidelity: the cache key does not include
 * the fidelity, so a promoting read (samples arrive as float32, the default)
 * must never share one with an exact read (`fidelity: "exact"`, the array's own
 * dtype — a lookup's float64 instants).
 */

const WINDOW_CHUNK_CACHE = new ByteBudgetChunkCache(64 * 1024 * 1024);
const WINDOW_EXACT_CHUNK_CACHE = new ByteBudgetChunkCache(16 * 1024 * 1024);

/** What a read needs of a store: its id (the cache key) and its object key. */
export type WindowStore = { id: string; key: string };

export type WindowReader = {
  read: (
    store: WindowStore,
    ranges: readonly (WindowRange | null | undefined)[],
    opts?: { signal?: AbortSignal; priority?: number; fidelity?: "default" | "exact" },
  ) => Promise<{ shape: number[]; strides: number[]; data: ArrayLike<number> }>;
  /** Forget every opened array (the client or the datalayer changed). */
  dispose: () => void;
};

/**
 * `deps` is a GETTER: the client and the datalayer endpoint arrive from React
 * context, and a late or changed one must reach the next read without anything
 * being rebuilt around it.
 */
export const createWindowReader = (
  deps: () => { client: MikroClient; datalayer: string } | null,
): WindowReader => {
  /** Store id → its opened array; dropped on failure so the next read retries. */
  const opened = new Map<string, Promise<OpenedZarrArray>>();

  const open = (store: WindowStore): Promise<OpenedZarrArray> => {
    const existing = opened.get(store.id);
    if (existing) return existing;
    const current = deps();
    if (!current) return Promise.reject(new Error("the datalayer is not ready"));
    const { client, datalayer } = current;
    const target = { key: store.key, storeId: store.id };
    const array = (async () => {
      const s3 = new ConfiguredS3Store(
        buildS3FetchConfig(await getGeneralAccess(client), target, datalayer),
        {
          preloadMetadata: true,
          // The store rotates its own credentials: on expiry, and when S3 says
          // the ones it holds are no good.
          refreshConfig: async (options) =>
            buildS3FetchConfig(await getGeneralAccess(client, options), target, datalayer),
        },
      );
      await s3.ready();
      return openZarrArray(s3);
    })();
    array.catch(() => {
      if (opened.get(store.id) === array) opened.delete(store.id);
    });
    opened.set(store.id, array);
    return array;
  };

  return {
    read: async (store, ranges, opts = {}) => {
      const array = await open(store);
      // An abandoned window that still resolved would waste the fetch and race
      // the buffer write that replaced it.
      opts.signal?.throwIfAborted();
      return readArrayWindow(array, ranges, {
        pool: workerPool,
        cache: opts.fidelity === "exact" ? WINDOW_EXACT_CHUNK_CACHE : WINDOW_CHUNK_CACHE,
        priority: opts.priority ?? INTERACTIVE_FETCH_PRIORITY,
        signal: opts.signal,
        fidelity: opts.fidelity ?? "default",
      });
    },
    dispose: () => opened.clear(),
  };
};
