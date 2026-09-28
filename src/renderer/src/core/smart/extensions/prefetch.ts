import type { ApolloClient } from "@apollo/client";
import type { SmartContextSection, SmartPrefetchTarget } from "./section";

/**
 * Warms the Apollo cache for the menu's sections before it opens (a hovered
 * card, a changed selection). Each section says what to warm
 * (`SmartContextSection.prefetch`, built with the same variables its
 * `useItems` uses), so the open-time hooks render the warmed rows
 * synchronously and refetch behind. This file knows no module: it owns the
 * TTL, the dedupe and asking the right service's client.
 *
 * Keys are remembered for a while so scrolling a grid of sixty cards does not
 * issue sixty no-op `client.query` calls; freshness is the hook's business.
 */

export type PrefetchClient = Pick<ApolloClient<object>, "query">;
export type PrefetchTarget = SmartPrefetchTarget;

export type SmartPrefetcher = {
  prefetch: (target: PrefetchTarget) => void;
  clear: () => void;
  /** For tests: keys currently remembered. */
  keys: () => string[];
};

export const PREFETCH_TTL_MS = 60_000;
export const PREFETCH_MAX_KEYS = 200;

/** Key-sorted JSON, so equal variables dedupe however they were built. */
const stableJson = (value: unknown): string =>
  JSON.stringify(value, (_key, inner) =>
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : inner,
  );

export const createSmartPrefetcher = (options: {
  /** The registered sections, re-read per call (modules come and go). */
  getSections: () => readonly SmartContextSection<any>[];
  /** A READY service's client, re-read per call: a service can come up later. */
  getClient: (service: string) => PrefetchClient | undefined;
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

  return {
    prefetch(target) {
      if (target.objects.length === 0) return;
      for (const section of options.getSections()) {
        for (const { service, name, query, variables } of section.prefetch?.(target) ?? []) {
          const client = options.getClient(service);
          if (!client) continue;
          const key = `${section.id}:${name}:${stableJson(variables)}`;
          const last = seen.get(key);
          if (last !== undefined && now() - last < ttl) continue;
          remember(key);
          client
            .query({ query, variables, fetchPolicy: "cache-first", errorPolicy: "ignore" })
            // A failed warm-up should retry next time, not be remembered as done.
            .catch(() => seen.delete(key));
        }
      }
    },
    clear() {
      seen.clear();
    },
    keys: () => [...seen.keys()],
  };
};
