import { useDebugReport } from "@/core/debug/useDebugReport";
import {
  ApolloQueryResult,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
  SubscribeToMoreOptions,
} from "@apollo/client";
import React from "react";
import { useParams } from "react-router-dom";
import { NotFound } from "../fallbacks/NotFound";
import { renderQueryState } from "./queryState";

export type DetailVariables = {
  id: string;
} & OperationVariables;

export type DetailRoute = {
  fallback: React.ReactNode;
};

export type DetailRouteProps<T> = {
  data: QueryResult<T, DetailVariables>;
};

export type HookFunction<T, Y extends DetailVariables> = (
  options: QueryHookOptions<T, Y>,
) => QueryResult<T, Y>;

export const asDetailQueryRoute = <T extends any>(
  hook: HookFunction<T, DetailVariables>,
  Component: React.FC<{
    id: string;
    data: T;
    refetch: (
      variables?: Partial<DetailVariables> | undefined,
    ) => Promise<ApolloQueryResult<T>>;
    subscribeToMore: <
      TSubscriptionData = T,
      TSubscriptionVariables extends OperationVariables = DetailVariables,
    >(
      options: SubscribeToMoreOptions<
        T,
        TSubscriptionVariables,
        TSubscriptionData
      >,
    ) => () => void;
  }>,
  options: {
    fallback?: React.ReactNode;
    queryOptions?: QueryHookOptions<T, DetailVariables>;
  } = {},
) => {
  return ({ direct }: { direct?: any | undefined }) => {
    const { id } = useParams<{ id: string }>();
    const passyProps =
      direct ||
      hook({
        variables: { id: id ?? "" },
        ...options.queryOptions,
        // A missing id is a misconfigured route, not a query to run. The hook
        // is still CALLED (with skip) so the hook order is the same on every
        // render — the report hook below runs regardless.
        skip: Boolean(options.queryOptions?.skip) || (!id && direct == undefined),
      });
    useDebugReport(Component.displayName ?? Component.name ?? "page", {
      variables: { id: id ?? "" },
      data: passyProps.data,
      error: passyProps.error,
      loading: passyProps.loading,
    });

    // No id in the path: there is no object this route could be about.
    if (!id && direct == undefined) return options.fallback ?? <NotFound />;

    // Only bail out when there is genuinely nothing to render. Under the
    // default `errorPolicy: "none"` Apollo discards `data` whenever any
    // GraphQL error is present, so this is IDENTICAL to `if (error)` for
    // every route that does not opt in. It is what lets a route set
    // `errorPolicy: "all"` and keep rendering: a single nullable field whose
    // resolver threw (e.g. `Layer.asAffine` on a displacement-registered
    // layer, which errors rather than returning null) nulls that one field
    // instead of blanking the whole page, and the consumer degrades.
    const state = renderQueryState(passyProps);
    if (state !== undefined) return state;

    return <Component {...passyProps} id={id ?? ""} />;
  };
};
