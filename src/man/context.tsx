import { ApolloClient, NormalizedCacheObject, useQuery } from "@apollo/client";
import React, { useContext } from "react";
import { Man } from "./types";

export type ManContextType = {
  client?: ApolloClient<NormalizedCacheObject>;
  config?: Man;
};

export const ManContext = React.createContext<ManContextType>({
  config: {} as Man,
});

export const useMan = () => useContext(ManContext);

export const useManQuery = (query: any) => {
  const { client } = useMan();
  return useQuery(query, { client: client });
};

export function withMan<T extends (options: any) => any>(func: T): T {
  const Wrapped = (nana: any) => {
    const { client } = useMan();
    return func({ ...nana, client: client });
  };
  return Wrapped as T;
}
