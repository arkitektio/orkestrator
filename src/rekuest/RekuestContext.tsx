import React, { useContext } from "react";
import { RekuestClient, RekuestConfig } from "./types";
import { useQuery } from "@apollo/client";

export type RekuestContextType = {
  client?: RekuestClient;
  configure: (config?: RekuestConfig) => void;
  config?: RekuestConfig;
};

export const RekuestContext = React.createContext<RekuestContextType>({
  configure: () => {
    throw Error("No Provider in context not configured");
  },
});

export const useRekuest = () => useContext(RekuestContext);

export const useRekuestQuery = (query: any) => {
  const { client } = useRekuest();
  return useQuery(query, { client: client });
};

export function withRekuest<T extends (options: any) => any>(func: T): T {
  const Wrapped = (nana: any) => {
    const { client } = useRekuest();
    return func({ ...nana, client: client });
  };
  return Wrapped as T;
}
