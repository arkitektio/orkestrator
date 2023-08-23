import { PossibleTypesMap } from "@apollo/client";

export type LokConfig = {
  endpointUrl: string;
  wsEndpointUrl: string;
  secure: boolean;
  healthz: string;
  retrieveToken: () => string;
  possibleTypes?: PossibleTypesMap;
};
