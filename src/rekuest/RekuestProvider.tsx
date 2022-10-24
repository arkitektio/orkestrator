import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { useFakts } from "fakts";
import { useHerre } from "herre";
import { createRekuestClient } from "./client";
import { RekuestContext } from "./RekuestContext";

export type RekuestProviderProps = {
  children?: React.ReactNode;
};

export const RekuestProvider: React.FC<RekuestProviderProps> = ({
  children,
}) => {
  const { fakts } = useFakts();

  const [client, setClient] = useState<
    ApolloClient<NormalizedCacheObject> | undefined
  >();
  const { token } = useHerre();

  useEffect(() => {
    if (token) {
      var client = createRekuestClient(fakts.rekuest, token);
      setClient(client);
    }
  }, [token, fakts]);

  return (
    <RekuestContext.Provider
      value={{
        client: client,
      }}
    >
      {children}
    </RekuestContext.Provider>
  );
};
