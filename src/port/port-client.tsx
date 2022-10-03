import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { Token } from "herre";
import result from "./api/fragments";
import { Port } from "./port-types";

export const createPortClient = (config: Port, token: Token) => {
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

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({ possibleTypes: result.possibleTypes }),
  });
};
