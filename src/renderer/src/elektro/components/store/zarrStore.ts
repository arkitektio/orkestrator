import { ApolloClient, NormalizedCache } from "@apollo/client";
import { S3FetchConfig } from "@/lib/zarr/runner/s3-request";
import { ConfiguredS3Store } from "@/lib/zarr/store/s3Store";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";
import { ZarrStore } from "@/lib/zarr/store/types";
import { Array as ZarrArray, Chunk, DataType, get, open } from "zarrita";
import { createStore } from "zustand/vanilla";
import {
  GeneralZarrAccessGrantFragment,
  RequestGeneralZarrAccessDocument,
  RequestGeneralZarrAccessMutation,
  RequestGeneralZarrAccessMutationVariables,
  ZarrStoreFragment,
} from "../../api/graphql";

type ElektroClient = ApolloClient<NormalizedCache>;

type OpenedZarrArray = ZarrArray<DataType, ZarrStore>;

// --- Selection / result types (shared with useTraceArray) ---

export type Slice = {
  _slice: true;
  step: number | null;
  start: number | null;
  stop: number | null;
};

export type ArraySelection = Slice[];

export type DownloadedArray = {
  shape: [number, number, number, number, number];
  out: Chunk<DataType>;
  selection: ArraySelection;
  tSize: number;
  cSize: number;
  dtypeMin: number;
  dtypeMax: number;
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
  /** Open the array and read a selection out of it. */
  getSelection: (
    store: ZarrStoreFragment,
    selection: ArraySelection,
    signal?: AbortSignal,
  ) => Promise<DownloadedArray>;

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
      return open.v3(s3, { kind: "array" }) as Promise<OpenedZarrArray>;
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

      getSelection: async (store, selection, _signal) => {
        const array = await get_().getArray(store);
        const view = (await get(array, selection)) as Chunk<DataType>;
        return {
          shape: array.shape as [number, number, number, number, number],
          out: view,
          selection,
          dtypeMin: 0,
          dtypeMax: 255,
          tSize: array.shape[1],
          cSize: array.shape[0],
        };
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
