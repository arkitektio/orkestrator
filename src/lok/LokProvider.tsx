import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useState } from "react";
import { LokContext } from "./LokContext";
import { createLokClient } from "./client";
import { LokConfig } from "./types";

export type LokProviderProps = {
  register?: boolean;
  children: React.ReactNode;
};

export const LokProvider: React.FC<LokProviderProps> = ({ children }) => {
  const [client, setClient] = useState<
    ApolloClient<NormalizedCacheObject> | undefined
  >();
  const [config, setConfig] = useState<LokConfig>();

  const configure = (config?: LokConfig) => {
    setConfig(config);
    if (!config) {
      setClient(undefined);
      return;
    }

    setClient(createLokClient(config));
  };

  return (
    <LokContext.Provider
      value={{
        config: config,
        client: client,
        configure: configure,
      }}
    >
      {children}
    </LokContext.Provider>
  );
};
