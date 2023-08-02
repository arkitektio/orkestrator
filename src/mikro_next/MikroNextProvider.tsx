import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useState } from "react";
import { MikroNextContext } from "./MikroNextContext";
import { createMikroNextClient } from "./client";
import { MikroConfig } from "./types";

export type MikroProps = {
  children: React.ReactNode;
};

export const MikroNextProvider: React.FC<MikroProps> = ({ children }) => {
  const [client, setClient] = useState<
    ApolloClient<NormalizedCacheObject> | undefined
  >();
  const [config, setConfig] = useState<MikroConfig>();

  const configure = (config: MikroConfig) => {
    setConfig(config);
    setClient(createMikroNextClient(config));
  };

  return (
    <MikroNextContext.Provider
      value={{
        client: client,
        configure: configure,
        config: config,
      }}
    >
      {children}
    </MikroNextContext.Provider>
  );
};
