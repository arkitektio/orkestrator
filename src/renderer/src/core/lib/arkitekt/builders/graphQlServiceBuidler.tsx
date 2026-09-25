import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  TypePolicies,
  createHttpLink,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { aliasToHttpPath, aliasToWsPath } from "../alias/helpers";
import { createAuthRetryLink, isSubscriptionQuery } from "../runtime/authRetryLink";
import { Service, ServiceBuilder } from "../types";
import { buildGraphQlWard } from "../ward";

export type GraphQLServiceBuilderOptions = {
  describe?: boolean;
  /**
   * Apollo `typePolicies` for this service's cache. Above all the offset
   * pagination policies for root list fields
   * (`lib/arkitekt/builders/cachePolicies.ts`, per-service maps in
   * `app/cachePolicies.ts`) — without them every page and every search
   * prefix becomes a permanent, separate `ROOT_QUERY` entry.
   */
  typePolicies?: TypePolicies;
};

export const createGraphQLServiceBuilder =
  (possibleTypes: any, builderOptions?: GraphQLServiceBuilderOptions): ServiceBuilder<Service<ApolloClient<any>>> =>
    (options) => {
      const { alias, getToken } = options;

      const httpLink = createHttpLink({
        uri: aliasToHttpPath(alias, "graphql"),
      });

      const queryLink = setContext(async (_, previousContext) => {
        const token = await getToken();

        return {
          headers: {
            ...previousContext.headers,
            authorization: token ? `Bearer ${token.access_token}` : "",
          },
        };
      }).concat(httpLink);

      const wsClient = createClient({
        url: aliasToWsPath(alias, "graphql"),
        connectionParams: async () => {
          // Re-evaluated on every (re)connect, so a socket that comes back for
          // any reason authenticates with a current token.
          const token = await getToken();
          return {
            token: token.access_token,
          };
        },
      });

      const wslink = new GraphQLWsLink(wsClient);

      const splitLink = split(
        ({ query }) => isSubscriptionQuery(query),
        wslink,
        queryLink as unknown as ApolloLink
      );

      const authRetryLink = createAuthRetryLink({
        getToken,
        onReauthenticateSocket: () => {
          // A socket carries the token it was opened with: the server reads
          // `connection_params` per operation, so every NEW subscription on a
          // stale socket fails while the running ones keep streaming.
          // Refreshing the token alone changes nothing — `connectionParams` is
          // only re-evaluated on a new socket, so the socket has to go.
          // `terminate` (not `dispose`) is the one that reconnects: it is
          // explicitly "not considered fatal and a connection retry will occur
          // as expected", whereas `dispose` is permanent teardown.
          try {
            wsClient.terminate();
          } catch (e) {
            console.warn("[arkitekt] failed to terminate ws client for re-auth:", e);
          }
        },
      });

      const client = new ApolloClient({
        link: authRetryLink.concat(splitLink),
        cache: new InMemoryCache({
          possibleTypes,
          typePolicies: builderOptions?.typePolicies,
        }),
        devtools: { enabled: import.meta.env.DEV },
      });

      const ward = buildGraphQlWard(client, { describe: builderOptions?.describe });

      return {
        type: "apollo",
        client: client,
        ward: ward,
        alias: alias,
        clearCache: async () => {
          await client.clearStore();
          await client.resetStore();
        },
        dispose: () => {
          // Stop the Apollo client (cancels in-flight queries, prevents new ones)
          // and dispose the underlying graphql-ws client so its WebSocket is
          // closed instead of being orphaned when this service is superseded.
          try {
            client.stop();
          } catch (e) {
            console.warn("Failed to stop Apollo client during dispose:", e);
          }
          try {
            wsClient.dispose();
          } catch (e) {
            console.warn("Failed to dispose graphql-ws client:", e);
          }
        },
      }
    };
