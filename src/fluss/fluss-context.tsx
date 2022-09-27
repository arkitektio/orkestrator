import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useContext } from "react";

export type FlussContextType = {
  client?: ApolloClient<NormalizedCacheObject>;
  s3resolve: (path?: string | null) => string;
};

export const FlussContext = React.createContext<FlussContextType>({
  s3resolve: () => "fallback",
});

export const useFluss = () => useContext(FlussContext);
