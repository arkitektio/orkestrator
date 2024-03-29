import { ApolloClient, InMemoryCache, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { WebSocketLink } from "@apollo/client/link/ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { createUploadLink } from "apollo-upload-client";
import result from "./api/fragments";
import { FlussConfig } from "./fluss-types";

export const createFlussClient = (config: FlussConfig) => {
  let token = config.retrieveToken();

  const httpLink = createUploadLink({
    uri: config.endpointUrl,
    headers: {
      authorization: token ? `Bearer ${token}` : "",
    },
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
    uri: `${config.wsEndpointUrl}?token=${token}`,
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
