import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { useFakts } from "../fakts/fakts-config";
import { useHerre } from "../herre/herre-context";
import { createArkitektClient } from "./arkitekt-client";
import { ArkitektContext } from "./arkitekt-context";

export type ArkitektProps = {
  children: React.ReactNode;
};

export const ArkitektProvider: React.FC<ArkitektProps> = ({ children }) => {
  const { fakts } = useFakts();

  const [client, setClient] = useState<
    ApolloClient<NormalizedCacheObject> | undefined
  >();
  const { token } = useHerre();

  useEffect(() => {
    if (token) {
      var client = createArkitektClient(fakts.arkitekt, token);
      setClient(client);
    }
  }, [token, fakts]);

  return (
    <ArkitektContext.Provider
      value={{
        client: client,
      }}
    >
      {children}
    </ArkitektContext.Provider>
  );
};
