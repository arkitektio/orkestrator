import type { ApolloClient, DocumentNode } from "@apollo/client";
import { AllPrimaryActionsDocument, ShortcutsDocument } from "@/rekuest/api/graphql";
import type { Structure } from "@/types";
import { buildDemands } from "./demands";
import { actionsVariables, shortcutsVariables } from "@/rekuest/smart/queries";

/**
 * Warms the Apollo cache for the two sections that carry the menu — primary
 * actions and shortcuts — before the menu opens (a hovered card, a changed
 * selection). The open-time hooks run `cache-and-network` with the very same
 * variables, so they render the warmed rows synchronously and refetch behind.
 *
 * Keys are remembered for a while so scrolling a grid of sixty cards does not
 * issue sixty no-op `client.query` calls; freshness is the hook's business.
 */

export type PrefetchClient = Pick<ApolloClient<object>, "query">;
export type PrefetchClients = { rekuest?: PrefetchClient };
export type PrefetchTarget = {
  objects: Structure[];
  partners?: Structure[];
  collection?: string;
};

export type SmartPrefetcher = {
  prefetch: (target: PrefetchTarget) => void;
  clear: () => void;
  /** For tests: keys currently remembered. */
  keys: () => string[];
};

export const PREFETCH_TTL_MS = 60_000;
export const PREFETCH_MAX_KEYS = 200;

export const createSmartPrefetcher = (options: {
  /** Re-evaluated per call: a service can become ready later. */
  getClients: () => PrefetchClients;
  now?: () => number;
  ttlMs?: number;
  maxKeys?: number;
}): SmartPrefetcher => {
  const now = options.now ?? Date.now;
  const ttl = options.ttlMs ?? PREFETCH_TTL_MS;
  const maxKeys = options.maxKeys ?? PREFETCH_MAX_KEYS;
  // Insertion order = recency, so the first key is the oldest.
  const seen = new Map<string, number>();

  const remember = (key: string) => {
    seen.delete(key);
    seen.set(key, now());
    while (seen.size > maxKeys) {
      const oldest = seen.keys().next().value;
      if (oldest === undefined) break;
      seen.delete(oldest);
    }
  };

  const warm = (
    client: PrefetchClient,
    name: string,
    query: DocumentNode,
    variables: Record<string, unknown>,
    demandKey: string,
    collection: string | undefined,
  ) => {
    const key = `${name}:${demandKey}:${collection ?? ""}`;
    const last = seen.get(key);
    if (last !== undefined && now() - last < ttl) return;
    remember(key);
    client
      .query({ query, variables, fetchPolicy: "cache-first", errorPolicy: "ignore" })
      // A failed warm-up should retry next time, not be remembered as done.
      .catch(() => seen.delete(key));
  };

  return {
    prefetch(target) {
      if (target.objects.length === 0) return;
      const client = options.getClients().rekuest;
      if (!client) return;
      const demands = buildDemands(target);
      warm(
        client,
        "actions",
        AllPrimaryActionsDocument,
        actionsVariables(demands.single, { collection: target.collection }),
        demands.key,
        target.collection,
      );
      warm(
        client,
        "shortcuts",
        ShortcutsDocument,
        shortcutsVariables(demands.single),
        demands.key,
        undefined,
      );
    },
    clear() {
      seen.clear();
    },
    keys: () => [...seen.keys()],
  };
};
