import { ApolloClient, NormalizedCacheObject, useQuery } from "@apollo/client";
import React, { useContext } from "react";
import { ManConfig } from "./types";

export type LokContextType = {
  client?: ApolloClient<NormalizedCacheObject>;
  configure: (config?: ManConfig) => void;
  config?: ManConfig;
};

export const LokContext = React.createContext<LokContextType>({
  config: {} as ManConfig,
  configure: () => {
    throw Error("No Provider in context not configured");
  },
});

export const useLok = () => useContext(LokContext);

export const useLokQuery = (query: any) => {
  const { client } = useLok();
  return useQuery(query, { client: client });
};

export function withLok<T extends (options: any) => any>(func: T): T {
  const Wrapped = (nana: any) => {
    const { client } = useLok();
    return func({ ...nana, client: client });
  };
  return Wrapped as T;
}
