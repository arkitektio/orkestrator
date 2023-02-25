import { ApolloClient, gql, NormalizedCacheObject } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "herre";
import { createManClient } from "./client";
import { ManContext } from "./context";
import { ManConfig } from "./types";

export type ManProviderProps = {
  register?: boolean;
  children: React.ReactNode;
};

export const ManProvider: React.FC<ManProviderProps> = ({
  register = true,
  children,
}) => {
  const [client, setClient] = useState<
    ApolloClient<NormalizedCacheObject> | undefined
  >();
  const [config, setConfig] = useState<ManConfig>();

  const configure = (config?: ManConfig) => {
    setConfig(config);
    if (!config) {
      setClient(undefined);
      return;
    }

    setClient(createManClient(config));
  };

  return (
    <ManContext.Provider
      value={{
        client: client,
        configure: configure,
      }}
    >
      {children}
    </ManContext.Provider>
  );
};
