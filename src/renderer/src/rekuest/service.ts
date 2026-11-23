import { REKUEST_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import { createGraphQLServiceBuilder } from "@/core/connection/arkitekt/builders/graphQlServiceBuidler";
import { aliasToWsPath } from "@/core/connection/arkitekt/alias/helpers";
import type { Service, ServiceBuilder } from "@/core/connection/arkitekt/types";
import type { ApolloClient } from "@apollo/client";
import rekuestResult from "./api/fragments";
import { RekuestSession } from "./session/client";

/** rekuest's service: its Apollo client, and beside it the window's caller session on takt. */
export type RekuestService = Service<ApolloClient<any>> & { session: RekuestSession };

const graphql = createGraphQLServiceBuilder(rekuestResult.possibleTypes, {
  describe: true,
  typePolicies: REKUEST_TYPE_POLICIES,
});

/**
 * The GraphQL client as every module has one, and the caller session
 * (`rekuest/session`): one socket per window to takt, over which tasks and
 * states are followed and calls made. It is the only live path: a hub whose
 * gateway does not route `/rekuest/session` to takt has no live updates.
 */
const builder: ServiceBuilder<RekuestService> = (options) => {
  const service = graphql(options);
  const session = new RekuestSession({
    url: aliasToWsPath(options.alias, "session"),
    getToken: async () => (await options.getToken()).access_token,
    clientInfo: {
      app: "orkestrator",
      window: typeof window !== "undefined" ? window.name || "main" : "main",
    },
  });
  return {
    ...service,
    session,
    dispose: () => {
      session.dispose();
      service.dispose?.();
    },
  };
};

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
  builder,
} as const;
