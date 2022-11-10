import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useState } from "react";
import { createPortClient } from "./client";
import { PortContext } from "./PortContext";
import { PortConfig } from "./types";

export type PortProps = {
  children: React.ReactNode;
};

export const PortProvider: React.FC<PortProps> = ({ children }) => {
  const [client, setClient] = useState<
    ApolloClient<NormalizedCacheObject> | undefined
  >();
  const [config, setConfig] = useState<PortConfig>();

  const configure = (config: PortConfig) => {
    setConfig(config);
    setClient(createPortClient(config));
  };

  return (
    <PortContext.Provider
      value={{
        client: client,
        configure: configure,
        config: config,
      }}
    >
      {children}
    </PortContext.Provider>
  );
};
