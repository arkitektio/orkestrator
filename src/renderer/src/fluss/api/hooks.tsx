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
 * fluss's own service binding: its client (fakts key "fluss") and the guard
 * that mounts children only while that service is ready (CLAUDE.md §1).
 */
export const useFluss = () => useServiceClient("fluss");
export const FlussGuard = serviceGuard("fluss");

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
  const fluss = useFluss();

  return useApolloMutation(doc, {
    ...options,
    client: fluss,
    onError: onApolloError("fluss"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const fluss = useFluss();

  return useApolloQuery(doc, { ...options, client: fluss });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const fluss = useFluss();

  return useApolloSubscription(doc, { ...options, client: fluss });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const fluss = useFluss();

  return useApolloLazyQuery(doc, { ...options, client: fluss });
};
