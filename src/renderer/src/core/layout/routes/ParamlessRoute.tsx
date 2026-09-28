import { useDebugReport } from "@/core/debug/useDebugReport";
import {
  ApolloQueryResult,
  DocumentNode,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
  SubscribeToMoreOptions,
  useQuery,
} from "@apollo/client";
import React from "react";
import { ErrorPage } from "../fallbacks/ErrorPage";
import { LoadingPage } from "../fallbacks/LoadingPage";

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

export const DetailRoute: React.FC<{}> = () => {
  return (
    <div>
      <h1>DetailRoute</h1>
    </div>
  );
};

export const PassedDownComponent = <T extends DocumentNode>(props: {
  component: React.FC<{ data: T }>;
  document: T;
  modifier: (query: any) => any;
  variables: { id: string };
}) => {
  const { data, errors } = props.modifier(useQuery(props.document))({
    variables: props.variables,
  });

  return errors ? <>{errors}</> : props.component({ data: data });
};

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
  } = { fallback: <></> },
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

    if (passyProps.error) {
      return <ErrorPage error={passyProps.error} />;
    }

    if (passyProps.loading) return <LoadingPage />;

    if (passyProps && passyProps.data) {
      return <Component {...passyProps} />;
    }

    return null;
  };
};
