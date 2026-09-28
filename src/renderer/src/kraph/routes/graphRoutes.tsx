import { ErrorPage } from "@/core/layout/fallbacks/ErrorPage";
import { LoadingPage } from "@/core/layout/fallbacks/LoadingPage";
import type { DetailVariables, HookFunction } from "@/core/layout/routes/DetailQueryRoute";
import { useDebugReport } from "@/core/debug/useDebugReport";
import { ApolloQueryResult, OperationVariables, QueryHookOptions } from "@apollo/client";
import React from "react";
import { useParams } from "react-router-dom";
import { useGraphScope } from "../providers/GraphScopeProvider";

/*
 * Kraph's page builders for reads scoped to one graph: siblings of the host's
 * `asDetailQueryRoute`, which stays single-variable and knows no graphs.
 */

/**
 * `asDetailQueryRoute` for the graph a route is scoped to.
 *
 * The layout route is `graphs/:graph`, so a page rendered *as its index* has no
 * `:id` segment of its own — the graph's id is the scope, not a path param.
 * `asDetailQueryRoute` reads `useParams().id`, finds nothing, and returns its
 * fallback without ever firing the query, which is a blank page.
 *
 * A sibling rather than a widening, for the same reason as
 * `asGraphDetailQueryRoute`: the single-variable shape is load-bearing for the
 * ~40 pages that address a claim by a path id.
 */
export const asGraphScopeQueryRoute = <T extends any>(
  hook: HookFunction<T, DetailVariables>,
  Component: React.FC<{
    id: string;
    data: T;
    refetch: (
      variables?: Partial<DetailVariables> | undefined,
    ) => Promise<ApolloQueryResult<T>>;
  }>,
  options: {
    fallback?: React.ReactNode;
    queryOptions?: QueryHookOptions<T, DetailVariables>;
  } = { fallback: <></> },
) => {
  return () => {
    const scope = useGraphScope();
    const graphId = scope?.graphId;

    const query = hook({
      variables: { id: graphId ?? "" },
      skip: !graphId,
      ...options.queryOptions,
    });
    useDebugReport(Component.displayName ?? Component.name ?? "page", {
      variables: { id: graphId ?? "" },
      data: query.data,
      error: query.error,
      loading: query.loading,
    });

    if (!graphId) {
      return options.fallback ?? <> This route is illconfigured</>;
    }

    if (query.error) {
      return <ErrorPage error={query.error} />;
    }

    const data = query.data;
    if (!data) return <LoadingPage />;

    return (
      <Component {...query} data={data} id={graphId} />
    );
  };
};

export type GraphDetailVariables = {
  id: string;
  graph: string;
} & OperationVariables;

/**
 * `asDetailQueryRoute` for a read that is scoped to one graph.
 *
 * Kraph's view-grain reads take `(id, graph)`: a claim is organization-grain and
 * a *drawing* of it exists only inside a graph, so `entity(id:, graph:)` refuses
 * a node the named view does not admit. The id comes from the path as usual; the
 * graph comes from `GraphScopeProvider`, which the `graphs/:graph` layout route
 * installs.
 *
 * A sibling rather than a widening of `asDetailQueryRoute` on purpose — around
 * forty non-kraph pages depend on that one's single-variable shape.
 */
export const asGraphDetailQueryRoute = <T extends any>(
  hook: HookFunction<T, GraphDetailVariables>,
  Component: React.FC<{
    id: string;
    graph: string;
    data: T;
    refetch: (
      variables?: Partial<GraphDetailVariables> | undefined,
    ) => Promise<ApolloQueryResult<T>>;
  }>,
  options: {
    fallback?: React.ReactNode;
    queryOptions?: QueryHookOptions<T, GraphDetailVariables>;
  } = { fallback: <></> },
) => {
  return ({ direct }: { direct?: any | undefined }) => {
    const { id } = useParams<{ id: string }>();
    const scope = useGraphScope();
    const misconfigured = (!id || !scope) && direct == undefined;

    const passyProps =
      direct ||
      hook({
        variables: { id: id ?? "", graph: scope?.graphId ?? "" },
        ...options.queryOptions,
        skip: Boolean(options.queryOptions?.skip) || misconfigured,
      });
    useDebugReport(Component.displayName ?? Component.name ?? "page", {
      variables: { id: id ?? "", graph: scope?.graphId ?? "" },
      data: passyProps.data,
      error: passyProps.error,
      loading: passyProps.loading,
    });

    if (misconfigured) {
      return options.fallback ?? <> This route is illconfigured</>;
    }

    if (passyProps.error) {
      return <ErrorPage error={passyProps.error} />;
    }

    if (passyProps.loading && !passyProps.data) return <LoadingPage />;

    if (passyProps && passyProps.data) {
      return (
        <Component
          {...passyProps}
          id={id ?? ""}
          graph={scope?.graphId ?? ""}
        />
      );
    }

    return null;
  };
};
