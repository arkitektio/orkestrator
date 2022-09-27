import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useContext } from "react";

export type ArkitektContextType = {
  client?: ApolloClient<NormalizedCacheObject>;
};

export const ArkitektContext = React.createContext<ArkitektContextType>({});

export const useArkitekt = () => useContext(ArkitektContext);

export const NoArkitektContext = React.createContext<any>({});

export const useNoArkitekt = () => useContext(NoArkitektContext);
