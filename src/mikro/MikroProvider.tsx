import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useState } from "react";
import { MikroContext } from "./MikroContext";
import { createMikroClient } from "./client";
import { MikroConfig } from "./types";

export type MikroProps = {
  children: React.ReactNode;
};

export type ConfigState = {
  config?: MikroConfig;
  client?: ApolloClient<NormalizedCacheObject>;
};

export const MikroProvider: React.FC<MikroProps> = ({ children }) => {
  const [config, setConfig] = useState<ConfigState>({
    config: undefined,
    client: undefined,
  });

  const configure = (config?: MikroConfig) => {
    if (!config) {
      setConfig({
        config: undefined,
        client: undefined,
      });
      return;
    }

    setConfig({ config: config, client: createMikroClient(config) });
  };

  return (
    <MikroContext.Provider
      value={{
        configure: configure,
        ...config,
      }}
    >
      {children}
    </MikroContext.Provider>
  );
};
