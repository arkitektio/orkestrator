import { BANK_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import { createGraphQLServiceBuilder } from "@/core/connection/arkitekt/builders/graphQlServiceBuidler";
import bankResult from "./api/fragments";

/**
 * How the host reaches this module's service: the fakts requirement key it is
 * configured under and the client built for it. Code, so it lives beside the
 * manifest rather than in it; the host imports it through `app/modules`.
 */
export const service = {
  key: "bank",
  service: "live.arkitekt.bank",
  optional: true,
  builder: createGraphQLServiceBuilder(bankResult.possibleTypes, { typePolicies: BANK_TYPE_POLICIES }),
} as const;
