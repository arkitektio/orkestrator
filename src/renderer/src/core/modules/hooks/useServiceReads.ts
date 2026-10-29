import { gql } from "@apollo/client";
import { useMemo } from "react";

import { Arkitekt } from "@/core/connection/arkitekt/host";
import { resolveServiceClient } from "@/core/modules/host/operations";
import type { BlokReadExecutor } from "@arkitektio/bsx/renderer/runtime/reads";

/**
 * Runs a blok's declared reads (`queries`, `subscriptions`) on the session's
 * client for their service. The blok runtime checks that a query is a query and
 * a subscription a subscription before anything is sent; this only runs them.
 * Never from the cache: nothing here knows how their fields merge.
 */
export const useServiceReads = (): BlokReadExecutor => {
  const store = Arkitekt.useStoreApi();

  return useMemo<BlokReadExecutor>(
    () => ({
      query: async (service, document, variables, signal) => {
        const client = resolveServiceClient(store.getState(), service);
        if (!client) throw new Error(`The ${service} service is not connected.`);
        const result = await client.query({
          query: gql(document),
          variables,
          fetchPolicy: "no-cache",
          context: { fetchOptions: { signal } },
        });
        return (result.data ?? {}) as Record<string, unknown>;
      },
      subscribe: (service, document, variables, sink) => {
        const client = resolveServiceClient(store.getState(), service);
        if (!client) {
          sink.error(new Error(`The ${service} service is not connected.`));
          return () => undefined;
        }
        const subscription = client
          .subscribe({ query: gql(document), variables, fetchPolicy: "no-cache" })
          .subscribe({
            next: (result) => sink.next((result.data ?? {}) as Record<string, unknown>),
            error: (error: unknown) => sink.error(error),
            complete: () => sink.complete(),
          });
        return () => subscription.unsubscribe();
      },
    }),
    [store],
  );
};
