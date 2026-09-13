import { useMikro } from "@/app/Arkitekt";
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
  const mikro = useMikro();

  return useApolloMutation(doc, {
    ...options,
    client: mikro,
    onError: onApolloError("mikro"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const mikro = useMikro();

  // Defaults, not overrides: a mount still revalidates against the network
  // (`cache-and-network`), but subsequent variable changes are served from the
  // cache when the entry exists (`cache-first`) instead of refetching every
  // time. Call sites may override either policy through `options`.
  return useApolloQuery(doc, {
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    ...options,
    client: mikro,
  });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const mikro = useMikro();

  return useApolloSubscription(doc, { ...options, client: mikro });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const mikro = useMikro();

  return useApolloLazyQuery(doc, { ...options, client: mikro });
};
