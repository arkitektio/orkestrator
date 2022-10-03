import { ApolloClient, gql, NormalizedCacheObject } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { useFakts } from "../fakts";
import { useHerre } from "../herre";
import { createMikroClient } from "./client";
import { MikroContext } from "./mikro-types";

export type MikroProps = {
  register?: boolean;
  children: React.ReactNode;
};

export const MikroProvider: React.FC<MikroProps> = ({
  register = true,
  children,
}) => {
  const [client, setClient] = useState<
    ApolloClient<NormalizedCacheObject> | undefined
  >();
  const { token } = useHerre();
  const { fakts } = useFakts();

  useEffect(() => {
    if (fakts && token && fakts.mikro) {
      var client = createMikroClient(fakts.mikro, token);
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

  const s3resolve = (path?: string | null) => {
    if (fakts.mikro && path) {
      return `${fakts.mikro.datalayer?.endpoint_url}${path}`;
    }
    return "fallback";
  };

  return (
    <MikroContext.Provider
      value={{
        client: client,
        s3resolve: s3resolve,
        config: fakts.mikro,
      }}
    >
      {children}
    </MikroContext.Provider>
  );
};
