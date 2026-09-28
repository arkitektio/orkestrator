import type { ApolloClient, NormalizedCache } from "@apollo/client";
import type { SparseStoreAccess } from "@/core/data/sparse/sparseReader";
import {
  RequestGeneralSparseAccessDocument,
  type RequestGeneralSparseAccessMutation,
  type RequestGeneralSparseAccessMutationVariables,
} from "../../api/graphql";

type ElektroClient = ApolloClient<NormalizedCache>;

/**
 * Elektro's credentials for sparse stores (spike sets), for the shared reader
 * in `@/lib/sparse/sparseReader`.
 *
 * One GENERAL sparse grant — bucket-wide, so it covers every sparse store —
 * cached until shortly before it runs out and refetched on `forceRefresh` (S3
 * rejected a grant still believed valid). Memoized per client and datalayer, so
 * every raster shares one grant and one rotation.
 */

const REFRESH_MARGIN_MS = 30_000;

type CachedGrant = {
  promise: Promise<RequestGeneralSparseAccessMutation["requestGeneralSparseAccess"]>;
  expiresAt: number;
};

const byClient = new WeakMap<ElektroClient, Map<string, SparseStoreAccess>>();

export const elektroSparseAccess = (client: ElektroClient, datalayer: string): SparseStoreAccess => {
  let byDatalayer = byClient.get(client);
  if (!byDatalayer) {
    byDatalayer = new Map();
    byClient.set(client, byDatalayer);
  }
  const existing = byDatalayer.get(datalayer);
  if (existing) return existing;

  let grant: CachedGrant | null = null;
  const ensureGrant = (forceRefresh = false) => {
    if (!forceRefresh && grant && Date.now() < grant.expiresAt - REFRESH_MARGIN_MS) {
      return grant.promise;
    }
    const promise = client
      .mutate<RequestGeneralSparseAccessMutation, RequestGeneralSparseAccessMutationVariables>({
        mutation: RequestGeneralSparseAccessDocument,
        variables: { input: {} },
      })
      .then((result) => {
        const g = result.data?.requestGeneralSparseAccess;
        if (!g) throw new Error("Failed to obtain sparse access credentials");
        return g;
      });
    const entry: CachedGrant = { promise, expiresAt: Number.POSITIVE_INFINITY };
    grant = entry;
    promise
      .then((g) => {
        entry.expiresAt = Date.now() + g.expiresIn * 1000;
      })
      .catch(() => {
        if (grant === entry) grant = null;
      });
    return promise;
  };

  const access: SparseStoreAccess = {
    namespace: `elektro:${datalayer}`,
    configFor: async (store, options) => {
      const g = await ensureGrant(options?.forceRefresh ?? false);
      return {
        accessKey: g.accessKey,
        secretKey: g.secretKey,
        sessionToken: g.sessionToken,
        region: g.region,
        expiresAt: Date.now() + g.expiresIn * 1000,
        storeId: store.id,
        baseUrl: `${datalayer.replace(/\/$/, "")}/${g.bucket}/${store.key}`,
      };
    },
  };
  byDatalayer.set(datalayer, access);
  return access;
};
