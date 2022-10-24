import { MikroClient, MikroConfig } from "./types";
import React, { useContext } from "react";
import { useQuery } from "@apollo/client";

export type MikroContextType = {
  client?: MikroClient;
  configure: (config: MikroConfig) => void;
  s3resolve: (path?: string | null) => string;
  config?: MikroConfig;
};

export const MikroContext = React.createContext<MikroContextType>({
  s3resolve: () => {
    throw Error("No Provider in context not configured");
  },
  configure: () => {
    throw Error("No Provider in context not configured");
  },
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
