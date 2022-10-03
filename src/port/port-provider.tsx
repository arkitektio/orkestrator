import { ApolloClient, gql, NormalizedCacheObject } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { useFakts } from "../fakts";
import { useHerre } from "../herre";
import { createPortClient } from "./port-client";
import { PortContext } from "./port-context";

export type PortProviderProps = {
  register?: boolean;
  children: React.ReactNode;
};

export const PortProvider: React.FC<PortProviderProps> = ({
  register = true,
  children,
}) => {
  const [client, setClient] = useState<
    ApolloClient<NormalizedCacheObject> | undefined
  >();
  const { token } = useHerre();
  const { fakts } = useFakts();

  useEffect(() => {
    if (fakts && token && fakts.port) {
      var client = createPortClient(fakts.mikro, token);
      setClient(client);

      const runFunc = (options: { query: string; variables: any }) => {
        let document = gql(options.query);
        return client
          .query({
            query: document,
            variables: options.variables,
          })
          .then((result: any) => result.data);
      };
    }
  }, [token, fakts, register]);

  return (
    <PortContext.Provider
      value={{
        client: client,
      }}
    >
      {children}
    </PortContext.Provider>
  );
};
