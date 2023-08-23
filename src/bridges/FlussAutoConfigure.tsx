import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";
import React, { useEffect } from "react";
import { useFluss } from "../fluss/fluss-context";
import result from "../port/api/fragments";

export const FlussAutoConfigure: React.FC<{}> = (props) => {
  const { configure } = useFluss();
  const { token } = useHerre();
  const { fakts } = useFakts();

  useEffect(() => {
    if (token && fakts.fluss) {
      configure({
        secure: fakts.fluss.secure,
        wsEndpointUrl: fakts.fluss.ws_endpoint_url,
        endpointUrl: fakts.fluss.endpoint_url,
        possibleTypes: result.possibleTypes,
        retrieveToken: () => token,
      });
    }
  }, [token, fakts]);

  return <> </>;
};
