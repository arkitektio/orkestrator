import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";
import React, { useEffect } from "react";
import { useMikro } from "../mikro/MikroContext";
import result from "../mikro/api/fragments";

export const MikroAutoConfigure: React.FC<{}> = (props) => {
  const { configure } = useMikro();
  const { token } = useHerre();
  const { fakts } = useFakts();

  useEffect(() => {
    if (token && fakts.mikro) {
      configure({
        secure: fakts.mikro.secure,
        datalayer: fakts.mikro.datalayer,
        wsEndpointUrl: fakts.mikro.ws_endpoint_url,
        endpointUrl: fakts.mikro.endpoint_url,
        possibleTypes: result.possibleTypes,
        retrieveToken: () => token,
      });
    } else {
      configure(undefined);
    }
  }, [token, fakts]);

  return <> </>;
};
