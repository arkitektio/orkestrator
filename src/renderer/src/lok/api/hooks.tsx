import { useSelfClient } from "@/core/connection/arkitekt/host";
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


/** lok is the session's own service: its client is the self service's. */
export const useLok = () => useSelfClient();

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
  const lok = { client: useLok() };

  return useApolloMutation(doc, {
    ...options,
    client: lok?.client,
    onError: onApolloError("lok"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const lok = { client: useLok() };

  return useApolloQuery(doc, { ...options, client: lok?.client });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const lok = { client: useLok() };

  return useApolloSubscription(doc, { ...options, client: lok?.client });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const lok = { client: useLok() };

  return useApolloLazyQuery(doc, { ...options, client: lok?.client });
};
