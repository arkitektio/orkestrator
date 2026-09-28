import {
  isExpiredS3FetchConfig,
  isStaleS3FetchConfig,
  type S3FetchConfig,
} from "../runner/s3-request";

/** How to re-credential a store whose config has gone stale. */
export type S3FetchConfigRefresher = (options: { forceRefresh?: boolean }) => Promise<S3FetchConfig>;

/**
 * The credential lifecycle behind every S3-backed store: keep a config fresh,
 * collapse concurrent rotations into one, and survive the 403 that the skew
 * missed.
 *
 * Extracted rather than duplicated because it is the subtle part. Three
 * behaviours here were each paid for once and must not be re-derived per
 * store:
 *
 *  - **One rotation, however many callers.** With the shared grant provider
 *    behind it, a whole scene going stale at the same instant is a single
 *    credentials round-trip rather than one per store.
 *  - **Synchronous in the fresh case.** `ensureFresh` returns the config
 *    itself, not a promise, so the per-request cost is one `Date.now()`
 *    compare and an `await` costs only a microtask.
 *  - **`forceRefresh` on a 403.** The cached grant is by definition the one
 *    that just failed, so retrying without forcing past it retries the same
 *    failure.
 *
 * `ConfiguredS3Store` and the fabriks transport both drive this; `s3Store.test.ts`
 * covers it end to end.
 */
export class CredentialRotation {
  private refreshInFlight: Promise<S3FetchConfig> | null = null;
  /** Whether the in-flight rotation was FORCED — a forced request must never
   * settle for a non-forced one it raced (see `rotate`). */
  private refreshInFlightForced = false;

  constructor(
    private config: S3FetchConfig,
    private readonly refresher: S3FetchConfigRefresher | null,
    /** Called whenever the config is replaced — stores mirror `baseUrl` off it. */
    private readonly onRotate?: (config: S3FetchConfig) => void,
  ) {}

  current(): S3FetchConfig {
    return this.config;
  }

  /** Stale (within the refresh skew) and we have a way to do something about it. */
  needsRotation(): boolean {
    return this.refresher !== null && isStaleS3FetchConfig(this.config);
  }

  /**
   * The config to use now. Returns SYNCHRONOUSLY in the common fresh case, so
   * callers on a hot path pay one comparison.
   */
  ensureFresh(): S3FetchConfig | Promise<S3FetchConfig> {
    if (!this.needsRotation()) return this.config;
    return this.rotate({});
  }

  /**
   * Replace the credentials, once; concurrent callers await the same rotation
   * — with ONE exception. A FORCED rotation (a 403 just told us the current
   * grant is bad) must not coalesce into an in-flight NON-forced one: the
   * non-forced refresher is allowed to re-serve the cached grant, which is by
   * definition the one that just failed. It chains a forced rotation after
   * the raced one instead, so the 403's retry always runs on a grant the
   * provider was made to mint fresh. Forced-into-forced still coalesces.
   */
  rotate(options: { forceRefresh?: boolean }): Promise<S3FetchConfig> {
    if (this.refreshInFlight) {
      if (!options.forceRefresh || this.refreshInFlightForced) return this.refreshInFlight;
      return this.refreshInFlight
        .catch(() => this.config)
        .then(() => this.rotate({ forceRefresh: true }));
    }
    const refresher = this.refresher;
    if (!refresher) return Promise.resolve(this.config);

    const rotation = refresher(options)
      .then((config) => {
        this.config = config;
        this.onRotate?.(config);
        return config;
      })
      .finally(() => {
        if (this.refreshInFlight === rotation) {
          this.refreshInFlight = null;
          this.refreshInFlightForced = false;
        }
      });

    this.refreshInFlight = rotation;
    this.refreshInFlightForced = Boolean(options.forceRefresh);
    return rotation;
  }

  /**
   * Bring the config up to date before a request, or say plainly that it
   * cannot be. Without a refresher an expired config is a hard error — the
   * historical behaviour, kept for callers that have no way to mint new
   * credentials.
   */
  async beforeRequest(): Promise<void> {
    if (this.needsRotation()) {
      await this.rotate({});
      return;
    }
    if (isExpiredS3FetchConfig(this.config)) {
      throw new Error(`S3 credentials for ${this.config.storeId} have expired`);
    }
  }

  /** Whether a 403 is worth one forced rotation and a retry. */
  canRetryForbidden(): boolean {
    return this.refresher !== null;
  }
}
