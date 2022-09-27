import { ApolloClient, NormalizedCacheObject, useQuery } from "@apollo/client";
import React, { useContext } from "react";

export type S3Config = {
  endpoint_url: string;
  access_key: string;
  secret_key: string;
  secure: boolean;
};

export type MikroConfig = {
  endpoint_url: string;
  ws_endpoint_url: string;
  healthz: string;
  secure: boolean;
  datalayer: S3Config;
};

export type MikroContextType = {
  client?: ApolloClient<NormalizedCacheObject>;
  s3resolve: (path?: string | null) => string;
  config?: MikroConfig;
};

export const MikroContext = React.createContext<MikroContextType>({
  s3resolve: () => "fallback",
});

export const useMikro = () => useContext(MikroContext);

export const useMikroQuery = (query: any) => {
  const { client } = useMikro();
  return useQuery(query, { client: client });
};

export function withMikro<T extends (options: any) => any>(func: T): T {
  const Wrapped = (nana: any) => {
    const { client } = useMikro();
    return func({ ...nana, client: client });
  };
  return Wrapped as T;
}
