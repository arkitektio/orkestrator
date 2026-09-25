import { LOVEKIT_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import { createGraphQLServiceBuilder } from "@/core/lib/arkitekt/builders/graphQlServiceBuidler";
import lovekitResult from "./api/fragments";

/**
 * How the host reaches this module's service: the fakts requirement key it is
 * configured under and the client built for it. Code, so it lives beside the
 * manifest rather than in it; the host imports it through `app/modules`.
 */
export const service = {
  key: "lovekit",
  service: "live.arkitekt.lovekit",
  optional: true,
  builder: createGraphQLServiceBuilder(lovekitResult.possibleTypes, { typePolicies: LOVEKIT_TYPE_POLICIES }),
} as const;
