import { serviceGuard, useServiceClient } from "@/core/connection/arkitekt/host";
import {
  LazyQueryHookOptions,
  MutationHookOptions,
  QueryHookOptions,
  SubscriptionHookOptions,
  useLazyQuery as useApolloLazyQuery,
  useMutation as useApolloMutation,
  useQuery as useApolloQuery,
  useSubscription as useApolloSubscription,
} from "@apollo/client";
import { onApolloError } from "@/core/connection/graphql/errorHandler";


/**
 * lokate's own service binding: its client (fakts key "lokate") and the guard
 * that mounts children only while that service is ready (CLAUDE.md §1).
 */
export const useLokate = () => useServiceClient("lokate");
export const LokateGuard = serviceGuard("lokate");

type MutationFuncType = typeof useApolloMutation;
type QueryFuncType = typeof useApolloQuery;
type LazyQueryFuncType = typeof useApolloLazyQuery;
type SubscriptionFuncType = typeof useApolloSubscription;

export type {
  LazyQueryHookOptions,
  MutationHookOptions,
  QueryHookOptions,
  SubscriptionHookOptions
};

export const useMutation: MutationFuncType = (doc, options) => {
  const client = useLokate();

  return useApolloMutation(doc, {
    ...options,
    client,
    onError: onApolloError("lokate"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const client = useLokate();

  return useApolloQuery(doc, { ...options, client });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const client = useLokate();

  return useApolloSubscription(doc, { ...options, client });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const client = useLokate();

  return useApolloLazyQuery(doc, { ...options, client });
};
