import { useFakts } from "@jhnnsrs/fakts";
import React, { useEffect } from "react";
import { useDatalayer } from "@jhnnsrs/datalayer";
import result from "../mikro/api/fragments";
import {
  PresignDocument,
  PresignMutation,
  RequestDocument,
  RequestQuery,
} from "../mikro/api/graphql";
import { useMikro } from "../mikro/MikroContext";

export const DatalayerAutoConfigure: React.FC<{}> = (props) => {
  const { client } = useMikro();
  const { fakts } = useFakts();
  const { configure } = useDatalayer();

  useEffect(() => {
    if (client) {
      configure({
        endpointUrl: fakts.minio.endpoint_url,
        credentialsRetriever: async () => {
          let x = await client.query<RequestQuery>({
            query: RequestDocument,
            variables: {},
          });
          if (!x.data.request) {
            throw Error("No request found");
          }
          return x.data.request;
        },
        presign: async (key: string) => {
          let x = await client.mutate<PresignMutation>({
            mutation: PresignDocument,
            variables: {
              file: key,
            },
          });
          if (!x.data?.presign) {
            throw Error("No request found");
          }
          return x.data.presign;
        },
      });
    }
  }, [client]);

  return <> </>;
};
