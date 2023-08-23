import { useQuery } from "@apollo/client";
import React, { useContext } from "react";
import { MikroClient, MikroConfig } from "./types";

export type MikroContextType = {
  client?: MikroClient;
  configure: (config: MikroConfig | undefined) => void;
  config?: MikroConfig;
};

export const MikroContext = React.createContext<MikroContextType>({
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
    if (!client) throw Error("No MikroClient in context");

    return func({ ...nana, client: client });
  };
  return Wrapped as T;
}
