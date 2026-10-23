import { gql } from "@apollo/client";
import { useCallback } from "react";

import { Arkitekt } from "@/core/connection/arkitekt/host";
import { resolveServiceClient } from "@/core/modules/host/operations";
import { readOnlyQueryProblem } from "@/core/ports/engine/constraints";

/**
 * Runs a GraphQL query, given as text, against one service with the session's
 * client for it: `useServiceQuery("mikro")(query, variables)`. For a query
 * that arrives as data (an app's widget, a blok), not one this app wrote.
 *
 * Never from the cache: such a query is asked to find what was just made, and
 * nothing here knows how its fields merge.
 *
 * Reads only. A document holding a mutation or a subscription is refused here,
 * the one door every data-borne query goes through (`readOnlyQueryProblem`):
 * whatever changes something goes through an action.
 */
export const useServiceQuery = (service: string | undefined) => {
  const store = Arkitekt.useStoreApi();

  return useCallback(
    async (query: string, variables: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (!service) throw new Error("No service named to run the query on.");
      const problem = readOnlyQueryProblem(query);
      if (problem) throw new Error(problem);
      const client = resolveServiceClient(store.getState(), service);
      if (!client) throw new Error(`The ${service} service is not connected.`);
      const result = await client.query({ query: gql(query), variables, fetchPolicy: "no-cache" });
      return (result.data ?? {}) as Record<string, unknown>;
    },
    [store, service],
  );
};
