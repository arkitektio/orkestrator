import { Arkitekt } from "@/app/Arkitekt";
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
import { onApolloError } from "@/lib/errorHandler";

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
  const lok = Arkitekt.useSelfService();

  return useApolloMutation(doc, {
    ...options,
    client: lok?.client,
    onError: onApolloError("lok"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const lok = Arkitekt.useSelfService();

  return useApolloQuery(doc, { ...options, client: lok?.client });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const lok = Arkitekt.useSelfService();

  return useApolloSubscription(doc, { ...options, client: lok?.client });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const lok = Arkitekt.useSelfService();

  return useApolloLazyQuery(doc, { ...options, client: lok?.client });
};
