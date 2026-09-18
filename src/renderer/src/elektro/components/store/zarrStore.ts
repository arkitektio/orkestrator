import { ApolloClient, NormalizedCache } from "@apollo/client";
import { S3FetchConfig } from "@/lib/zarr/runner/s3-request";
import { ConfiguredS3Store } from "@/lib/zarr/store/s3Store";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";

import { openZarrArray, type OpenedZarrArray } from "@/lib/zarr/openArray";
import { ByteBudgetChunkCache } from "@/lib/zarr/caches/byteBudgetChunkCache";
import { INTERACTIVE_FETCH_PRIORITY } from "@/lib/zarr/pool/types";
import { workerPool } from "@/lib/zarr/pool/sharedWorkerPool";
import { readArrayWindow } from "@/lib/zarr/readArrayWindow";
import type { AxisRange } from "@/elektro/components/experiment/platform/sources/axisSelection";
import { createStore } from "zustand/vanilla";
import {
  GeneralZarrAccessGrantFragment,
  RequestGeneralZarrAccessDocument,
  RequestGeneralZarrAccessMutation,
  RequestGeneralZarrAccessMutationVariables,
  ZarrStoreFragment,
} from "../../api/graphql";

type ElektroClient = ApolloClient<NormalizedCache>;

/**
 * Decoded-chunk cache for trace reads — deliberately SMALL.
 *
 * Its own budget rather than the runner's shared default, so a mikro scene
 * streaming bricks cannot evict the window a trace is drawn from. But the trace
 * tile residency already holds every tile it draws (a tile is one chunk, often
 * the chunk's own array, read zero-copy), so a large cache here would only hold
 * the same 20 MB chunks a second time. What it is still for: a tile re-read
 * soon after eviction, and the in-flight merge of concurrent reads.
 */
const CHUNK_CACHE_BYTES = 64 * 1024 * 1024;
const CHUNK_CACHE = new ByteBudgetChunkCache(CHUNK_CACHE_BYTES);

// --- Selection / result types (shared with useTraceArray) ---

/**
 * A decoded window of an array.
 *
 * `shape` is the WINDOW's shape, not the source array's, and is of whatever rank
 * the array actually has — a trace is 1-D, a multi-channel signal 2-D. (The old
 * type declared mikro's fixed 5-tuple, which was a lie for every elektro array.)
 * Callers resolve axes by NAME against the dataset's `axisNames`; nothing here
 * assumes a position.
 *
 * `data` is row-major over `shape`. It is a `Float32Array` for every dtype except
 * `uint8`, because that is what the shared codec worker promotes to — see
 * `TextureFidelity`. For sample data that is ample (a membrane voltage needs
 * nowhere near 7 significant digits). It is worth knowing for a TIME lookup
 * array: float32 resolves ~1e-4 at 1e3, so relative times are fine, but absolute
 * epoch-scale seconds would not be. `CoordinateSystem.epoch` exists precisely so
 * stored times stay relative.
 */
export type ArrayWindow = {
  shape: number[];
  strides: number[];
  data: Float32Array | Uint8Array;
};

// --- Config ---

export interface ZarrStoreConfig {
  /** Requested lifetime (s) for the general access grant. `undefined` → server default. */
  grantExpiresIn?: number;
  /** Refresh the grant (and rebuild open stores) this long before it expires. */
  refreshMarginMs: number;
  /** Prime `/zarr.json` on store construction. `open.v3` reads metadata anyway, so off by default. */
  preloadMetadata: boolean;
}

export const DEFAULT_ZARR_CONFIG: ZarrStoreConfig = {
  grantExpiresIn: undefined,
  refreshMarginMs: 30_000,
  preloadMetadata: false,
};

// --- Store state ---

export interface ElektroZarrState {
  config: ZarrStoreConfig;
  setConfig: (partial: Partial<ZarrStoreConfig>) => void;

  /** Ids of stores currently held open in the registry (reactive, for debugging/UI). */
  openStoreIds: string[];

