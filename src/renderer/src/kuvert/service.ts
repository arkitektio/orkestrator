import { KUVERT_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import { createGraphQLServiceBuilder } from "@/core/connection/arkitekt/builders/graphQlServiceBuidler";
import kuvertResult from "./api/fragments";

/**
 * How the host reaches this module's service: the fakts requirement key it is
 * configured under and the client built for it. Code, so it lives beside the
 * manifest rather than in it; the host imports it through `app/modules`.
 */
export const service = {
  key: "kuvert",
  service: "live.arkitekt.kuvert",
  optional: true,
  builder: createGraphQLServiceBuilder(kuvertResult.possibleTypes, { typePolicies: KUVERT_TYPE_POLICIES }),
} as const;
