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
 * dokuments's own service binding: its client (fakts key "dokuments") and the guard
 * that mounts children only while that service is ready (CLAUDE.md §1).
 */
export const useDokuments = () => useServiceClient("dokuments");
export const DokumentsGuard = serviceGuard("dokuments");

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
  const kraph = useDokuments();

  return useApolloMutation(doc, {
    ...options,
    client: kraph,
    onError: onApolloError("dokuments"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const kraph = useDokuments();

  return useApolloQuery(doc, { ...options, client: kraph });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const kraph = useDokuments();

  return useApolloSubscription(doc, { ...options, client: kraph });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const kraph = useDokuments();

  return useApolloLazyQuery(doc, { ...options, client: kraph });
};
