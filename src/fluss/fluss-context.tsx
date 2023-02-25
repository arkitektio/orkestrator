import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useContext } from "react";
import { FlussConfig } from "./fluss-types";

export type FlussContextType = {
  client?: ApolloClient<NormalizedCacheObject>;
  configure: (config?: FlussConfig) => void;
  config?: FlussConfig;
};

export const FlussContext = React.createContext<FlussContextType>({
  configure: () => {
    throw Error("No Provider in context not configured");
  },
});

export const useFluss = () => useContext(FlussContext);
