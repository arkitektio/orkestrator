import type { ReactNode } from "react";
import { QueryError } from "../fallbacks/ErrorPage";
import { LoadingPage } from "../fallbacks/LoadingPage";

/**
 * What a query-backed route shows while it has no data: the one ladder every
 * route builder (`asDetailQueryRoute`, `asParamlessRoute`, kraph's graph
 * routes) climbs. Returns `undefined` when there is data to render.
 *
 * Both rungs wait for "no data": under `errorPolicy: "all"` a route keeps its
 * page when one nullable field failed, and a refetch does not tear the page
 * down to the loader.
 */
export const renderQueryState = (query: {
  data?: unknown;
  error?: unknown;
  loading?: boolean;
  refetch?: () => unknown;
}): ReactNode | undefined => {
  if (query.data) return undefined;
  if (query.error) {
    const refetch = query.refetch;
    return <QueryError error={query.error} onRetry={refetch ? () => refetch() : undefined} />;
  }
  if (query.loading) return <LoadingPage />;
  return null;
};
