import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useContext } from "react";

export type PortContextType = {
  client?: ApolloClient<NormalizedCacheObject>;
};

export const PortContext = React.createContext<PortContextType>({});

export const usePort = () => useContext(PortContext);
