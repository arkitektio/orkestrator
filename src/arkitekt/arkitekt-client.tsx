import {
  ApolloClient,
  createHttpLink,
  InMemoryCache,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { WebSocketLink } from "@apollo/client/link/ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { Token } from "../herre/types";
import result from "./api/fragments";
import { Arkitekt } from "./arkitekt-types";

export const createArkitektClient = (config: Arkitekt, token: Token) => {
  const httpLink = createHttpLink({
    uri: config.endpoint_url,
  });

  const authLink = setContext((_, { headers }) => {
    // return the headers to the context so httpLink can read them
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      },
    };
  });

  const queryLink = authLink.concat(httpLink);

  const wsLink = new WebSocketLink({
    uri: `${config.ws_endpoint_url}?token=${token}`,
    options: {
      reconnect: true,
    },
  });

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      );
    },
    wsLink,
    queryLink
  );

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache({ possibleTypes: result.possibleTypes }),
  });
};
