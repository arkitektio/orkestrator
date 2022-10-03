import { ApolloClient, InMemoryCache } from "@apollo/client";
import { createUploadLink } from "apollo-upload-client";
import { Token } from "herre";
import result from "./api/fragments";
import { Man } from "./types";

export const createManClient = (config: Man, token: Token) => {
  const httpLink = createUploadLink({
    uri: config.endpoint_url,
    headers: {
      authorization: token ? `Bearer ${token}` : "",
    },
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache({ possibleTypes: result.possibleTypes }),
  });
};
