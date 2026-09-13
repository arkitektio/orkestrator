import { type AbsolutePath } from "@zarrita/storage";
import { ByteBudgetByteCache } from "../caches/byteBudgetByteCache";
import { fetchS3Path, type S3FetchConfig } from "@/lib/zarr/runner/s3-request";
import { CredentialRotation, type S3FetchConfigRefresher } from "./credentialRotation";
import type { ByteRange, ZarrStore } from "./types";


class AsyncLockManager {
  private locks = new Map<string, Promise<Uint8Array | undefined>>();

  async withLock(key: string, fn: () => Promise<Uint8Array | undefined>): Promise<Uint8Array | undefined> {
    if (this.locks.has(key)) {
      return await this.locks.get(key)!;
    }

    const promise = fn().finally(() => {
      this.locks.delete(key);
    });

    this.locks.set(key, promise);
    return await promise;
  }
}

export class HTTPError extends Error {
  __zarr__: string;
  constructor(code: string | undefined) {
    super(code);
    this.__zarr__ = "HTTPError";
    Object.setPrototypeOf(this, HTTPError.prototype);
  }
}

export class KeyError extends Error {
  __zarr__: string;

  constructor(key: string | undefined) {
    super(`key ${key} not present`);
    this.__zarr__ = "KeyError";
    Object.setPrototypeOf(this, KeyError.prototype);
  }
}

async function handle_response(
  response: Response,
): Promise<Uint8Array | undefined> {
  if (response.status === 404) {
    return undefined;
  }
  if (response.status === 200 || response.status === 206) {
    return new Uint8Array(await response.arrayBuffer());
  }
  throw new Error(
    `Unexpected response status ${response.status} ${response.statusText}`,
  );
}

export function rangeHeaderValue(range: ByteRange): string {
  return "suffixLength" in range
    ? `bytes=-${range.suffixLength}`
    : `bytes=${range.offset}-${range.offset + range.length - 1}`;
}

function rangeCacheSuffix(range: ByteRange): string {
  return "suffixLength" in range
    ? `suffix-${range.suffixLength}`
    : `${range.offset}-${range.offset + range.length}`;
}

function sliceRange(body: Uint8Array, range: ByteRange): Uint8Array {
  return "suffixLength" in range
    ? body.subarray(Math.max(0, body.byteLength - range.suffixLength))
    : body.subarray(range.offset, range.offset + range.length);
}

// Byte-bounded, not count-bounded: on the streaming path this mostly holds
// zarr.json documents (chunk GETs happen inside the codec workers), but any
// consumer routing chunk reads through `store.get` would otherwise pin
// unbounded memory behind a 500-entry count cap.
const RAW_BYTE_CACHE_BUDGET = 64 * 1024 * 1024;
const global_cache = new ByteBudgetByteCache(RAW_BYTE_CACHE_BUDGET);

const defaultMetadataKeys: AbsolutePath[] = ["/zarr.json"];

/**
 * Mints a fresh config for THIS store — same bucket/key, new credentials. The
 * store never talks to the credential service itself: it is in `lib/`, and who
 * issues grants is a module concern (see `mikro-next/lib/zarr/access.ts`).
 *
 * Defined with the rotation logic it drives; re-exported here because this is
 * where callers have always imported it from.
 */
export type { S3FetchConfigRefresher };

export class ConfiguredS3Store implements ZarrStore {
  url: string | URL;
  private cache: ByteBudgetByteCache;
  private lockManager: AsyncLockManager;
  private metadataPromise: Promise<void>;
  /** Credential lifecycle: freshness, single-flight rotation, 403 recovery. */
  private rotation: CredentialRotation;

  constructor(
    workerFetchConfig: S3FetchConfig,
    options: {
      preloadMetadata?: boolean;
      /**
       * How to re-credential this store when its config goes stale. Without
       * one, an expired config is a hard error — the historical behavior, kept
       * for callers that have no way to mint new credentials.
       */
      refreshConfig?: S3FetchConfigRefresher;
    } = {},
  ) {
    this.url = workerFetchConfig.baseUrl;
    this.cache = global_cache;
    this.lockManager = new AsyncLockManager();
    this.rotation = new CredentialRotation(
      workerFetchConfig,
      options.refreshConfig ?? null,
      // The bucket/key are unchanged by a re-credentialing, but the grant
      // decides the bucket, so keep `url` honest either way.
      (config) => { this.url = config.baseUrl; },
    );
    this.metadataPromise = options.preloadMetadata === false
      ? Promise.resolve()
      : this.primeMetadata();
  }