  /** Open (or reuse) the zarr array for a trace store. */
  getArray: (store: ZarrStoreFragment) => Promise<OpenedZarrArray>;
  /**
   * Read a strided window out of an array, through the shared worker runner.
   *
   * `ranges` is positional, in the ARRAY's own axis order — callers project a
   * by-name selection onto it (see `selectionForAxes`). A null/absent entry reads
   * that axis in full.
   */
  readWindow: (
    store: ZarrStoreFragment,
    ranges?: readonly (AxisRange | null | undefined)[],
    opts?: { signal?: AbortSignal; priority?: number },
  ) => Promise<ArrayWindow>;

  /** Drop the cached grant and every open store (e.g. after a config change). */
  invalidate: () => void;
}

type CachedGrant = {
  promise: Promise<GeneralZarrAccessGrantFragment>;
  expiresAt: number;
};

type OpenEntry = {
  /**
   * When the credentials this store was opened with run out. Provisional
   * (infinity) until the grant resolves, then the grant's real expiry — an
   * entry past it is replaced on the next `getArray` rather than handed out.
   * The store also rotates its own credentials on demand (see `refreshConfig`
   * in `openArray`), so this is the second line of defence, not the first.
   */
  expiresAt: number;
  array: Promise<OpenedZarrArray>;
};

const requestGeneralAccess = async (
  client: ElektroClient,
  grantExpiresIn?: number,
): Promise<GeneralZarrAccessGrantFragment> => {
  const access = await client.mutate<
    RequestGeneralZarrAccessMutation,
    RequestGeneralZarrAccessMutationVariables
  >({
    mutation: RequestGeneralZarrAccessDocument,
    variables: { input: { expiresIn: grantExpiresIn ?? null } },
  });

  const grant = access.data?.requestGeneralZarrAccess;
  if (!grant) {
    throw new Error("Failed to obtain general Zarr access credentials");
  }
  return grant;
};

/**
 * Elektro-scoped zarr data store. Requests a single *general* zarr access grant
 * (cached and refreshed near expiry), keeps a lazy registry of open zarr arrays
 * keyed by `storeId`, and is reused across all elektro pages. Mirrors the mikro
 * scene `viewerStore`, but opens stores on demand instead of eagerly from a scene.
 */
