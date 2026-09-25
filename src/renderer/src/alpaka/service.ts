import { ALPAKA_TYPE_POLICIES } from "@/app/cachePolicies";
import { createGraphQLServiceBuilder } from "@/lib/arkitekt/builders/graphQlServiceBuidler";
import alpakaResult from "./api/fragments";

/**
 * How the host reaches this module's service: the fakts requirement key it is
 * configured under and the client built for it. Code, so it lives beside the
 * manifest rather than in it; the host imports it through `app/modules`.
 */
export const service = {
  key: "alpaka",
  service: "live.arkitekt.alpaka",
  optional: true,
  wardKey: "alpaka",
  builder: createGraphQLServiceBuilder(alpakaResult.possibleTypes, { typePolicies: ALPAKA_TYPE_POLICIES }),
} as const;
