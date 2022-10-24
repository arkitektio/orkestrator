import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useState } from "react";
import { createMikroClient } from "./client";
import { MikroContext } from "./MikroContext";
import { MikroConfig } from "./types";

export type MikroProps = {
  children: React.ReactNode;
};

export const MikroProvider: React.FC<MikroProps> = ({ children }) => {
  const [client, setClient] = useState<
    ApolloClient<NormalizedCacheObject> | undefined
  >();
  const [config, setConfig] = useState<MikroConfig>();

  const configure = (config: MikroConfig) => {
    setConfig(config);
    setClient(createMikroClient(config));
  };

  const s3resolve = (path?: string | null) => {
    if (config) {
      return config.s3resolve(path);
    }
    return "fallback";
  };

  return (
    <MikroContext.Provider
      value={{
        client: client,
        s3resolve: s3resolve,
        configure: configure,
        config: config,
      }}
    >
      {children}
    </MikroContext.Provider>
  );
};
