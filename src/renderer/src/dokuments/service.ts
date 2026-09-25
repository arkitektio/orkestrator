import { createGraphQLServiceBuilder } from "@/core/connection/arkitekt/builders/graphQlServiceBuidler";
import dokumentsResult from "./api/fragments";

/**
 * How the host reaches this module's service: the fakts requirement key it is
 * configured under and the client built for it. Code, so it lives beside the
 * manifest rather than in it; the host imports it through `app/modules`.
 */
export const service = {
  key: "dokuments",
  service: "live.arkitekt.dokuments",
  optional: true,
  builder: createGraphQLServiceBuilder(dokumentsResult.possibleTypes),
} as const;
