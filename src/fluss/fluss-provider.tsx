import { ApolloClient, gql, NormalizedCacheObject } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "herre";
import { createFlussClient } from "./fluss-client";
import { FlussContext } from "./fluss-context";

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
  const { token } = useHerre();
  const { fakts } = useFakts();

  useEffect(() => {
    if (fakts && token && fakts.fluss) {
      var client = createFlussClient(fakts.fluss, token);
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
    if (fakts.fluss && path) {
      return `${fakts.fluss.datalayer?.endpoint_url}${path}`;
    }
    return "fallback";
  };

  return (
    <FlussContext.Provider
      value={{
        client: client,
        s3resolve,
      }}
    >
      {children}
    </FlussContext.Provider>
  );
};
