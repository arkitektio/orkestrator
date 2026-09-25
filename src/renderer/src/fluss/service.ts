import { FLUSS_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import { createGraphQLServiceBuilder } from "@/core/lib/arkitekt/builders/graphQlServiceBuidler";
import flussResult from "./api/fragments";

/**
 * How the host reaches this module's service: the fakts requirement key it is
 * configured under and the client built for it. Code, so it lives beside the
 * manifest rather than in it; the host imports it through `app/modules`.
 */
export const service = {
  key: "fluss",
  service: "live.arkitekt.fluss",
  optional: true,
  wardKey: "fluss",
  builder: createGraphQLServiceBuilder(flussResult.possibleTypes, { typePolicies: FLUSS_TYPE_POLICIES }),
} as const;