export const createElektroZarrStore = (
  client: ElektroClient | undefined,
  datalayer: string | undefined,
  config: ZarrStoreConfig,
) => {
  // Imperative caches kept outside reactive state.
  const openByStoreId = new Map<string, OpenEntry>();
  let grant: CachedGrant | null = null;

  return createStore<ElektroZarrState>((set, get_) => {
    /**
     * The cached general grant, re-requested near expiry. `forceRefresh` skips
     * the cache: a store's 403 recovery asks for it when S3 rejected the grant
     * we still believed in (clock drift, early revocation).
     *
     * Open stores are NOT dropped on refresh: each rotates its own credentials
     * through `refreshConfig`, so a refresh here is one mutation shared by
     * every store that asks, not a reason to reopen them all.
     */
    const ensureGrant = (
      options: { forceRefresh?: boolean } = {},
    ): Promise<GeneralZarrAccessGrantFragment> => {
      if (!client) throw new Error("No elektro client found");
      const { refreshMarginMs, grantExpiresIn } = get_().config;

      if (
        !options.forceRefresh &&
        grant &&
        Date.now() < grant.expiresAt - refreshMarginMs
      ) {
        return grant.promise;
      }

      const promise = requestGeneralAccess(client, grantExpiresIn);
      // Optimistically cache the promise; back-fill the real expiry once resolved.
      grant = { promise, expiresAt: Number.POSITIVE_INFINITY };
      promise
        .then(g => {
          if (grant && grant.promise === promise) {
            grant.expiresAt = Date.now() + g.expiresIn * 1000;
          }
        })
        .catch(() => {
          if (grant && grant.promise === promise) grant = null;
        });
      return promise;
    };

    /** The fetch config a grant implies for one trace store. */
    const configFor = (
      g: GeneralZarrAccessGrantFragment,
      store: ZarrStoreFragment,
      endpoint: string,
    ): S3FetchConfig => ({
      accessKey: g.accessKey,
      secretKey: g.secretKey,
      sessionToken: g.sessionToken,
      region: g.region,
      expiresAt: Date.now() + g.expiresIn * 1000,
      storeId: store.id,
      baseUrl: `${endpoint.replace(/\/$/, "")}/${g.bucket}/${store.key}`,
    });

    const openArray = async (
      store: ZarrStoreFragment,
      onGrant: (g: GeneralZarrAccessGrantFragment) => void,
    ): Promise<OpenedZarrArray> => {
      if (!datalayer) throw new Error("No datalayer endpoint configured");
      const endpoint = datalayer;
      const g = await ensureGrant();
      onGrant(g);
      const s3 = new ConfiguredS3Store(configFor(g, store, endpoint), {
        preloadMetadata: get_().config.preloadMetadata,
        // Traces outlive their credentials: the registry keeps a store open
        // for as long as the module is mounted, and a grant is minutes long.
        // Without this an expired config is a hard error inside the store,
        // and the page that reads it goes blank. Same wiring as the mikro
        // scene stores (`zarrSources.ts`).
        refreshConfig: async (options) =>
          configFor(await ensureGrant(options), store, endpoint),
      });
      // Not a bare `open.v3`: this also resolves the array's fetch metadata, so
      // `effectiveChunkShapeOf` is answerable synchronously afterwards. For a
      // `sharding_indexed` array zarrita's `arr.chunks` is the SHARD shape, and
      // planning against that would fetch whole shards to read one window.
      return openZarrArray(s3);
    };

    return {
      config,
      setConfig: partial => set(s => ({ config: { ...s.config, ...partial } })),

      openStoreIds: [],

      getArray: store => {
        const existing = openByStoreId.get(store.id);
        if (existing && Date.now() < existing.expiresAt) {
          return existing.array;
        }

        const entry: OpenEntry = {
          // Provisional until the grant resolves; see OpenEntry.expiresAt.
          expiresAt: Number.POSITIVE_INFINITY,
          array: Promise.resolve().then(() =>
            openArray(store, (g) => {
              entry.expiresAt = Date.now() + g.expiresIn * 1000;
            }),
          ),
        };
        // Drop the cached promise if opening fails, so the next call retries.
        entry.array.catch(() => {
          if (openByStoreId.get(store.id) === entry) {
            openByStoreId.delete(store.id);
            set(s => ({ openStoreIds: s.openStoreIds.filter(id => id !== store.id) }));
          }
        });
        openByStoreId.set(store.id, entry);
        set(s =>
          s.openStoreIds.includes(store.id)
            ? s
            : { openStoreIds: [...s.openStoreIds, store.id] },
        );
        return entry.array;
      },

      readWindow: async (store, ranges = [], opts = {}) => {
        const array = await get_().getArray(store);
        // A scene with many views reissues a read per view on every band
        // crossing; an abandoned window that still resolves wastes the fetch and
        // races the buffer write that replaced it.
        opts.signal?.throwIfAborted();
        return readArrayWindow(array, ranges, {
          pool: workerPool,
          cache: CHUNK_CACHE,
          priority: opts.priority ?? INTERACTIVE_FETCH_PRIORITY,
          signal: opts.signal,
        });
      },

      invalidate: () => {
        grant = null;
        openByStoreId.clear();
        set({ openStoreIds: [] });
      },
    };
  });
};

export type ElektroZarrStore = ReturnType<typeof createElektroZarrStore>;

const {
  StoreContext: ElektroZarrStoreContext,
  useScopedStore: useElektroZarrStore,
  useStoreApi: useElektroZarrStoreApi,
} = createScopedStoreHooks<ElektroZarrState>("ElektroZarrStore");

export { ElektroZarrStoreContext, useElektroZarrStore, useElektroZarrStoreApi };
