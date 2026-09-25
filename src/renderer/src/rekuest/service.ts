import { REKUEST_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import { createGraphQLServiceBuilder } from "@/core/lib/arkitekt/builders/graphQlServiceBuidler";
import rekuestResult from "./api/fragments";

/**
 * How the host reaches this module's service: the fakts requirement key it is
 * configured under and the client built for it. Code, so it lives beside the
 * manifest rather than in it; the host imports it through `app/modules`.
 */
export const service = {
  key: "rekuest",
  service: "live.arkitekt.rekuest",
  optional: true,
  wardKey: "rekuest",
  describe: true,
  builder: createGraphQLServiceBuilder(rekuestResult.possibleTypes, { describe: true, typePolicies: REKUEST_TYPE_POLICIES }),
} as const;
