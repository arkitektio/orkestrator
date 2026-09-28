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
 * kuvert's own service binding: its client (fakts key "kuvert") and the guard
 * that mounts children only while that service is ready (CLAUDE.md §1).
 */
export const useKuvert = () => useServiceClient("kuvert");
export const KuvertGuard = serviceGuard("kuvert");

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
  const client = useKuvert();

  return useApolloMutation(doc, {
    ...options,
    client,
    onError: onApolloError("kuvert"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const client = useKuvert();

  return useApolloQuery(doc, { ...options, client });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const client = useKuvert();

  return useApolloSubscription(doc, { ...options, client });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const client = useKuvert();

  return useApolloLazyQuery(doc, { ...options, client });
};