  async ready(): Promise<void> {
    await this.metadataPromise;
  }

  getWorkerFetchConfig(): S3FetchConfig {
    return this.rotation.current();
  }

  /**
   * The config to hand a decode worker. Workers fetch with the snapshot they
   * were given, so a config that goes stale between here and the worker's
   * request dies as a 403 the worker cannot recover from — rotating on the way
   * out is what keeps the streaming path alive.
   *
   * Returns SYNCHRONOUSLY (not a promise) in the overwhelmingly common fresh
   * case, so the per-chunk cost is one `Date.now()` compare and callers that
   * `await` it pay nothing but a microtask.
   */
  ensureFreshWorkerFetchConfig(): S3FetchConfig | Promise<S3FetchConfig> {
    return this.rotation.ensureFresh();
  }

  async get(key: AbsolutePath, options: RequestInit = {}): Promise<Uint8Array | undefined> {
    await this.metadataPromise;

    return this.getInternal(key, options);
  }

  /**
   * Ranged read — zarr v3 shard indexes (suffix) and inner chunks (absolute).
   * Same credential/403 handling and byte cache as `get`, keyed by range so a
   * suffix read and an inner-chunk read of the same shard never alias.
   */
  async getRange(key: AbsolutePath, range: ByteRange, options: RequestInit = {}): Promise<Uint8Array | undefined> {
    await this.metadataPromise;
    const headers = new Headers(options.headers);
    headers.set("Range", rangeHeaderValue(range));
    return this.getInternal(key, { ...options, headers }, range);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async getInternal(
    key: AbsolutePath,
    options: RequestInit = {},
    range?: ByteRange,
  ): Promise<Uint8Array | undefined> {
    // Hot path: one Date.now() compare. Everything below only runs when the
    // credentials are actually within the rotation window.
    await this.rotation.beforeRequest();

    // Content-addressed by store and key: credentials are not part of the
    // identity, so a rotation never invalidates a byte of it.
    const cacheKey = `${this.rotation.current().storeId}:${key}${range ? `:${rangeCacheSuffix(range)}` : ""}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return new Uint8Array(cached);
    }

    return this.lockManager.withLock(cacheKey, async () => {
      const cachedAfterLock = this.cache.get(cacheKey);
      if (cachedAfterLock) {
        return new Uint8Array(cachedAfterLock);
      }

      let response = await fetchS3Path(this.rotation.current(), key, options);

      // The skew missed: S3 rejected credentials we still believed in (clock
      // drift, or a grant revoked early). Force past the cached grant — it is
      // by definition the one that just failed — and try once more. A second
      // 403 falls through to handle_response as a real error.
      if (response.status === 403 && this.rotation.canRetryForbidden()) {
        await this.rotation.rotate({ forceRefresh: true });
        response = await fetchS3Path(this.rotation.current(), key, options);
      }

      let result = await handle_response(response);

      // A gateway that ignores Range answers 200 with the WHOLE object. Slice
      // locally rather than hand the caller bytes from the wrong offset (same
      // defence as the fabriks store).
      if (result && range && response.status === 200 && !response.headers.get("Content-Range")) {
        result = sliceRange(result, range);
      }

      if (result) {
        const bufferToCache = result.buffer.slice(
          result.byteOffset,
          result.byteOffset + result.byteLength,
        );
        this.cache.set(cacheKey, bufferToCache as ArrayBuffer);
      }

      return result;
    });
  }

  private async primeMetadata(): Promise<void> {
    await Promise.all(
      defaultMetadataKeys.map(async (metadataKey) => {
        try {
          await this.getInternal(metadataKey);
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("Unexpected response status 404")) {
            throw error;
          }
        }
      }),
    );
  }
}

