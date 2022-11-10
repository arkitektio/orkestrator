import {
  ApolloClient,
  NormalizedCacheObject,
  PossibleTypesMap,
} from "@apollo/client";

export type S3Config = {
  endpointUrl: string;
  accessKey: string;
  secretKey: string;
  secure: boolean;
};

export type PortConfig = {
  endpointUrl: string;
  wsEndpointUrl: string;
  secure: boolean;
  retrieveToken: () => string;
  possibleTypes?: PossibleTypesMap;
};

export type PortClient = ApolloClient<NormalizedCacheObject>;
