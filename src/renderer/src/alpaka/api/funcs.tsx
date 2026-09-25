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
 * alpaka's own service binding: its client (fakts key "alpaka") and the guard
 * that mounts children only while that service is ready (CLAUDE.md §1).
 */
export const useAlpaka = () => useServiceClient("alpaka");
export const AlpakaGuard = serviceGuard("alpaka");

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
  const kraph = useAlpaka();

  return useApolloMutation(doc, {
    ...options,
    client: kraph,
    onError: onApolloError("alpaka"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const kraph = useAlpaka();

  return useApolloQuery(doc, { ...options, client: kraph });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const kraph = useAlpaka();

  return useApolloSubscription(doc, { ...options, client: kraph });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const kraph = useAlpaka();

  return useApolloLazyQuery(doc, { ...options, client: kraph });
};
