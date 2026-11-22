import type { OperationVariables, WatchQueryFetchPolicy } from "@apollo/client";

/**
 * A list shown as a window `[0, n)` that grows a page at a time ("Show more").
 *
 * lok caps every page at 100 rows (strawberry_django's `PAGINATION_MAX_LIMIT`)
 * and says nothing when it does, so the window is never asked for whole: each
 * new page comes with `fetchMore({ offset, limit: page })`, lands in the
 * offset-indexed cache entry (`offsetPaginationPolicy`), and the grown window
 * is then read from the cache. This is the `nextFetchPolicy` that makes that
 * read a cache read: a variables change that only grows the window past the
 * first page goes `cache-first`; any other change (a filter, the first page)
 * goes back to the query's own policy.
 */
export const growingWindowFetchPolicy =
  <TVariables extends OperationVariables>(windowOf: (variables: TVariables | undefined) => number | undefined, firstPage: number) =>
  (
    current: WatchQueryFetchPolicy,
    context: { reason: "after-fetch" | "variables-changed"; options: { variables?: TVariables }; initialFetchPolicy: WatchQueryFetchPolicy },
  ): WatchQueryFetchPolicy => {
    if (context.reason !== "variables-changed") return current;
    const window = windowOf(context.options.variables);
    return window !== undefined && window > firstPage ? "cache-first" : context.initialFetchPolicy;
  };
