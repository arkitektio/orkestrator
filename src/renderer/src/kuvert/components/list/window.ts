import type { OperationVariables, WatchQueryFetchPolicy } from "@apollo/client";

/**
 * A list shown as a window `[0, n)` that grows a page at a time ("Load more").
 *
 * kuvert answers at most 100 rows a page and says nothing when it cuts one,
 * so the window is never asked for whole: each new page is
 * `fetchMore({ offset: shown, limit: PAGE })`, lands in the offset-indexed
 * cache entry (`buildCappedOffsetPaginationPolicies`), and the grown window
 * is then read from the cache.
 */
export const PAGE = 50;

type Paged = OperationVariables & { pagination?: { offset?: number | null; limit?: number | null } | null };

/**
 * `nextFetchPolicy` for such a list: a variables change that only grows the
 * window past the first page reads the cache (the page is there already);
 * any other change (a filter, the first page) goes back to the query's own
 * policy.
 */
export const windowFetchPolicy = (
  current: WatchQueryFetchPolicy,
  context: { reason: "after-fetch" | "variables-changed"; options: { variables?: Paged }; initialFetchPolicy: WatchQueryFetchPolicy },
): WatchQueryFetchPolicy => {
  if (context.reason !== "variables-changed") return current;
  const window = context.options.variables?.pagination?.limit;
  return typeof window === "number" && window > PAGE ? "cache-first" : context.initialFetchPolicy;
};

/**
 * Whether "Load more" has anything to load: fewer rows than the count says,
 * or (without a count) a window the server filled to the brim.
 */
export const hasMore = (loaded: number, window: number, total?: number | null) =>
  total != null ? loaded < total : loaded >= window;
