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
 * omeroark's own service binding: its client (fakts key "omero_ark") and the guard
 * that mounts children only while that service is ready (CLAUDE.md §1).
 */
export const useOmeroArk = () => useServiceClient("omero_ark");
export const OmeroArkGuard = serviceGuard("omero_ark");

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
  const kraph = useOmeroArk();

  return useApolloMutation(doc, {
    ...options,
    client: kraph,
    onError: onApolloError("kraph"),
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const kraph = useOmeroArk();

  return useApolloQuery(doc, { ...options, client: kraph });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const kraph = useOmeroArk();

  return useApolloSubscription(doc, { ...options, client: kraph });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const kraph = useOmeroArk();

  return useApolloLazyQuery(doc, { ...options, client: kraph });
};
