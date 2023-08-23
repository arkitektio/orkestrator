import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useState } from "react";
import { RekuestContext } from "./RekuestContext";
import { createRekuestClient } from "./client";
import { RekuestConfig } from "./types";

export type RekuestProviderProps = {
  children?: React.ReactNode;
};

export type ConfigState = {
  config?: RekuestConfig;
  client?: ApolloClient<NormalizedCacheObject>;
};

export const RekuestProvider: React.FC<RekuestProviderProps> = ({
  children,
}) => {
  const [config, setConfig] = useState<ConfigState>({
    config: undefined,
    client: undefined,
  });

  const configure = (config?: RekuestConfig) => {
    if (!config) {
      setConfig({
        config: undefined,
        client: undefined,
      });
      return;
    }

    setConfig({ config: config, client: createRekuestClient(config) });
  };

  return (
    <RekuestContext.Provider
      value={{
        configure: configure,
        ...config,
      }}
    >
      {children}
    </RekuestContext.Provider>
  );
};
