import { serviceGuard, useServiceClient } from "@/core/lib/arkitekt/host";
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
import { onApolloError } from "@/core/lib/errorHandler";


/**
 * kabinet's own service binding: its client (fakts key "kabinet") and the guard
 * that mounts children only while that service is ready (CLAUDE.md §1).
 */
export const useKabinet = () => useServiceClient("kabinet");
export const KabinetGuard = serviceGuard("kabinet");

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
  const kabinet = useKabinet();

  return useApolloMutation(doc, {
    ...options,
    client: kabinet,
    onError: onApolloError("kabinet"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const kabinet = useKabinet();

  return useApolloQuery(doc, { ...options, client: kabinet });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const kabinet = useKabinet();

  return useApolloSubscription(doc, { ...options, client: kabinet });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const kabinet = useKabinet();

  return useApolloLazyQuery(doc, { ...options, client: kabinet });
};
