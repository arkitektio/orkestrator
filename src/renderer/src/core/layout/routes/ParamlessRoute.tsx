import { useDebugReport } from "@/core/debug/useDebugReport";
import {
  ApolloQueryResult,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
  SubscribeToMoreOptions,
} from "@apollo/client";
import React from "react";
import { renderQueryState } from "./queryState";

export type ParamlessVariables = OperationVariables;

export type ParamlessRoute = {
  fallback: React.ReactNode;
};

export type DetailRouteProps<T> = {
  data: QueryResult<T, ParamlessVariables>;
};

export type HookFunction<T, Y extends ParamlessVariables> = (
  options: QueryHookOptions<T, Y>,
) => QueryResult<T, Y>;

export const asParamlessRoute = <T extends unknown>(
  hook: HookFunction<T, ParamlessVariables>,
  Component: React.FC<{
    data: T;
    refetch: (
      variables?: Partial<ParamlessVariables> | undefined,
    ) => Promise<ApolloQueryResult<T>>;
    subscribeToMore: <
      TSubscriptionData = T,
      TSubscriptionVariables extends OperationVariables = ParamlessVariables,
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
    queryOptions?: QueryHookOptions<T, ParamlessVariables>;
  } = {},
) => {
  return ({ direct }: { direct?: any | undefined }) => {
    const passyProps =
      direct ||
      hook({
        ...options.queryOptions,
      });
    useDebugReport(Component.displayName ?? Component.name ?? "page", {
      variables: options.queryOptions?.variables,
      data: passyProps.data,
      error: passyProps.error,
      loading: passyProps.loading,
    });

    const state = renderQueryState(passyProps);
    if (state !== undefined) return state;

    return <Component {...passyProps} />;
  };
};
