import { emitSocketReconnect } from "@/core/connection/graphql/reconnects";
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  TypePolicies,
  createHttpLink,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { recordRequest } from "@/core/diagnostics/recorder";
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

/** The service a request went to, as a report names it: "mikro", from ".../mikro/graphql". */
const serviceLabel = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.pathname.split("/").filter((part) => part && part !== "graphql")[0] ?? url.host;
  } catch {
    return "unknown";
  }
};

export const createGraphQLServiceBuilder =
  (possibleTypes: any, builderOptions?: GraphQLServiceBuilderOptions): ServiceBuilder<Service<ApolloClient<any>>> =>
    (options) => {
      const { alias, getToken, onNetworkError } = options;

      const uri = aliasToHttpPath(alias, "graphql");
      const httpLink = createHttpLink({ uri });

      const queryLink = setContext(async (_, previousContext) => {
        const token = await getToken();

        return {
          headers: {
            ...previousContext.headers,
            authorization: token ? `Bearer ${token.access_token}` : "",
          },
        };
      }).concat(httpLink);

      // Set once the Apollo client exists (it is built on top of this socket).
      let onSocketBack: (() => void) | undefined;

      const wsClient = createClient({
        url: aliasToWsPath(alias, "graphql"),
        on: {
          // `wasRetry`: this socket replaces one that dropped. Its subscriptions
          // are subscribed again, but nothing published in between is resent.
          connected: (_socket, _payload, wasRetry) => {
            if (wasRetry) onSocketBack?.();
          },
        },
        // The socket keeps trying for as long as the client lives. Giving up
        // after five attempts (the library's default) left every subscription
        // dead for good after half a minute without a network; whether this
        // ADDRESS is dead is the connection's call, and it disposes the
        // client when it is. Fatal close codes (4401 and friends) still end it.
        retryAttempts: Infinity,
        shouldRetry: () => true,
        retryWait: (retries) =>
          new Promise((resolve) => setTimeout(resolve, Math.min(30_000, 1_000 * 2 ** retries) + Math.random() * 1_000)),
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

      // A request that never got an answer — not one answered with an error,
      // not one this app cancelled — says something about the address, so the
      // connection hears of it (`controller/supervisor.ts`).
      const reachLink = onError(({ networkError, operation }) => {
        if (!networkError || isSubscriptionQuery(operation.query)) return;
        if ("statusCode" in networkError || networkError.name === "AbortError") return;
        onNetworkError?.();
      });

      // What failed, for a bug report (`core/diagnostics`): the operation and
      // its variables, never the answer. Below the auth retry, so a request
      // that only needed a fresh token is not written down as a failure.
      const service = serviceLabel(uri);
      const recordLink = onError(({ networkError, graphQLErrors, operation }) => {
        if (networkError?.name === "AbortError") return;
        const definition = getMainDefinition(operation.query);
        const messages = [
          ...(graphQLErrors ?? []).map((error) => error.message),
          ...(networkError ? [networkError.message] : []),
        ];
        if (messages.length === 0) return;
        recordRequest({
          service,
          operation: operation.operationName || "anonymous",
          kind: "operation" in definition ? definition.operation : "query",
          variables: operation.variables,
          status:
            networkError && "statusCode" in networkError && typeof networkError.statusCode === "number"
              ? networkError.statusCode
              : null,
          message: messages.join("\n"),
        });
      });

      const client = new ApolloClient({
        link: authRetryLink.concat(reachLink).concat(recordLink).concat(splitLink),
        cache: new InMemoryCache({
          possibleTypes,
          typePolicies: builderOptions?.typePolicies,
        }),
        devtools: { enabled: import.meta.env.DEV },
      });

      onSocketBack = () => {
        // What the subscriptions would have kept current is read again; a module
        // with state of its own beside the cache hears of it too.
        client
          .refetchQueries({ include: "active" })
          .catch((e) => console.warn("[arkitekt] refetch after a socket reconnect failed:", e));
        emitSocketReconnect(client);
      };

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
