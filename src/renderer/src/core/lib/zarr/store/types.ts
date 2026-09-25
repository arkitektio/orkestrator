import type { AbsolutePath } from "@zarrita/storage";
import type { S3FetchConfig } from "@/core/lib/zarr/runner/s3-request";

export type SceneZarrStoreDescriptor = {
  bucket: string;
  key: string;
  path: string;
  storeId: string;
};

export type GeneralZarrAccessGrant = {
  accessKey: string;
  bucket: string;
  expiresIn: number;
  region: string;
  secretKey: string;
  sessionToken: string;
};

/** A byte range inside one object: absolute, or the object's last `suffixLength` bytes. */
export type ByteRange = { offset: number; length: number } | { suffixLength: number };

export type ZarrStore = {
  url: string | URL;
  get: (key: AbsolutePath, options?: RequestInit ) => Promise<Uint8Array | undefined>;
  /**
   * Ranged read of one object (zarr v3 shard indexes / inner chunks). Optional:
   * a store without it cannot serve sharded arrays — `getChunkWorker` throws a
   * clear error rather than silently reading whole shards.
   */
  getRange?: (key: AbsolutePath, range: ByteRange, options?: RequestInit) => Promise<Uint8Array | undefined>;
  getWorkerFetchConfig?: () => S3FetchConfig;
  /**
   * The config to hand a worker, rotated first if it is close enough to expiry
   * that the worker's request could outlive it. Returns the config directly
   * (not a promise) when nothing needs rotating, so awaiting it on the
   * per-chunk path costs a microtask and no more.
   */
  ensureFreshWorkerFetchConfig?: () => S3FetchConfig | Promise<S3FetchConfig>;
};

export type WorkerFetchCapableStore = {
  getWorkerFetchConfig: () => S3FetchConfig;
  ensureFreshWorkerFetchConfig?: () => S3FetchConfig | Promise<S3FetchConfig>;
};

export type RangeReadableStore = {
  getRange: NonNullable<ZarrStore["getRange"]>;
};

export function isRangeReadableStore(store: unknown): store is RangeReadableStore {
  return typeof store === "object" && store !== null && typeof (store as { getRange?: unknown }).getRange === "function";
}

export function isWorkerFetchCapableStore(
  store: unknown,
): store is WorkerFetchCapableStore {
  return typeof store === "object" && store !== null && typeof (store as { getWorkerFetchConfig?: unknown }).getWorkerFetchConfig === "function";
}

/**
 * The worker-bound config for a store, rotated if due. Stores predating the
 * refresher (or built without one) just return what they have, so this is safe
 * to call anywhere `getWorkerFetchConfig` was called before.
 */
export function workerFetchConfigFor(
  store: WorkerFetchCapableStore,
): S3FetchConfig | Promise<S3FetchConfig> {
  return store.ensureFreshWorkerFetchConfig?.() ?? store.getWorkerFetchConfig();
}

/** Minimal client interface - compatible with Apollo Client's mutate method */
export type MikroClient = {
  mutate(options: { mutation: any; variables?: any; context?: any }): Promise<{ data?: any | null }>;
  /**
   * The read half. Only the access-grant mutations needed this shim originally;
   * the sparse colouring path also reads a dataset's layouts, which is a query.
   */
  query?(options: { query: any; variables?: any; context?: any }): Promise<{ data?: any | null }>;
};
