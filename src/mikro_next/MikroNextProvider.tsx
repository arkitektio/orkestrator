import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useState } from "react";
import { MikroNextContext } from "./MikroNextContext";
import { createMikroNextClient } from "./client";
import { MikroConfig } from "./types";

export type MikroProps = {
  children: React.ReactNode;
};

export type ConfigState = {
  config?: MikroConfig;
  client?: ApolloClient<NormalizedCacheObject>;
};

export const MikroNextProvider: React.FC<MikroProps> = ({ children }) => {
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

    setConfig({ config: config, client: createMikroNextClient(config) });
  };

  return (
    <MikroNextContext.Provider
      value={{
        configure: configure,
        ...config,
      }}
    >
      {children}
    </MikroNextContext.Provider>
  );
};
