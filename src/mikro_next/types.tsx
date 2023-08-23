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

export type MikroConfig = {
  endpointUrl: string;
  wsEndpointUrl: string;
  secure: boolean;
  datalayer: S3Config;
  retrieveToken: () => string;
  possibleTypes?: PossibleTypesMap;
};

export type MikroClient = ApolloClient<NormalizedCacheObject>;
