import React, { useContext } from "react";
import { RekuestClient } from "./types";
import { useQuery } from "@apollo/client";

export type RekuestContextType = {
  client?: RekuestClient;
};

export const RekuestContext = React.createContext<RekuestContextType>({});

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
