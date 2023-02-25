import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "herre";
import { createRekuestClient } from "./client";
import { RekuestContext } from "./RekuestContext";
import { RekuestConfig } from "./types";

export type RekuestProviderProps = {
  children?: React.ReactNode;
};

export const RekuestProvider: React.FC<RekuestProviderProps> = ({
  children,
}) => {
  const [client, setClient] = useState<
    ApolloClient<NormalizedCacheObject> | undefined
  >();
  const [config, setConfig] = useState<RekuestConfig>();

  const configure = (config?: RekuestConfig) => {
    setConfig(config);
    if (!config) {
      setClient(undefined);
      return;
    }

    setClient(createRekuestClient(config));
  };

  return (
    <RekuestContext.Provider
      value={{
        configure: configure,
        client: client,
      }}
    >
      {children}
    </RekuestContext.Provider>
  );
};
