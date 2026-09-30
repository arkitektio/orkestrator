import { LOKATE_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import { createGraphQLServiceBuilder } from "@/core/connection/arkitekt/builders/graphQlServiceBuidler";
import lokateResult from "./api/fragments";

/**
 * How the host reaches this module's service: the fakts requirement key it is
 * configured under and the client built for it. Code, so it lives beside the
 * manifest rather than in it; the host imports it through `app/modules`.
 */
export const service = {
  key: "lokate",
  service: "live.arkitekt.lokate",
  optional: true,
  builder: createGraphQLServiceBuilder(lokateResult.possibleTypes, { typePolicies: LOKATE_TYPE_POLICIES }),
} as const;
