import { useQuery } from "@apollo/client";
import React, { useContext } from "react";
import { MikroClient, MikroConfig } from "./types";

export type MikroContextType = {
  client?: MikroClient;
  configure: (config: MikroConfig | undefined) => void;
  config?: MikroConfig;
};

export const MikroNextContext = React.createContext<MikroContextType>({
  configure: () => {
    throw Error("No Provider in context not configured");
  },
});

export const useMikroNext = () => useContext(MikroNextContext);

export const useMikroNextQuery = (query: any) => {
  const { client } = useMikroNext();
  return useQuery(query, { client: client });
};

export function withMikroNext<T extends (options: any) => any>(func: T): T {
  const Wrapped = (nana: any) => {
    const { client } = useMikroNext();
    return func({ ...nana, client: client });
  };
  return Wrapped as T;
}
