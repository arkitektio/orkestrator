import { ApolloClient, gql, NormalizedCacheObject } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { useFakts } from "../fakts/fakts-config";
import { useHerre } from "../herre/herre-context";
import { createManClient } from "./client";
import { ManContext } from "./context";

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
  const { token } = useHerre();
  const { fakts } = useFakts();

  useEffect(() => {
    if (fakts && token && fakts.herre) {
      var client = createManClient(fakts.herre, token);
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
    <ManContext.Provider
      value={{
        client: client,
      }}
    >
      {children}
    </ManContext.Provider>
  );
};
