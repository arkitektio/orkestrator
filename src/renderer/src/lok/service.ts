import { LOK_TYPE_POLICIES } from "@/app/cachePolicies";
import { createGraphQLServiceBuilder } from "@/lib/arkitekt/builders/graphQlServiceBuidler";
import lokResult from "./api/fragments";

/**
 * Lok is the session's own service (the "self" service every profile signs
 * in to), not one of the configured modules, so it has a builder but no
 * fakts requirement of its own.
 */
export const selfService = createGraphQLServiceBuilder(lokResult.possibleTypes, {
  typePolicies: LOK_TYPE_POLICIES,
});
