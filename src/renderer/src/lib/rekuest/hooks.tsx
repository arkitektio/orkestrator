import { useRekuest } from "@/app/Arkitekt";
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
import { onApolloError } from "../errorHandler";

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
  const rekuest = useRekuest();

  return useApolloMutation(doc, {
    ...options,
    client: rekuest,
    onError: onApolloError("rekuest"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const rekuest = useRekuest();

  // Defaults, not overrides: a mount still revalidates against the network
  // (`cache-and-network`), but subsequent variable changes are served from the
  // cache when the entry exists (`cache-first`) instead of refetching every
  // time. Call sites may override either policy through `options`.
  return useApolloQuery(doc, {
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    ...options,
    client: rekuest,
  });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const rekuest = useRekuest();

  return useApolloSubscription(doc, { ...options, client: rekuest });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const rekuest = useRekuest();

  return useApolloLazyQuery(doc, { ...options, client: rekuest });
};
