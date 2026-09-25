import { createGraphQLServiceBuilder } from "@/lib/arkitekt/builders/graphQlServiceBuidler";
import omeroArkResult from "./api/fragments";

/**
 * How the host reaches this module's service: the fakts requirement key it is
 * configured under and the client built for it. Code, so it lives beside the
 * manifest rather than in it; the host imports it through `app/modules`.
 */
export const service = {
  key: "omero_ark",
  service: "live.arkitekt.omero_ark",
  optional: true,
  wardKey: "omero_ark",
  builder: createGraphQLServiceBuilder(omeroArkResult.possibleTypes),
} as const;
