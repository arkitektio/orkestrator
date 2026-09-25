import { useKabinet } from "@/core/app/Arkitekt";
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
