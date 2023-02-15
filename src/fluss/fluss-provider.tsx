import { ApolloClient, gql, NormalizedCacheObject } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "herre";
import { createFlussClient } from "./fluss-client";
import { FlussContext } from "./fluss-context";
import { FlussConfig } from "./fluss-types";
import { create } from "domain";

export type FlussProps = {
  register?: boolean;
  children?: React.ReactNode;
};

export const FlussProvider: React.FC<FlussProps> = ({
  register = true,
  children,
}) => {
  const [client, setClient] = useState<
    ApolloClient<NormalizedCacheObject> | undefined
  >();
  const [config, setConfig] = useState<FlussConfig>();

  const configure = (config?: FlussConfig) => {
    setConfig(config);
    if (!config) {
      setClient(undefined);
      return;
    }

    setClient(createFlussClient(config));
  };

  return (
    <FlussContext.Provider
      value={{
        client: client,
        configure: configure,
      }}
    >
      {children}
    </FlussContext.Provider>
  );
};
