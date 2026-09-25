import { KRAPH_TYPE_POLICIES } from "@/core/app/cachePolicies";
import { createGraphQLServiceBuilder } from "@/core/lib/arkitekt/builders/graphQlServiceBuidler";
import kraphResult from "./api/fragments";

/**
 * How the host reaches this module's service: the fakts requirement key it is
 * configured under and the client built for it. Code, so it lives beside the
 * manifest rather than in it; the host imports it through `app/modules`.
 */
export const service = {
  key: "kraph",
  service: "live.arkitekt.kraph",
  optional: true,
  wardKey: "kraph",
  builder: createGraphQLServiceBuilder(kraphResult.possibleTypes, { typePolicies: KRAPH_TYPE_POLICIES }),
} as const;
