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
 * bank's own service binding: its client (fakts key "bank") and the guard
 * that mounts children only while that service is ready (CLAUDE.md §1).
 */
export const useBank = () => useServiceClient("bank");
export const BankGuard = serviceGuard("bank");

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
  const client = useBank();

  return useApolloMutation(doc, {
    ...options,
    client,
    onError: onApolloError("bank"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const client = useBank();

  return useApolloQuery(doc, { ...options, client });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const client = useBank();

  return useApolloSubscription(doc, { ...options, client });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const client = useBank();

  return useApolloLazyQuery(doc, { ...options, client });
};
