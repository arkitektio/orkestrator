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


/**
 * lovekit's own service binding: its client (fakts key "lovekit") and the guard
 * that mounts children only while that service is ready (CLAUDE.md §1).
 */
export const useLovekit = () => useServiceClient("lovekit");
export const LovekitGuard = serviceGuard("lovekit");

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

// No `onError`: a failed mutation rejects, and its caller reports it — inline
// in a dialog (`useDialogSubmit`), else `reportErrorAs` (CLAUDE.md §8).
export const useMutation: MutationFuncType = (doc, options) => {
  const kraph = useLovekit();

  return useApolloMutation(doc, {
    ...options,
    client: kraph,
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const kraph = useLovekit();

  return useApolloQuery(doc, { ...options, client: kraph });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const kraph = useLovekit();

  return useApolloSubscription(doc, { ...options, client: kraph });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const kraph = useLovekit();

  return useApolloLazyQuery(doc, { ...options, client: kraph });
};
