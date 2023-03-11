import React, { useEffect } from "react";
import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";
import { usePort } from "../port/PortContext";
import result from "../port/api/fragments";

export const PortAutoConfigure: React.FC<{}> = (props) => {
  const { configure } = usePort();
  const { token } = useHerre();
  const { fakts } = useFakts();

  useEffect(() => {
    if (token && fakts.port) {
      configure({
        secure: fakts.port.secure,
        wsEndpointUrl: fakts.port.ws_endpoint_url,
        endpointUrl: fakts.port.endpoint_url,
        possibleTypes: result.possibleTypes,
        retrieveToken: () => token,
      });
    }
  }, [token, fakts]);

  return <> </>;
};
