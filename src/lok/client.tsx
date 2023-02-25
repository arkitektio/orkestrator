import { ApolloClient, InMemoryCache } from "@apollo/client";
import { createUploadLink } from "apollo-upload-client";
import { ManConfig } from "./types";

export const createManClient = (config: ManConfig) => {
  let token = config.retrieveToken();

  const httpLink = createUploadLink({
    uri: config.endpointUrl,
    headers: {
      authorization: token ? `Bearer ${token}` : "",
    },
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache({ possibleTypes: config.possibleTypes }),
  });
};
